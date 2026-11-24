import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import BigButton from '../components/BigButton';
import { Plan, SLOTS, Slot, activePlans, addLog, isTaken } from '../lib/store';
import { C } from '../lib/theme';

export default function Today() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [taken, setTaken] = useState<Slot[]>([]);

  const load = useCallback(async () => {
    const ps = await activePlans();
    setPlans(ps);
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

  if (!plans.length)
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>{'아직 정해진 약이 없어요.\n홈에서 "약 찍기"를 눌러 주세요.'}</Text>
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.wrap} style={{ backgroundColor: C.bg }}>
      {SLOTS.map((s) => {
        const drugs = [...new Set(plans.filter((p) => p.slots.includes(s.id)).flatMap((p) => p.drugs))];
        if (!drugs.length) return null;
        const done = taken.includes(s.id);
        return (
          <View key={s.id} style={styles.card}>
            <Text style={styles.title}>{s.label} 약</Text>
            <Text style={styles.body}>{drugs.join(', ')}</Text>
            <BigButton label={done ? '✓ 먹었어요' : '먹었어요'} color={done ? C.gray : C.green} onPress={() => eat(s.id)} />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  card: { backgroundColor: C.card, borderRadius: 24, padding: 20, gap: 12, borderWidth: 1, borderColor: C.line },
  title: { fontSize: 30, fontWeight: '900', color: C.text },
  body: { fontSize: 22, lineHeight: 32, color: C.text },
  emptyWrap: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24 },
  empty: { fontSize: 24, textAlign: 'center', lineHeight: 36, color: C.text },
});
