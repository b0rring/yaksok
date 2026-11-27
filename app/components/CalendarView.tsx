import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Icon from './Icon';
import MonthGrid from './MonthGrid';
import SlotIcon from './SlotIcon';
import WeekStrip, { Legend } from './WeekStrip';
import { useCalendarData } from '../lib/calendarData';
import { useSettings } from '../lib/settings';
import { SLOTS, addDays, didTake, fmtTime, planEnd, planTitle, today } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const WEEKDAY = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const toDate = (s: string) => new Date(`${s}T00:00:00`);

// 고른 날의 시간대 상태 이름표: 다 먹음 / 지금 / 시간 전 / 빠뜨림 / 예정
const STATE = {
  done: { text: '다 먹음', bg: C.done, color: '#2F5A43' },
  now: { text: '지금', bg: C.orange, color: '#fff' },
  later: { text: '시간 전', bg: C.soft, color: C.sub },
  missed: { text: '빠뜨림', bg: C.peach, color: C.orange },
  plan: { text: '예정', bg: C.soft, color: C.sub },
} as const;

// 캘린더 본문. 홈 아래에는 이번 주 7칸(week), 캘린더 탭에는 한 달 달력 + 고른 날의 약·진료(month)로 넣는다.
export default function CalendarView({ mode }: { mode: 'week' | 'month' }) {
  const router = useRouter();
  useSettings(); // 시각 표시를 바꾸면 다시 그린다
  const t = today();
  const [sel, setSel] = useState(t);
  const [ym, setYm] = useState({ y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 });
  const { plans, logs, visits, counts } = useCalendarData();

  const visitDays = Object.fromEntries(visits.map((v) => [v.date, true]));

  if (mode === 'week') {
    const start = addDays(t, -toDate(t).getDay());
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return (
      <View style={{ gap: 10 }}>
        <WeekStrip days={days} counts={counts} visits={visitDays} today={t} onSelect={() => router.navigate('/calendar')} />
        <Legend />
      </View>
    );
  }

  const goMonth = (delta: number) =>
    setYm(({ y, m }) => {
      const n = new Date(y, m + delta, 1);
      return { y: n.getFullYear(), m: n.getMonth() };
    });

  const selD = toDate(sel);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // 고른 날의 시간대별 약: 시간대마다 한 줄(그 시간대에 먹는 처방 묶음 이름들)
  const dayPlans = plans.filter((p) => p.start <= sel && sel <= planEnd(p));
  const slots = SLOTS.map((s) => {
    const ps = dayPlans.filter((p) => p.slots.includes(s.id));
    const all = ps.length > 0 && ps.every((p) => didTake(logs, sel, s.id, p.id));
    const state: keyof typeof STATE = all ? 'done' : sel > t ? 'plan' : sel < t ? 'missed' : s.hour * 60 + s.minute <= nowMin ? 'now' : 'later';
    return { slot: s, ps, state };
  }).filter((x) => x.ps.length);
  const dayVisits = visits.filter((v) => v.date === sel);

  return (
    <>
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Pressable accessibilityLabel="이전 달" onPress={() => goMonth(-1)} hitSlop={8} style={styles.arrow}>
            <Icon name="left" size={24} color={C.primary} stroke={2.6} />
          </Pressable>
          <Text style={styles.monthTitle}>{ym.y}년 {ym.m + 1}월</Text>
          <Pressable accessibilityLabel="다음 달" onPress={() => goMonth(1)} hitSlop={8} style={styles.arrow}>
            <Icon name="right" size={24} color={C.primary} stroke={2.6} />
          </Pressable>
        </View>
        <MonthGrid year={ym.y} month={ym.m} counts={counts} visits={visitDays} todayStr={t} selected={sel} onSelect={setSel} />
        <View style={styles.legendBox}>
          <Legend />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <View style={styles.dayHead}>
          <Text style={styles.dayTitle}>{selD.getMonth() + 1}월 {selD.getDate()}일 {WEEKDAY[selD.getDay()]}</Text>
          {sel === t && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayText}>오늘</Text>
            </View>
          )}
        </View>
        <View style={styles.dayCard}>
          <View style={styles.label}>
            <Icon name="pill" size={20} color={C.sub} />
            <Text style={styles.labelText}>먹을 약</Text>
          </View>
          {!slots.length && <Text style={styles.empty}>이 날은 먹을 약이 없어요</Text>}
          {slots.map(({ slot, ps, state }, i) => {
            const st = STATE[state];
            return (
              <View key={slot.id} style={[styles.slotRow, i > 0 && styles.sep]}>
                {state === 'done' ? (
                  <View style={[styles.slotIcon, { backgroundColor: '#4F7A60' }]}>
                    <Icon name="check" size={24} color="#fff" stroke={3} />
                  </View>
                ) : (
                  <View style={styles.slotIcon}>
                    <SlotIcon slot={slot.id} size={28} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.titleLine}>
                    <Text style={styles.slotName}>{slot.label}</Text>
                    <Text style={styles.slotTime}>{fmtTime(slot.hour, slot.minute)}</Text>
                  </View>
                  <Text style={styles.slotSub}>{ps.map(planTitle).join(', ')}</Text>
                </View>
                <View style={[styles.state, { backgroundColor: st.bg }]}>
                  <Text style={[styles.stateText, { color: st.color }]}>{st.text}</Text>
                </View>
              </View>
            );
          })}

          <View style={[styles.label, styles.sep, { paddingTop: 14 }]}>
            <Icon name="note" size={20} color={C.sub} />
            <Text style={styles.labelText}>진료</Text>
          </View>
          {!dayVisits.length && <Text style={styles.empty}>이날은 진료 기록이 없어요</Text>}
          {dayVisits.map((v) => (
            <Pressable key={v.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/show', params: { id: v.id } })} style={({ pressed }) => [styles.visit, pressed && { opacity: 0.85 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.slotName}>{v.hospital}</Text>
                <Text style={styles.slotSub} numberOfLines={2}>{v.summary}</Text>
                <Text style={styles.show}>의사에게 보여주기</Text>
              </View>
              <Icon name="right" size={22} color={C.primary} stroke={2.6} />
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { ...CARD, paddingVertical: 16, paddingHorizontal: 12, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  monthTitle: { fontSize: 22, fontWeight: '900', color: C.text },
  arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  legendBox: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  dayTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  todayBadge: { borderRadius: 14, backgroundColor: C.primary, paddingHorizontal: 10, paddingVertical: 3 },
  todayText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  dayCard: { ...CARD, paddingHorizontal: 18, paddingVertical: 16, gap: 8 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelText: { fontSize: 18, fontWeight: '800', color: C.sub },
  sep: { borderTopWidth: 1, borderTopColor: C.line },
  empty: { fontSize: 18, color: C.sub, paddingVertical: 4 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  slotIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.peach, alignItems: 'center', justifyContent: 'center' },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  slotName: { fontSize: 20, fontWeight: '800', color: C.text },
  slotTime: { fontSize: 16, color: C.sub },
  slotSub: { fontSize: 16, color: C.sub },
  state: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  stateText: { fontSize: 16, fontWeight: '800' },
  visit: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  show: { fontSize: 18, fontWeight: '800', color: C.primary, marginTop: 4 },
});
