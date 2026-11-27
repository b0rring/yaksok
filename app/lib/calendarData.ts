import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { Log, Plan, Visit, addDays, didTake, getLogs, getPlans, getVisits, planEnd } from './store';

export type Kind = 'plan' | 'taken' | 'visit';
// 날짜의 상태: done = 그날 먹을 약을 다 먹음, missed = 지난 날인데 덜 먹음(빠뜨림), todo = 오늘 이후라 아직, none = 먹을 약 없음
export type DayState = 'done' | 'missed' | 'todo' | 'none';
export type DayCount = { total: number; taken: number };
export const dayState = (c: DayCount | undefined, date: string, today: string): DayState =>
  !c || !c.total ? 'none' : c.taken >= c.total ? 'done' : date < today ? 'missed' : 'todo';

// 캘린더에 쓰는 복약 계획·복용 기록·진료 기록과, 날짜별 점(dots). 홈 미리보기와 캘린더 탭이 함께 쓴다.
export function useCalendarData() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const { version } = useAuth(); // 전환하거나 상대가 고치면 다시 읽는다

  const load = useCallback(async () => {
    setPlans(await getPlans());
    setLogs(await getLogs());
    setVisits(await getVisits());
  }, [version]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const dots = useMemo(() => {
    const m: Record<string, Kind[]> = {};
    const add = (date: string, k: Kind) => {
      const list = (m[date] ??= []);
      if (!list.includes(k)) list.push(k);
    };
    for (const p of plans) for (let d = p.start, end = planEnd(p); d <= end; d = addDays(d, 1)) add(d, 'plan');
    for (const l of logs) add(l.date, 'taken');
    for (const v of visits) add(v.date, 'visit');
    return m;
  }, [plans, logs, visits]);

  // 날짜별 먹을 횟수와 먹은 횟수 (시간대 x 처방 묶음마다 1회)
  const counts = useMemo(() => {
    const m: Record<string, DayCount> = {};
    for (const p of plans)
      for (let d = p.start, end = planEnd(p); d <= end; d = addDays(d, 1)) {
        const c = (m[d] ??= { total: 0, taken: 0 });
        for (const sl of p.slots) {
          c.total++;
          if (didTake(logs, d, sl, p.id)) c.taken++;
        }
      }
    return m;
  }, [plans, logs]);

  return { plans, logs, visits, dots, counts, reload: load };
}
