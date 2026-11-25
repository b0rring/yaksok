import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import BigButton from '../components/BigButton';
import type { ScanResult } from '../lib/api';
import { C } from '../lib/theme';

const rows = [
  ['효과', 'effect'],
  ['먹는 법', 'how'],
  ['조심할 점', 'caution'],
  ['같이 먹으면 안 되는 약', 'avoid'],
] as const;

export default function Result() {
  const router = useRouter();
  const { data, added } = useLocalSearchParams<{ data: string; added?: string }>();
  let parsed: ScanResult | null = null;
  try {
    parsed = JSON.parse(data);
  } catch {}
  if (!parsed?.drugs?.length)
    return (
      <View style={[styles.wrap, { flex: 1, justifyContent: 'center', backgroundColor: C.bg }]}>
        <Text style={styles.added}>약 정보를 찾지 못했어요</Text>
        <BigButton label="홈으로" onPress={() => router.navigate('/')} />
      </View>
    );
  const { drugs, source } = parsed;

  return (
    <ScrollView contentContainerStyle={styles.wrap} style={{ backgroundColor: C.bg }}>
      {!!added && <Text style={styles.added}>✓ 알림과 캘린더에 추가했어요</Text>}
      {drugs.map((d) => (
        <View key={d.name} style={styles.card}>
          <Text style={styles.name}>{d.name}</Text>
          {rows.map(([label, key]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.body}>{d[key]}</Text>
            </View>
          ))}
        </View>
      ))}
      <Text style={styles.source}>출처: {source}</Text>
      <BigButton label="오늘 약 보기" onPress={() => router.navigate('/today')} />
      <BigButton label="홈으로" variant="secondary" small onPress={() => router.navigate('/')} />
      {!added && (
        <BigButton
          label="시간 직접 정하기"
          variant="secondary"
          small
          onPress={() =>
            router.push({ pathname: '/plan', params: { drugs: JSON.stringify(drugs.map((d) => d.name)) } })
          }
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  added: { fontSize: 24, fontWeight: '800', color: C.green, textAlign: 'center' },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: C.line },
  name: { fontSize: 30, fontWeight: '900', color: C.text },
  row: { gap: 4 },
  label: { fontSize: 20, fontWeight: '800', color: C.green },
  body: { fontSize: 22, lineHeight: 32, color: C.text },
  source: { fontSize: 18, color: C.sub, textAlign: 'center' },
});
