import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import ScreenTitle from '../components/ScreenTitle';
import BigButton from '../components/BigButton';
import DrugCard from '../components/DrugCard';
import Icon from '../components/Icon';
import SlotIcon from '../components/SlotIcon';
import SpeakButton from '../components/SpeakButton';
import type { ScanResult } from '../lib/api';
import { slotLabel } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const md = (d: string) => d.replace(/^\d+-0?(\d+)-0?(\d+).*$/, '$1월 $2일');
const SLOT_ORDER = ['morning', 'noon', 'evening'] as const;

export default function Result() {
  const router = useRouter();
  const { data, added } = useLocalSearchParams<{ data: string; added?: string }>();
  let parsed: ScanResult | null = null;
  try {
    parsed = JSON.parse(data);
  } catch {}
  if (!parsed?.drugs?.length)
    return (
      <View style={[styles.wrap, { flex: 1, justifyContent: 'center', backgroundColor: C.page }]}>
        <Text style={styles.empty}>약 정보를 찾지 못했어요</Text>
        <BigButton label="홈으로" onPress={() => router.navigate('/')} />
      </View>
    );
  const { drugs, source, condition, guess, hospital, pharmacy, date, schedule } = parsed;
  const slots = SLOT_ORDER.filter((s) => schedule?.slots?.includes(s));
  const speak = drugs
    .map((d) => `${d.name}. 효과: ${d.effect} 먹는 법: ${d.how} 조심할 점: ${d.caution} 같이 먹으면 안 되는 약: ${d.avoid}`)
    .join(' ');
  const find = (name: string, k: 'HP8' | 'PM9') => router.navigate({ pathname: '/hospital', params: { q: name, k } });
  const meta: [string, string, 'HP8' | 'PM9' | null][] = [];
  if (hospital) meta.push(['병원', hospital, 'HP8']);
  if (pharmacy) meta.push(['약국', pharmacy, 'PM9']);
  if (date) meta.push(['조제일', md(date), null]);

  return (
    <ScrollView style={{ backgroundColor: C.page }} contentContainerStyle={styles.wrap}>
<ScreenTitle text="약 정리 결과" />
      {!!added && (
        <View accessibilityRole="alert" style={styles.done}>
          <View style={styles.doneIcon}>
            <Icon name="check" size={22} color="#fff" stroke={3} />
          </View>
          <Text style={styles.doneText}>알림과 달력에 넣었어요</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={{ gap: 4 }}>
          <Text style={styles.cond}>{condition ? `${condition} 약` : '약 정리'}</Text>
          {!!condition && guess && <Text style={styles.guessNote}>병명은 AI가 약을 보고 짐작했어요</Text>}
        </View>
        <View style={styles.chips}>
          {slots.map((s) => (
            <View key={s} style={styles.slotChip}>
              <View style={styles.slotIcon}>
                <SlotIcon slot={s} size={20} />
              </View>
              <Text style={styles.chipText}>{slotLabel(s)}</Text>
            </View>
          ))}
          {!!schedule?.days && (
            <View style={styles.dayChip}>
              <Icon name="calendar" size={18} color={C.primary} stroke={2.4} />
              <Text style={styles.chipText}>{schedule.days}일 동안</Text>
            </View>
          )}
        </View>
        {meta.length > 0 && (
          <View style={styles.meta}>
            {meta.map(([label, value, k]) => (
              <View key={label} style={styles.metaRow}>
                <Text style={styles.metaLabel}>{label}</Text>
                <Text style={styles.metaValue}>{value}</Text>
                {!!k && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`${value} 찾기`} onPress={() => find(value, k)} style={styles.find}>
                    <Icon name="search" size={22} color={C.primary} stroke={2.4} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
        <SpeakButton wide text={speak} />
      </View>

      <View style={styles.partHead}>
        <Icon name="pill" size={24} color={C.primary} />
        <Text style={styles.partTitle}>약 {drugs.length}가지</Text>
      </View>
      {drugs.map((d) => (
        <View key={d.name} style={styles.card}>
          <DrugCard d={d} />
        </View>
      ))}

      <Text style={styles.source}>이 설명은 참고용이에요. 정확한 복용법은 의사나 약사에게 확인하세요.{source ? `\n출처: ${source}` : ''}</Text>
      <View style={{ gap: 12 }}>
        <BigButton label="홈에서 보기" onPress={() => router.navigate('/')} />
        {!added && <BigButton label="먹는 시간 직접 정하기" icon="clock" variant="secondary" onPress={() => router.push({ pathname: '/plan', params: { data } })} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: 28 },
  empty: { fontSize: 20, fontWeight: '800', color: C.green, textAlign: 'center' },
  done: { minHeight: 64, borderRadius: 18, backgroundColor: C.done, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F7A60', alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: 20, fontWeight: '800', color: '#2F5A43' },
  card: { ...CARD, padding: S.pad, gap: 14 },
  cond: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, color: C.text },
  guessNote: { fontSize: 16, color: C.orange },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, backgroundColor: C.fill, paddingVertical: 3, paddingLeft: 4, paddingRight: 12 },
  slotIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dayChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, backgroundColor: C.fill, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 16, fontWeight: '800', color: C.primary },
  meta: { borderRadius: 14, backgroundColor: C.soft, paddingVertical: 6, paddingLeft: 16, paddingRight: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  metaLabel: { width: 56, fontSize: 16, fontWeight: '700', color: C.sub },
  metaValue: { flex: 1, fontSize: 18, fontWeight: '800', color: C.text },
  find: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  partHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginBottom: -12 },
  partTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  source: { fontSize: 16, lineHeight: 24, color: C.sub, textAlign: 'center' },
});
