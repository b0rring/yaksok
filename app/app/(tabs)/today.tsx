import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import BigButton from '../../components/BigButton';
import { C } from '../../lib/theme';
import { todayText, useTodayMeds } from '../../lib/useTodayMeds';

const pad = (n: number) => String(n).padStart(2, '0');

export default function Today() {
  const router = useRouter();
  const { plans, slots, eat } = useTodayMeds();

  return (
    <ScrollView contentContainerStyle={styles.wrap} style={{ backgroundColor: C.bg }}>
      <Text style={styles.date}>{todayText()}</Text>
      <Text style={styles.head}>오늘 먹을 약</Text>
      <BigButton label="새 약 추가하기" small onPress={() => router.push('/scan')} />

      {!slots.length && <Text style={styles.empty}>아직 정해진 약이 없어요.</Text>}
      {slots.map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.time}>{pad(s.hour)}:{pad(s.minute)} · {s.label}</Text>
          <Text style={styles.title}>{s.label} 약</Text>
          <View style={styles.line} />
          <Text style={styles.body}>{s.drugs.join('\n')}</Text>
          <BigButton label={s.done ? '✓ 먹었어요' : '먹었어요'} color={s.done ? C.gray : C.green} onPress={() => eat(s.id)} />
        </View>
      ))}

      {!!plans.length && (
        <View style={styles.card}>
          <Text style={styles.title}>지금 드시고 계신 약</Text>
          {plans.map((p) => (
            <View key={p.id}>
              <Text style={styles.drugs}>{p.drugs.join(', ')}</Text>
              <Text style={styles.sub}>{p.start}부터 {p.days}일</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  date: { fontSize: 20, color: C.sub },
  head: { fontSize: 36, fontWeight: '900', color: C.text },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 20, gap: 12, borderWidth: 1, borderColor: C.line },
  time: { fontSize: 20, color: C.sub },
  title: { fontSize: 30, fontWeight: '900', color: C.text },
  line: { height: 1, backgroundColor: C.line },
  body: { fontSize: 24, lineHeight: 36, fontWeight: '700', color: C.text },
  drugs: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 20, color: C.sub },
  empty: { fontSize: 24, color: C.text, textAlign: 'center', padding: 24 },
});
