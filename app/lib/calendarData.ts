import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Log, Plan, Visit, addDays, getLogs, getPlans, getVisits, planEnd } from './store';

export type Kind = 'plan' | 'taken' | 'visit';

// 캘린더에 쓰는 복약 계획·복용 기록·진료 기록과, 날짜별 점(dots). 홈 미리보기와 캘린더 탭이 함께 쓴다.
export function useCalendarData() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  const load = useCallback(async () => {
    setPlans(await getPlans());
    setLogs(await getLogs());
    setVisits(await getVisits());
  }, []);
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

  return { plans, logs, visits, dots, reload: load };
}
