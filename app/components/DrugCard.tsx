import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Icon, { IconName } from './Icon';
import SpeakButton from './SpeakButton';
import type { Drug } from '../lib/api';
import { C, S } from '../lib/theme';

type Tone = 'plain' | 'warn';
// AI가 쉽게 정리한 항목. 조심할 점·같이 먹으면 안 되는 약은 산호색 경고 블록으로 강조한다.
const rows: { label: string; key: 'effect' | 'how' | 'caution' | 'avoid'; icon: IconName; tone: Tone }[] = [
  { label: '효과', key: 'effect', icon: 'pill', tone: 'plain' },
  { label: '먹는 법', key: 'how', icon: 'clock', tone: 'plain' },
  { label: '조심할 점', key: 'caution', icon: 'alert', tone: 'warn' },
  { label: '같이 먹으면 안 되는 약', key: 'avoid', icon: 'ban', tone: 'warn' },
];
// 식약처 e약은요 공식 설명에서 보여줄 항목 (문장은 최대 4개)
const OFFICIAL: { label: string; keys: ('efcy' | 'use' | 'warn' | 'atpn' | 'intrc' | 'se')[]; icon: IconName; tone: Tone }[] = [
  { label: '효능', keys: ['efcy'], icon: 'pill', tone: 'plain' },
  { label: '사용법', keys: ['use'], icon: 'clock', tone: 'plain' },
  { label: '주의사항', keys: ['warn', 'atpn'], icon: 'alert', tone: 'warn' },
  { label: '함께 먹으면 안 되는 약', keys: ['intrc'], icon: 'ban', tone: 'warn' },
  { label: '부작용', keys: ['se'], icon: 'alert', tone: 'warn' },
];

// 긴 글을 한 문장씩 나눈다 (글이 한 덩어리로 붙어 있으면 읽기 어렵다)
const sentences = (t: string, max = 6) =>
  t
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);

// 항목 하나 = 색 띠가 있는 블록: 제목(아이콘+이름) 아래에 문장마다 점을 찍어 한 줄씩.
function Block({ label, icon, tone, text, max }: { label: string; icon: IconName; tone: Tone; text: string; max?: number }) {
  const lines = sentences(text, max);
  if (!lines.length) return null;
  const warn = tone === 'warn';
  const color = warn ? C.orange : C.primary;
  return (
    <View style={[styles.block, { backgroundColor: warn ? C.warn : C.soft, borderLeftColor: color }]}>
      <View style={styles.head}>
        <Icon name={icon} size={20} color={color} stroke={2.4} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
      {lines.map((l, i) => (
        <View key={i} style={styles.line}>
          <View style={[styles.bullet, { backgroundColor: color }]} />
          <Text style={[styles.body, warn && { fontWeight: '700' }]}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

// 약 하나의 설명. 위쪽은 AI가 쉽게 정리한 내용, 아래쪽은 식약처 공식 설명 (없으면 "공식 정보 없음"이라고 밝힌다).
const WHO = { ai: 'AI가 쉽게 정리한 설명', user: '직접 적은 설명', mix: '직접 적은 내용 + AI가 정리한 설명' };

export default function DrugCard({ d, bare, speak }: { d: Drug; bare?: boolean; speak?: boolean }) {
  return (
    <View style={styles.box}>
      {!bare && <Text style={styles.name}>{d.name}</Text>}
      <Text style={[styles.ai, d.by === 'user' && { color: C.green }]}>{WHO[d.by ?? 'ai']}</Text>
      {!!d.dose && <Block label="1회 먹는 양" icon="pill" tone="plain" text={d.dose} />}
      {rows.map((r) => (
        <Block key={r.key} label={r.label} icon={r.icon} tone={r.tone} text={d[r.key]} />
      ))}
      {d.official ? (
        <View style={styles.official}>
          <Text style={styles.offTitle}>식약처 공식 설명{d.official.demo ? ' (시연용 예시)' : ''}</Text>
          {OFFICIAL.map((o) => (
            <Block key={o.label} label={o.label} icon={o.icon} tone={o.tone} text={o.keys.map((k) => d.official?.[k]).filter(Boolean).join(' ')} max={4} />
          ))}
        </View>
      ) : (
        <Text style={styles.noOfficial}>식약처 e약은요에서 이 약을 찾지 못했어요. 위 내용은 공식 정보가 아니에요. 의사나 약사에게 확인하세요.</Text>
      )}
      {speak && <SpeakButton inline text={`${d.name}. ${rows.map((r) => `${r.label}: ${d[r.key]}`).join(' ')}`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: S.gap },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  ai: { fontSize: 18, fontWeight: '800', color: C.orange },
  block: { borderRadius: 12, borderLeftWidth: 5, paddingVertical: S.item, paddingHorizontal: S.item, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  label: { fontSize: 18, fontWeight: '800' },
  line: { flexDirection: 'row', gap: 12 },
  bullet: { width: 8, height: 8, borderRadius: 3, marginTop: 12 },
  body: { flex: 1, fontSize: 18, lineHeight: 28, color: C.text },
  official: { borderTopWidth: 2, borderTopColor: C.line, paddingTop: S.gap, gap: S.gap },
  offTitle: { fontSize: 18, fontWeight: '800', color: C.primary },
  noOfficial: { fontSize: 18, lineHeight: 24, color: C.orange },
});
