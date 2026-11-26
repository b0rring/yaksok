import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import SpeakButton from './SpeakButton';
import type { Drug } from '../lib/api';
import { C, S } from '../lib/theme';

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

// 약 하나의 설명. 위쪽은 AI가 쉽게 정리한 내용, 아래쪽 파란 상자는 식약처 공식 설명 (없으면 "공식 정보 없음"이라고 밝힌다).
const WHO = { ai: 'AI가 쉽게 정리한 설명', user: '직접 적은 설명', mix: '직접 적은 내용 + AI가 정리한 설명' };

export default function DrugCard({ d, bare, speak }: { d: Drug; bare?: boolean; speak?: boolean }) {
  return (
    <View style={styles.box}>
      {!bare && <Text style={styles.name}>{d.name}</Text>}
      <Text style={[styles.ai, d.by === 'user' && { color: C.green }]}>{WHO[d.by ?? 'ai']}</Text>
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
        <Text style={styles.noOfficial}>식약처 e약은요에서 이 약을 찾지 못했어요. 위 내용은 공식 정보가 아니에요. 의사나 약사에게 확인하세요.</Text>
      )}
      {speak && (
        <SpeakButton
          inline
          text={`${d.name}. ${rows.map(([label, k]) => `${label}: ${d[k]}`).join(' ')}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: S.in },
  name: { fontSize: 26, fontWeight: '800', color: C.text },
  ai: { fontSize: 17, fontWeight: '800', color: C.orange },
  row: { gap: S.tight },
  label: { fontSize: 17, fontWeight: '800', color: C.green },
  body: { fontSize: 19, lineHeight: 27, color: C.text },
  official: { backgroundColor: C.bg, borderRadius: 12, padding: S.item, gap: S.in },
  offTitle: { fontSize: 19, fontWeight: '800', color: C.primary },
  noOfficial: { fontSize: 17, lineHeight: 24, color: C.orange },
});
