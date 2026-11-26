import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BigButton from '../../components/BigButton';
import { useDialog } from '../../components/Dialog';
import Icon from '../../components/Icon';
import MonthGrid, { DOT_COLOR } from '../../components/MonthGrid';
import { scanVisit } from '../../lib/api';
import { Kind, useCalendarData } from '../../lib/calendarData';
import { SLOTS, addDays, addVisit, today } from '../../lib/store';
import { C, CARD, R, S } from '../../lib/theme';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (s: string) => new Date(`${s}T00:00:00`);
const timeText = (h: number, m: number) => `${h % 12 || 12}:${pad(m)}`;

// 날짜 밑의 점: 먹을 날(빈 동그라미) / 먹은 날(채운 동그라미) / 병원 간 날(주황)
function Dots({ kinds, on }: { kinds: Kind[]; on?: boolean }) {
  return (
    <View style={styles.dots}>
      {kinds.map((k) => (
        <View
          key={k}
          style={[
            styles.dot,
            k === 'plan' && { borderWidth: 2, borderColor: on ? '#fff' : C.primary },
            k === 'taken' && { backgroundColor: on ? '#fff' : C.primary },
            k === 'visit' && { backgroundColor: C.orange },
          ]}
        />
      ))}
    </View>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const ask = useDialog();
  const t = today();
  const [sel, setSel] = useState(t);
  const [month, setMonth] = useState(false); // false = 주간 줄, true = 한 달 보기
  const [ym, setYm] = useState({ y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 });
  const [busy, setBusy] = useState(false);
  const { plans, logs, visits, dots, reload } = useCalendarData();

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
  const goToday = () => {
    setYm({ y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 });
    setSel(t);
  };
  const toggle = () => {
    if (!month) setYm({ y: selD.getFullYear(), m: selD.getMonth() });
    setMonth(!month);
  };

  // 보조 기능: 의견서를 사진으로 직접 추가
  const pick = async (camera: boolean) => {
    const opts = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7 };
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
      return ask({ title: '카메라를 켜 주세요', message: '설정에서 카메라를 허용해 주세요.' });
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    setBusy(true);
    try {
      await addVisit(await scanVisit(res.assets[0].uri));
      await reload();
      goToday();
    } catch {
      ask({ title: '의견서를 읽지 못했어요', message: '잠시 뒤에 다시 해 주세요.' });
    } finally {
      setBusy(false);
    }
  };
  const addRecord = () =>
    ask({
      title: '의견서 사진으로 추가',
      message: '의사 의견서를 찍어 주세요.',
      actions: [
        { label: '사진 찍기', onPress: () => pick(true) },
        { label: '앨범에서 고르기', kind: 'secondary', onPress: () => pick(false) },
        { label: '닫기', kind: 'secondary' },
      ],
    });

  // 고른 날의 타임라인: 시간대별 약 + 병원 방문
  const dayPlans = plans.filter((p) => p.start <= sel && sel <= addDays(p.start, p.days - 1));
  const rows = SLOTS.map((s) => ({
    ...s,
    drugs: [...new Set(dayPlans.filter((p) => p.slots.includes(s.id)).flatMap((p) => p.drugs))],
    taken: logs.some((l) => l.date === sel && l.slot === s.id),
  })).filter((s) => s.drugs.length);
  const dayVisits = visits.filter((v) => v.date === sel);
  const total = rows.length + dayVisits.length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          {month ? (
            <View style={styles.titleRow}>
              <Pressable accessibilityLabel="이전 달" onPress={() => goMonth(-1)} hitSlop={8} style={styles.arrow}>
                <Text style={styles.arrowText}>‹</Text>
              </Pressable>
              <Text style={styles.title}>{ym.y}년 {ym.m + 1}월</Text>
              <Pressable accessibilityLabel="다음 달" onPress={() => goMonth(1)} hitSlop={8} style={styles.arrow}>
                <Text style={styles.arrowText}>›</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.titleRow}>
              <Pressable accessibilityLabel="지난주" onPress={() => setSel(addDays(sel, -7))} hitSlop={8} style={styles.arrow}>
                <Text style={styles.arrowText}>‹</Text>
              </Pressable>
              <Text style={styles.title}>{selD.getMonth() + 1}월 {weekNo}주차</Text>
              <Pressable accessibilityLabel="다음주" onPress={() => setSel(addDays(sel, 7))} hitSlop={8} style={styles.arrow}>
                <Text style={styles.arrowText}>›</Text>
              </Pressable>
            </View>
          )}
          <Pressable accessibilityRole="button" onPress={toggle} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.7 }]}>
            <Text style={styles.pillText}>{month ? '주간 보기' : '월간 보기'}</Text>
          </Pressable>
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
            <View style={styles.strip}>
              {weekDays.map((d) => {
                const on = d === sel;
                return (
                  <Pressable
                    key={d}
                    accessibilityLabel={`${toDate(d).getMonth() + 1}월 ${toDate(d).getDate()}일`}
                    onPress={() => setSel(d)}
                    style={[styles.dayCell, on && styles.dayOn]}
                  >
                    <Text style={[styles.dayWeek, on && { color: '#fff' }]}>{WEEK[toDate(d).getDay()]}</Text>
                    <Text style={[styles.dayNum, on && { color: '#fff' }]}>{toDate(d).getDate()}</Text>
                    <Dots kinds={dots[d] ?? []} on={on} />
                  </Pressable>
                );
              })}
            </View>
            {!!planned.length && (
              <Text style={styles.week}>
                {thisWeek ? '이번 주' : '이 주'} <Text style={styles.weekNum}>{took.length}/{planned.length}일</Text> 복용했어요
              </Text>
            )}
          </>
        )}

        <Text style={styles.dayTitle}>{selD.getDate()}일 {WEEKDAY[selD.getDay()]}</Text>

        {!total && <Text style={styles.empty}>이 날은 약도 기록도 없어요</Text>}

        <View>
          {rows.map((r, i) => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.time}>{timeText(r.hour, r.minute)}</Text>
              <View style={styles.nodeCol}>
                {r.taken ? (
                  <View style={[styles.node, { backgroundColor: C.primary }]}>
                    <Icon name="check" size={20} color="#fff" stroke={3} />
                  </View>
                ) : (
                  <View style={[styles.node, styles.nodeTodo, sel > t && { borderColor: C.gray }]} />
                )}
                {(i < rows.length - 1 || dayVisits.length > 0) && <View style={styles.line} />}
              </View>
              <View style={[styles.item, CARD]}>
                <Text style={styles.itemTitle}>{r.label} 약</Text>
                <Text style={styles.itemSub}>{r.drugs.join('\n')}</Text>
              </View>
            </View>
          ))}
          {dayVisits.map((v, i) => (
            <View key={v.id} style={styles.row}>
              <Text style={styles.time}>진료</Text>
              <View style={styles.nodeCol}>
                <View style={[styles.node, styles.nodeVisit]} />
                {i < dayVisits.length - 1 && <View style={styles.line} />}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/show', params: { id: v.id } })}
                style={({ pressed }) => [styles.item, styles.itemVisit, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.itemTitle}>{v.hospital}</Text>
                <Text style={styles.itemSub} numberOfLines={2}>{v.summary}</Text>
                <Text style={styles.show}>의사에게 보여주기 ›</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {busy ? <ActivityIndicator size="large" color={C.primary} /> : <BigButton label="의견서 사진으로 진료 기록 추가" variant="secondary" small onPress={addRecord} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const NODE = 36;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { paddingHorizontal: S.page, paddingTop: 8, paddingBottom: 32, gap: S.gap },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  arrow: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32, lineHeight: 36, fontWeight: '700', color: C.sub },
  pill: { minHeight: 48, paddingHorizontal: 18, borderRadius: 24, borderWidth: 2, borderColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 20, fontWeight: '800', color: C.primary },
  card: { ...CARD, padding: S.pad, gap: 14 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 18, color: C.sub },
  strip: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 32, gap: 4 },
  dayOn: { backgroundColor: C.primary },
  dayWeek: { fontSize: 18, fontWeight: '700', color: C.sub },
  dayNum: { fontSize: 26, fontWeight: '800', color: C.text },
  dots: { height: 12, flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  week: { fontSize: 22, color: C.sub },
  weekNum: { fontWeight: '800', color: C.primary },
  dayTitle: { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 8 },
  empty: { fontSize: 22, color: C.sub, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  time: { width: 64, paddingTop: 14, paddingRight: 8, textAlign: 'right', fontSize: 20, fontWeight: '700', color: C.sub },
  nodeCol: { width: NODE + 12, alignItems: 'center', paddingTop: 10 },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center' },
  nodeTodo: { backgroundColor: '#fff', borderWidth: 6, borderColor: C.orange },
  nodeVisit: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.text, marginTop: 4 },
  line: { flex: 1, width: 3, backgroundColor: C.mist, marginTop: 4, marginBottom: -10 },
  item: { flex: 1, padding: 18, marginBottom: 14, gap: 4 },
  itemVisit: { backgroundColor: C.soft, borderRadius: R.card },
  itemTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  itemSub: { fontSize: 20, lineHeight: 28, color: C.sub },
  show: { fontSize: 20, fontWeight: '800', color: C.primary, marginTop: 6 },
});
