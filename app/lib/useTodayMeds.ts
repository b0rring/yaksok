import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useDialog } from '../components/Dialog';
import { Plan, SLOTS, Slot, activePlans, addLog, isTaken, removeLog } from './store';

// 오늘 먹을 약 (시간대별) + "먹었어요" 처리. 홈과 오늘 약 화면이 함께 쓴다.
export function useTodayMeds() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [taken, setTaken] = useState<Slot[]>([]);

  const load = useCallback(async () => {
    setPlans(await activePlans());
    const done: Slot[] = [];
    for (const s of SLOTS) if (await isTaken(s.id)) done.push(s.id);
    setTaken(done);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ask = useDialog();
  // 먹었어요 토글: 안 먹은 상태면 기록하고, 이미 먹은 상태면 확인 창을 거쳐 기록을 취소한다.
  const eat = (s: Slot) => {
    if (!taken.includes(s)) {
      addLog(s).then(load);
      return;
    }
    const label = SLOTS.find((x) => x.id === s)?.label;
    ask({
      title: '먹은 기록을 취소할까요?',
      message: `${label} 약 먹은 표시를 지워요.`,
      actions: [
        { label: '취소하기', kind: 'danger', onPress: () => removeLog(s).then(load) },
        { label: '그대로 두기', kind: 'secondary' },
      ],
    });
  };

  const slots = SLOTS.map((s) => ({
    ...s,
    drugs: [...new Set(plans.filter((p) => p.slots.includes(s.id)).flatMap((p) => p.drugs))],
    done: taken.includes(s.id),
  })).filter((s) => s.drugs.length);

  return { plans, slots, eat };
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
export const todayText = () => {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
};
