import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import BigButton from '../components/BigButton';
import { Plan, SLOTS, Slot, addLog, getPlan, isTaken } from '../lib/store';

export default function Today() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [taken, setTaken] = useState<Slot[]>([]);

  const load = useCallback(async () => {
    const p = await getPlan();
    setPlan(p);
    const done: Slot[] = [];
    for (const s of p?.slots ?? []) if (await isTaken(s)) done.push(s);
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

  if (!plan)
    return <Text style={styles.empty}>{'아직 정해진 약이 없어요.\n"약 찍기"에서 먼저 약을 찍어 주세요.'}</Text>;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {SLOTS.filter((s) => plan.slots.includes(s.id)).map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.title}>{s.label} 약</Text>
          <Text style={styles.body}>{plan.drugs.join(', ')}</Text>
          <BigButton
            label={taken.includes(s.id) ? '✓ 먹었어요' : '먹었어요'}
            color={taken.includes(s.id) ? '#9E9E9E' : '#1B5E20'}
            onPress={() => eat(s.id)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 20, backgroundColor: '#fff' },
  card: { borderWidth: 2, borderColor: '#1B5E20', borderRadius: 20, padding: 20, gap: 12 },
  title: { fontSize: 30, fontWeight: '800' },
  body: { fontSize: 22, lineHeight: 32 },
  empty: { fontSize: 24, textAlign: 'center', marginTop: 120, lineHeight: 36 },
});
