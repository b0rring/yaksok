import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Chip from './Chip';
import Icon from './Icon';
import MonthGrid, { DOT_COLOR } from './MonthGrid';
import WeekStrip from './WeekStrip';
import { useCalendarData } from '../lib/calendarData';
import { useSettings } from '../lib/settings';
import { SLOTS, addDays, fmtTime, didTake, planEnd, planTitle, today } from '../lib/store';
import { C, CARD, R, S } from '../lib/theme';

const WEEKDAY = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (s: string) => new Date(`${s}T00:00:00`);
const timeText = fmtTime;

// 캘린더 본문(날짜 줄 + 고른 날의 타임라인). 홈 아래에는 주간(week), 캘린더 탭에는 월간(month)으로 넣는다.
export default function CalendarView({ mode }: { mode: 'week' | 'month' }) {
  const router = useRouter();
  useSettings(); // 시각 표시를 바꾸면 다시 그린다
  const t = today();
  const [sel, setSel] = useState(t);
  const month = mode === 'month';
  const [ym, setYm] = useState({ y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 });
  const { plans, logs, visits, dots } = useCalendarData();

  const selD = toDate(sel);
  const weekStart = addDays(sel, -selD.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekNo = Math.ceil((selD.getDate() + new Date(selD.getFullYear(), selD.getMonth(), 1).getDay()) / 7);

  // 이 주에 먹기로 한 날(오늘까지) 중 먹은 날
  const planned = weekDays.filter((d) => d <= t && dots[d]?.includes('plan'));
  const took = planned.filter((d) => dots[d]?.includes('taken'));
  const thisWeek = weekDays.includes(t);

  const goMonth = (delta: number) =>
    setYm(({ y, m }) => {
      const n = new Date(y, m + delta, 1);
      return { y: n.getFullYear(), m: n.getMonth() };
    });

  // 고른 날의 타임라인: 시간대별 약 + 병원 방문
  const dayPlans = plans.filter((p) => p.start <= sel && sel <= planEnd(p));
  // 처방 묶음("편도염 약")마다 한 장: 오른쪽에 먹는 시간대(아침 8:00)
  const rows = SLOTS.flatMap((s) =>
    dayPlans.filter((p) => p.slots.includes(s.id)).map((p) => ({ key: `${s.id}${p.id}`, slot: s, plan: p, taken: didTake(logs, sel, s.id, p.id) })),
  );
  const dayVisits = visits.filter((v) => v.date === sel);
  const total = rows.length + dayVisits.length;

  return (
    <>
        <View style={styles.group}>
        <View style={styles.head}>
          {month ? (
            <View style={styles.titleRow}>
              <Pressable accessibilityLabel="이전 달" onPress={() => goMonth(-1)} hitSlop={8} style={styles.arrow}>
                <Icon name="left" size={24} color={C.primary} />
              </Pressable>
              <Chip big text={`${ym.y}년 ${ym.m + 1}월`} />
              <Pressable accessibilityLabel="다음 달" onPress={() => goMonth(1)} hitSlop={8} style={styles.arrow}>
                <Icon name="right" size={24} color={C.primary} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.titleRow}>
              <Pressable accessibilityLabel="지난주" onPress={() => setSel(addDays(sel, -7))} hitSlop={8} style={styles.arrow}>
                <Icon name="left" size={24} color={C.primary} />
              </Pressable>
              <Chip big text={`${selD.getMonth() + 1}월 ${weekNo}주차`} />
              <Pressable accessibilityLabel="다음주" onPress={() => setSel(addDays(sel, 7))} hitSlop={8} style={styles.arrow}>
                <Icon name="right" size={24} color={C.primary} />
              </Pressable>
            </View>
          )}
        </View>

        {month ? (
          <View style={styles.card}>
            <MonthGrid year={ym.y} month={ym.m} dots={dots} todayStr={t} selected={sel} onSelect={setSel} />
            <View style={styles.legend}>
              {([['plan', '먹을 날'], ['taken', '먹은 날'], ['visit', '병원 간 날']] as const).map(([k, label]) => (
                <View key={k} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: DOT_COLOR[k] }]} />
                  <Text style={styles.legendText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <>
            <WeekStrip days={weekDays} dots={dots} sel={sel} onSelect={setSel} />
            {!!planned.length && (
              <Text style={styles.week}>
                {thisWeek ? '이번 주' : '이 주'} <Text style={styles.weekNum}>{took.length}/{planned.length}일</Text> 복용했어요
              </Text>
            )}
          </>
        )}
        </View>

        <View style={styles.group}>
        <Chip big text={`${selD.getDate()}일 ${WEEKDAY[selD.getDay()]}`} />

        {!total && <Text style={styles.empty}>이 날은 약도 기록도 없어요</Text>}

        <View>
          {rows.map((r, i) => (
            <View key={r.key} style={styles.row}>
              <View style={styles.nodeCol}>
                {r.taken ? (
                  <View style={[styles.node, { backgroundColor: C.primary }]}>
                    <Icon name="check" size={17} color="#fff" stroke={3} />
                  </View>
                ) : (
                  <View style={[styles.node, styles.nodeTodo, sel > t && { borderColor: C.gray }]} />
                )}
                {(i < rows.length - 1 || dayVisits.length > 0) && <View style={styles.line} />}
              </View>
              <View style={[styles.item, CARD]}>
                <View style={styles.itemHead}>
                  <Text style={styles.itemTitle}>{planTitle(r.plan)}</Text>
                  <View style={styles.slotCol}>
                    <Text style={styles.slotTime}>{timeText(r.slot.hour, r.slot.minute)}</Text>
                    <Chip small solid={C.primary} text={r.slot.label} />
                  </View>
                </View>
                <Text style={styles.itemSub}>{r.plan.drugs.join('\n')}</Text>
              </View>
            </View>
          ))}
          {dayVisits.map((v, i) => (
            <View key={v.id} style={styles.row}>
              <View style={styles.nodeCol}>
                <View style={[styles.node, { backgroundColor: C.orange }]}>
                  <Icon name="note" size={16} color="#fff" stroke={2.6} />
                </View>
                {i < dayVisits.length - 1 && <View style={styles.line} />}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/show', params: { id: v.id } })}
                style={({ pressed }) => [styles.item, styles.itemVisit, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.itemHead}>
                  <Text style={styles.itemTitle}>{v.hospital}</Text>
                  <Chip small solid={C.orange} text="진료" />
                </View>
                <Text style={styles.itemSub} numberOfLines={2}>{v.summary}</Text>
                <Text style={styles.show}>의사에게 보여주기 ›</Text>
              </Pressable>
            </View>
          ))}
        </View>
        </View>

    </>
  );
}

const NODE = 28;
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 26, lineHeight: 32, fontWeight: '700', color: C.sub },
  card: { ...CARD, padding: S.pad, gap: S.in },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 16, color: C.sub },
  week: { fontSize: 18, color: C.sub },
  weekNum: { fontWeight: '800', color: C.primary },
  dayTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  group: { gap: S.gap },
  empty: { fontSize: 18, color: C.sub, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  time: { fontSize: 18, fontWeight: '700', color: C.sub },
  slotCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotTime: { fontSize: 16, color: C.sub },
  itemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nodeCol: { width: NODE + 18, alignItems: 'center', paddingTop: 8 },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center' },
  nodeTodo: { backgroundColor: '#fff', borderWidth: 6, borderColor: C.orange },
  nodeVisit: { width: 24, height: 24, borderRadius: 8, backgroundColor: C.text, marginTop: 4 },
  line: { flex: 1, width: 3, backgroundColor: C.mist, marginTop: 4, marginBottom: -10 },
  item: { flex: 1, padding: S.item, marginBottom: S.gap, gap: S.tight },
  itemVisit: { backgroundColor: C.soft, borderRadius: R.card },
  itemTitle: { flexShrink: 1, fontSize: 20, fontWeight: '800', color: C.text },
  itemSub: { fontSize: 18, lineHeight: 24, color: C.sub },
  show: { fontSize: 18, fontWeight: '800', color: C.primary, marginTop: 5 },
});
