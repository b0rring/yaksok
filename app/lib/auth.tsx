import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Role, User, apiLogin, apiSignup, apiSync } from './api';
import { getLogs, getPlans, getVisits, setOnWrite } from './store';

// 로그인 상태. 로그인은 선택이다: 안 해도 약 관리는 기기 안에서 그대로 되고, 보호자 연동·커뮤니티 글쓰기에만 필요하다.
type Ctx = {
  user: User | null;
  token: string | null;
  ready: boolean;
  signup: (b: { login_id: string; name: string; role: Role; password: string; invite?: string }) => Promise<void>;
  login: (id: string, pw: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<Ctx | null>(null);
export const useAuth = () => useContext(AuthContext)!;

const KEY = 'auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: User; token: string } | null>(null);
  const [ready, setReady] = useState(false);

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

  // 환자 계정이면 기기의 복약 계획·기록·진료 기록을 서버에 올린다 (연결된 보호자가 읽음). 저장할 때마다(1.5초 모아서) + 앱을 다시 열 때 + 1분마다.
  const push = useCallback(async () => {
    if (!state || state.user.role !== 'patient') return;
    try {
      await apiSync(state.token, { plans: await getPlans(), logs: await getLogs(), visits: await getVisits() });
    } catch {} // 서버에 못 올려도 앱은 그대로 쓴다. 다음 기회에 다시 올린다.
  }, [state]);

  useEffect(() => {
    if (!state || state.user.role !== 'patient') return setOnWrite(null);
    let t: ReturnType<typeof setTimeout> | undefined;
    setOnWrite(() => {
      clearTimeout(t);
      t = setTimeout(push, 1500);
    });
    push();
    const iv = setInterval(push, 60_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && push());
    return () => {
      clearTimeout(t);
      clearInterval(iv);
      sub.remove();
      setOnWrite(null);
    };
  }, [state, push]);

  const value: Ctx = {
    user: state?.user ?? null,
    token: state?.token ?? null,
    ready,
    signup: async (b) => save(await apiSignup(b)),
    login: async (id, pw) => save(await apiLogin(id, pw)),
    logout: async () => {
      await AsyncStorage.removeItem(KEY);
      setState(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
