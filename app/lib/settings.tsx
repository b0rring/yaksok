import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { loadTimes, setClock } from './store';

// 사용자 설정: 글씨 크기(배율), 읽는 속도. 약 먹는 시간은 store.ts(SLOTS)에 있다.
export const SCALES = [
  { id: 1, label: '보통' },
  { id: 1.15, label: '크게' },
  { id: 1.3, label: '아주 크게' },
] as const;
export const CLOCKS = [
  { id: 12, label: '12시간제' },
  { id: 24, label: '24시간제' },
] as const;
export const RATES = [
  { id: 0.85, label: '천천히' },
  { id: 1, label: '보통' },
] as const;

type Settings = { scale: number; rate: number; clock: number };
const DEFAULT: Settings = { scale: 1, rate: 0.85, clock: 12 };
const KEY = 'settings';

const Ctx = createContext<Settings & { set: (s: Partial<Settings>) => void }>({ ...DEFAULT, set: () => {} });
export const useSettings = () => useContext(Ctx);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULT);
  const [ready, setReady] = useState(false);

  // 시작할 때 저장된 설정과 약 먹는 시간을 불러온 뒤에 화면을 그린다 (시간이 화면에 바로 맞게)
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(KEY);
        if (v) {
          const saved = { ...DEFAULT, ...JSON.parse(v) };
          setS(saved);
          setClock(saved.clock);
        }
        await loadTimes();
      } catch {}
      setReady(true);
    })();
  }, []);

  const set = (p: Partial<Settings>) =>
    setS((old) => {
      const next = { ...old, ...p };
      setClock(next.clock);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

  return <Ctx.Provider value={{ ...s, set }}>{ready ? children : null}</Ctx.Provider>;
}
