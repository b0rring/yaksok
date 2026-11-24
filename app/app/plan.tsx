import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import BigButton from '../components/BigButton';
import { scheduleSlots } from '../lib/notify';
import { SLOTS, Slot, savePlan } from '../lib/store';

export default function Plan() {
  const router = useRouter();
  const { drugs } = useLocalSearchParams<{ drugs: string }>();
  const [picked, setPicked] = useState<Slot[]>([]);

  const toggle = (s: Slot) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const save = async () => {
    if (!picked.length) return Alert.alert('시간을 골라 주세요');
    await savePlan({ drugs: JSON.parse(drugs), slots: picked });
    if (!(await scheduleSlots(picked))) Alert.alert('알림을 켜 주세요', '설정에서 알림을 허용해 주세요.');
    router.replace('/today');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>언제 드세요?</Text>
      {SLOTS.map((s) => (
        <BigButton
          key={s.id}
          label={`${picked.includes(s.id) ? '✓ ' : ''}${s.label}`}
          color={picked.includes(s.id) ? '#1B5E20' : '#9E9E9E'}
          onPress={() => toggle(s.id)}
        />
      ))}
      <BigButton label="저장" color="#0D47A1" onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center', gap: 16 },
  text: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
});
