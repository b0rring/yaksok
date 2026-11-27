import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, Linked, Links, Role, User, apiGetPatient, apiGetSync, apiLinks, apiLogin, apiNewCode, apiPutPatient, apiPutSync, apiSignup } from './api';
import { syncNotifications } from './notify';
import { localSnap, setOnWrite, setRemote, writeLocalSnap } from './store';
import { Snap, createSync } from './sync';

// 로그인 상태와 "누구의 화면을 보고 있나".
// 로그인은 선택이다: 안 해도 약 관리는 기기 안에서 그대로 되고, 보호자 연동·커뮤니티 글쓰기에만 필요하다.
// 보호자는 연결된 환자를 골라 그 사람의 화면으로 전환할 수 있다(viewing). 전환하면 약 추가·수정·체크가 그 환자의 것으로 저장된다.
type Ctx = {
  user: User | null;
  token: string | null;
  ready: boolean;
  signup: (b: { login_id: string; name: string; role: Role; password: string; invite?: string }) => Promise<void>;
  login: (id: string, pw: string) => Promise<void>;
  logout: () => Promise<void>;
  links: Links;
  refreshLinks: () => Promise<void>;
  viewing: Linked | null;
  switchTo: (p: Linked | null) => Promise<void>; // null이면 내 화면으로
  version: number; // 화면에 보이는 약 기록이 바깥 이유(전환·상대의 수정)로 바뀌면 올라간다. 목록 화면은 이 값이 바뀌면 다시 읽는다
  newCode: () => Promise<void>;
};
const NO_LINKS: Links = { patients: [], guardians: [], incoming: [], outgoing: [] };
const AuthContext = createContext<Ctx | null>(null);
export const useAuth = () => useContext(AuthContext)!;

const KEY = 'auth';
const metaKey = (id: number) => `syncMeta:${id}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User; token: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [links, setLinks] = useState<Links>(NO_LINKS);
  const [viewing, setViewing] = useState<Linked | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const view = useRef<{ eng: ReturnType<typeof createSync>; timer: ReturnType<typeof setInterval> } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setState(JSON.parse(v)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const save = async (r: { token: string; user: User }) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(r));
    setState(r);
  };

  // 연결·요청 목록: 로그인 중에는 앱을 다시 열 때와 30초마다 새로 본다 (받은 요청이 홈에 뜨게)
  const refreshLinks = useCallback(async () => {
    if (!state) return setLinks(NO_LINKS);
    try {
      setLinks(await apiLinks(state.token));
    } catch {}
  }, [state]);
  useEffect(() => {
    refreshLinks();
    if (!state) return;
    const iv = setInterval(refreshLinks, 30_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshLinks());
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, [refreshLinks, state]);

  // 환자 계정: 기기의 복약 계획·기록·진료 기록을 서버와 맞춘다. 내가 고치면 1.5초 뒤 올리고, 보호자가 고친 것은 30초마다·앱을 열 때 받아 온다.
  useEffect(() => {
    if (!state || state.user.role !== 'patient') return setOnWrite(null);
    const { token, user } = state;
    const meta = {
      load: async () => {
        // 이 기기에 다른 환자 계정의 약이 남아 있으면 비운다 (계정이 바뀌어도 남의 약이 섞여 들어가지 않게)
        const owner = await AsyncStorage.getItem('syncOwner');
        await AsyncStorage.setItem('syncOwner', String(user.id));
        if (owner && owner !== String(user.id)) {
          await writeLocalSnap({ plans: [], logs: [], visits: [] });
          return { rev: null, dirty: false };
        }
        return JSON.parse((await AsyncStorage.getItem(metaKey(user.id))) ?? '{"rev":null,"dirty":false}');
      },
      save: (m: { rev: number | null; dirty: boolean }) => AsyncStorage.setItem(metaKey(user.id), JSON.stringify(m)),
    };
    const eng = createSync({
      get: () => apiGetSync(token),
      put: (s, b) => apiPutSync(token, s, b),
      read: localSnap as () => Promise<Snap>,
      write: writeLocalSnap,
      changed: () => {
        bump();
        syncNotifications().catch(() => {}); // 보호자가 약을 바꿨으면 알림도 맞춘다
      },
      meta,
    });
    setOnWrite(eng.touch);
    eng.tick();
    const iv = setInterval(eng.tick, 30_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && eng.tick());
    return () => {
      eng.stop();
      clearInterval(iv);
      sub.remove();
      setOnWrite(null);
    };
  }, [state, bump]);

  // 보호자: 환자 화면으로 전환 / 내 화면으로 돌아오기
  const endView = async () => {
    const v = view.current;
    if (!v) return;
    clearInterval(v.timer);
    await v.eng.flush();
    if (v.eng.pending()) {
      v.timer = setInterval(v.eng.tick, 15_000);
      throw new ApiError('아직 저장하지 못한 변경이 있어요. 인터넷을 확인하고 다시 눌러 주세요.');
    }
    v.eng.stop();
    setRemote(null);
    view.current = null;
  };
  const switchTo = async (p: Linked | null) => {
    if (!state) return;
    const { token } = state;
    if (p && viewing?.id === p.id) return;
    await endView();
    if (!p) {
      setViewing(null);
      bump();
      syncNotifications().catch(() => {});
      return;
    }
    const r = await apiGetPatient(token, p.id);
    const cache: Record<string, unknown> = { ...r.data };
    const eng = createSync({
      get: () => apiGetPatient(token, p.id),
      put: (s, b) => apiPutPatient(token, p.id, s, b),
      read: async () => ({ plans: cache.plans, logs: cache.logs, visits: cache.visits }) as Snap,
      write: async (s) => void Object.assign(cache, s),
      changed: bump,
    });
    eng.seed(r.rev);
    setRemote({ cache, touch: eng.touch });
    view.current = { eng, timer: setInterval(eng.tick, 15_000) }; // 환자가 체크한 것도 15초 안에 보인다
    setViewing({ id: p.id, name: r.name ?? p.name });
    bump();
  };

  const value: Ctx = {
    user: state?.user ?? null,
    token: state?.token ?? null,
    ready,
    signup: async (b) => save(await apiSignup(b)),
    login: async (id, pw) => save(await apiLogin(id, pw)),
    logout: async () => {
      const v = view.current;
      if (v) {
        clearInterval(v.timer);
        v.eng.stop();
        setRemote(null);
        view.current = null;
      }
      setViewing(null);
      await AsyncStorage.removeItem(KEY);
      setState(null);
      bump();
    },
    links,
    refreshLinks,
    viewing,
    switchTo,
    version,
    newCode: async () => {
      if (!state) return;
      const { code } = await apiNewCode(state.token);
      await save({ token: state.token, user: { ...state.user, code } });
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
