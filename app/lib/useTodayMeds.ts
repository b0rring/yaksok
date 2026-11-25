import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { Plan, SLOTS, Slot, activePlans, addLog, isTaken } from './store';

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

  const eat = (s: Slot) => {
    const done = async () => { await addLog(s); load(); };
    if (taken.includes(s))
      Alert.alert('이미 드셨어요', '또 드시면 위험할 수 있어요.', [
        { text: '안 먹을게요', style: 'cancel' },
        { text: '그래도 먹었어요', style: 'destructive', onPress: done },
      ]);
    else done();
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
