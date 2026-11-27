import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Chip from './Chip';
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

// 항목 하나 = 색 바탕 칸: 제목(아이콘 + 이름) 아래에 문장마다 점을 찍어 한 줄씩. 왼쪽 색 띠 없이 바탕색으로만 구분한다.
function Block({ label, icon, tone, text, max }: { label: string; icon: IconName; tone: Tone; text: string; max?: number }) {
  const lines = sentences(text, max);
  if (!lines.length) return null;
  const warn = tone === 'warn';
  const color = warn ? C.orange : C.primary;
  return (
    <View style={[styles.block, { backgroundColor: warn ? C.warn : C.soft }]}>
      <View style={styles.head}>
        <Icon name={icon} size={20} color={color} stroke={2.4} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
      <View style={{ gap: 4 }}>
        {lines.map((l, i) => (
          <View key={i} style={styles.line}>
            <View style={[styles.bullet, { backgroundColor: color }]} />
            <Text style={[styles.body, warn && { fontWeight: '700' }]}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 약 하나의 설명. 위쪽은 AI가 쉽게 정리한 내용, 아래쪽은 식약처 공식 설명(눌러서 펼침). 없으면 "공식 정보 없음"이라고 밝힌다.
const WHO = { ai: 'AI가 쉽게 정리했어요', user: '직접 적은 설명', mix: '직접 적은 내용과 AI가 정리한 설명' };

// compact = 내 약 목록 안에서 펼칠 때: 위의 이름표 대신 항목 아래에 작은 표시(AI 설명, 공식 설명 있음)와 "소리로 듣기"를 둔다.
export default function DrugCard({ d, bare, speak, compact }: { d: Drug; bare?: boolean; speak?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const by = d.by ?? 'ai';
  return (
    <View style={styles.box}>
      <View style={{ gap: 8 }}>
        {(!bare || !!d.dose) && !compact && (
          <View style={styles.nameRow}>
            {!bare && <Text style={styles.name}>{d.name}</Text>}
            {!!d.dose && <Chip small text={`1회 ${d.dose}`} />}
          </View>
        )}
        {compact ? null : by === 'user' ? (
          <View style={[styles.who, { backgroundColor: C.fill }]}>
            <Text style={[styles.whoText, { color: C.primary }]}>{WHO.user}</Text>
          </View>
        ) : (
          <View style={[styles.who, { backgroundColor: C.aiSoft }]}>
            <Icon name="sparkles" size={16} color={C.ai} stroke={2.4} />
            <Text style={[styles.whoText, { color: C.ai }]}>{WHO[by]}</Text>
          </View>
        )}
      </View>
      {rows.map((r) => (
        <Block key={r.key} label={r.label} icon={r.icon} tone={r.tone} text={d[r.key]} />
      ))}
      {compact ? (
        <View style={{ gap: 8 }}>
          <View style={styles.tagRow}>
            <View style={[styles.who, { backgroundColor: by === 'user' ? C.fill : C.aiSoft }]}>
              {by !== 'user' && <Icon name="sparkles" size={16} color={C.ai} stroke={2.4} />}
              <Text style={[styles.whoText, { color: by === 'user' ? C.primary : C.ai }]}>{by === 'user' ? '직접 적은 설명' : 'AI 설명'}</Text>
            </View>
            {!!d.official && (
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={[styles.who, { backgroundColor: C.done, minHeight: 28 }]}>
                <Icon name="check" size={16} color="#2F5A43" stroke={3} />
                <Text style={[styles.whoText, { color: '#2F5A43' }]}>식약처 공식 설명 있음{open ? ' (접기)' : ' (보기)'}</Text>
              </Pressable>
            )}
          </View>
          {!d.official && <Text style={styles.noOfficial}>식약처 e약은요에서 이 약을 찾지 못했어요. 위 내용은 공식 정보가 아니에요. 의사나 약사에게 확인하세요.</Text>}
          {open && !!d.official && (
            <View style={{ gap: 12 }}>
              {OFFICIAL.map((o) => (
                <Block key={o.label} label={o.label} icon={o.icon} tone={o.tone} text={o.keys.map((k) => d.official?.[k]).filter(Boolean).join(' ')} max={4} />
              ))}
            </View>
          )}
        </View>
      ) : d.official ? (
        <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={styles.official}>
            <Text style={styles.officialText}>식약처 공식 설명 {open ? '접기' : '보기'}{d.official.demo ? ' (시연용 예시)' : ''}</Text>
            <Icon name={open ? 'up' : 'down'} size={24} color={C.primary} />
          </Pressable>
          {open && (
            <View style={{ gap: 12 }}>
              {OFFICIAL.map((o) => (
                <Block key={o.label} label={o.label} icon={o.icon} tone={o.tone} text={o.keys.map((k) => d.official?.[k]).filter(Boolean).join(' ')} max={4} />
              ))}
            </View>
          )}
        </>
      ) : (
        <Text style={styles.noOfficial}>식약처 e약은요에서 이 약을 찾지 못했어요. 위 내용은 공식 정보가 아니에요. 의사나 약사에게 확인하세요.</Text>
      )}
      {speak && <SpeakButton wide text={`${d.name}. ${rows.map((r) => `${r.label}: ${d[r.key]}`).join(' ')}`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  who: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3 },
  whoText: { fontSize: 16, fontWeight: '800' },
  block: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 18, fontWeight: '800' },
  line: { flexDirection: 'row', gap: 10 },
  bullet: { width: 7, height: 7, borderRadius: 4, marginTop: 11 },
  body: { flex: 1, fontSize: 18, lineHeight: 28, color: C.text },
  official: { minHeight: 52, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  officialText: { fontSize: 18, fontWeight: '800', color: C.primary, flexShrink: 1 },
  noOfficial: { fontSize: 16, lineHeight: 24, color: C.orange },
});
