import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import { scheduleSlots } from '../lib/notify';
import { SLOTS, Slot, addPlan, allActiveSlots } from '../lib/store';
import { C } from '../lib/theme';

// 보조 기능: 자동으로 정해진 시간이 아닌 다른 시간에 먹을 때 직접 고른다.
export default function Plan() {
  const router = useRouter();
  const ask = useDialog();
  const { drugs } = useLocalSearchParams<{ drugs: string }>();
  const [picked, setPicked] = useState<Slot[]>([]);

  const toggle = (s: Slot) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const save = async () => {
    if (!picked.length) return ask({ title: '시간을 골라 주세요' });
    await addPlan({ drugs: JSON.parse(drugs), slots: picked, days: 7 });
    if (!(await scheduleSlots(await allActiveSlots()))) ask({ title: '알림을 켜 주세요', message: '설정에서 알림을 허용해 주세요.' });
    router.navigate('/');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>언제 드세요?</Text>
      {SLOTS.map((s) => (
        <BigButton
          key={s.id}
          label={`${picked.includes(s.id) ? '✓ ' : ''}${s.label}`}
          variant={picked.includes(s.id) ? 'primary' : 'secondary'}
          onPress={() => toggle(s.id)}
        />
      ))}
      <BigButton label="저장" onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center', gap: 16 },
  text: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 8, color: C.text },
});
