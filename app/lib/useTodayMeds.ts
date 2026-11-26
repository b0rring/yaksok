import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useDialog } from '../components/Dialog';
import { Log, Plan, SLOTS, Slot, addLogs, didTake, getLogs, getPlans, isActive, planTitle, removeLog, today } from './store';

// 오늘 먹을 약: 시간대마다 "약 묶음(처방 한 장 = 한 병)" 목록과 먹었는지. 홈 체크리스트와 약 물어보기가 함께 쓴다.
export function useTodayMeds() {
  const [all, setAll] = useState<Plan[]>([]); // 중지·끝난 약까지 모두
  const [logs, setLogs] = useState<Log[]>([]);

  const load = useCallback(async () => {
    setAll(await getPlans());
    setLogs(await getLogs());
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ask = useDialog();
  const plans = all.filter(isActive);
  const t = today();
  const slots = SLOTS.map((s) => {
    const items = plans.filter((p) => p.slots.includes(s.id)).map((plan) => ({ plan, done: didTake(logs, t, s.id, plan.id) }));
    return { ...s, items, done: items.every((i) => i.done) };
  }).filter((s) => s.items.length);

  // 체크 토글: 안 먹은 상태면 기록하고, 이미 먹은 상태면 확인 창을 거쳐 취소한다.
  const eat = (slot: Slot, plan: Plan, done: boolean) => {
    if (!done) return void addLogs(slot, [plan.id]).then(load);
    ask({
      title: '먹은 표시를 지울까요?',
      message: `${SLOTS.find((x) => x.id === slot)?.label} ${planTitle(plan)} 먹은 표시를 지워요.`,
      actions: [
        { label: '지우기', kind: 'danger', onPress: () => removeLog(slot, plan.id).then(load) },
        { label: '그대로 두기', kind: 'secondary' },
      ],
    });
  };
  // 그 시간대의 아직 안 먹은 묶음을 한 번에 체크
  const eatAll = (slot: Slot) =>
    addLogs(slot, slots.find((s) => s.id === slot)?.items.filter((i) => !i.done).map((i) => i.plan.id) ?? []).then(load);

  return { plans, all, slots, eat, eatAll, reload: load };
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
export const todayText = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
};
