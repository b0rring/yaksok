import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import DrugCard from '../components/DrugCard';
import SpeakButton from '../components/SpeakButton';
import type { ScanResult } from '../lib/api';
import { C, CARD, S } from '../lib/theme';

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
  const { drugs, source, condition, guess } = parsed;
  const speak = drugs
    .map((d) => `${d.name}. 효과: ${d.effect} 먹는 법: ${d.how} 조심할 점: ${d.caution} 같이 먹으면 안 되는 약: ${d.avoid}`)
    .join(' ');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <ScrollView contentContainerStyle={styles.wrap}>
      {!!added && <Text style={styles.added}>✓ 알림과 캘린더에 추가했어요</Text>}
      {!!condition && <Text style={styles.cond}>{condition} 약</Text>}
      {!!condition && guess && <Text style={styles.guessNote}>병명은 AI가 약을 보고 짐작했어요</Text>}
      {drugs.map((d) => (
        <View key={d.name} style={styles.card}>
          <DrugCard d={d} />
        </View>
      ))}
      <Text style={styles.source}>출처: {source}</Text>
      <BigButton label="홈에서 보기" onPress={() => router.navigate('/')} />
      {!added && (
        <BigButton
          label="시간 직접 정하기"
          variant="secondary"
          small
          onPress={() =>
            router.push({ pathname: '/plan', params: { data } })
          }
        />
      )}
    </ScrollView>
    <SpeakButton text={speak} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 102, gap: S.gap },
  added: { fontSize: 20, fontWeight: '800', color: C.green, textAlign: 'center' },
  guessNote: { fontSize: 16, color: C.orange, textAlign: 'center', marginTop: -S.in },
  cond: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center' },
  card: { ...CARD, padding: S.pad },
  source: { fontSize: 16, color: C.sub, textAlign: 'center' },
});
