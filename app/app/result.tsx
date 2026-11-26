import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import SpeakButton from '../components/SpeakButton';
import type { ScanResult } from '../lib/api';
import { C, CARD, S } from '../lib/theme';

const rows = [
  ['효과', 'effect'],
  ['먹는 법', 'how'],
  ['조심할 점', 'caution'],
  ['같이 먹으면 안 되는 약', 'avoid'],
] as const;
// 식약처 e약은요 공식 설명에서 보여줄 항목 (긴 글은 220자까지)
const OFFICIAL = [
  ['효능', ['efcy']],
  ['사용법', ['use']],
  ['주의사항', ['warn', 'atpn']],
  ['함께 먹으면 안 되는 약', ['intrc']],
  ['부작용', ['se']],
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
  const speak = drugs
    .map((d) => `${d.name}. 효과: ${d.effect} 먹는 법: ${d.how} 조심할 점: ${d.caution} 같이 먹으면 안 되는 약: ${d.avoid}`)
    .join(' ');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <ScrollView contentContainerStyle={styles.wrap}>
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
          {d.official ? (
            <View style={styles.official}>
              <Text style={styles.offTitle}>식약처 공식 설명{d.official.demo ? ' (시연용 예시)' : ''}</Text>
              {OFFICIAL.map(([label, keys]) => {
                const t = keys.map((k) => d.official?.[k]).filter(Boolean).join(' ');
                return t ? (
                  <View key={label} style={styles.row}>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.body}>{t.length > 220 ? `${t.slice(0, 220)}…` : t}</Text>
                  </View>
                ) : null;
              })}
            </View>
          ) : (
            <Text style={styles.noOfficial}>식약처 공식 정보를 찾지 못해 AI가 읽은 설명이에요.</Text>
          )}
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
            router.push({ pathname: '/plan', params: { drugs: JSON.stringify(drugs.map((d) => d.name)) } })
          }
        />
      )}
    </ScrollView>
    <SpeakButton text={speak} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 120, gap: 16 },
  added: { fontSize: 24, fontWeight: '800', color: C.green, textAlign: 'center' },
  card: { ...CARD, padding: S.pad, gap: 14 },
  name: { fontSize: 30, fontWeight: '800', color: C.text },
  row: { gap: 4 },
  label: { fontSize: 20, fontWeight: '800', color: C.green },
  body: { fontSize: 22, lineHeight: 32, color: C.text },
  official: { backgroundColor: C.bg, borderRadius: 14, padding: 16, gap: 12 },
  offTitle: { fontSize: 22, fontWeight: '800', color: C.primary },
  noOfficial: { fontSize: 18, color: C.sub },
  source: { fontSize: 18, color: C.sub, textAlign: 'center' },
});
