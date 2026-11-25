import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BigButton from '../../components/BigButton';
import MonthGrid, { DOT_COLOR } from '../../components/MonthGrid';
import { scanVisit } from '../../lib/api';
import { useCalendarData } from '../../lib/calendarData';
import { SLOTS, addDays, addVisit, today } from '../../lib/store';
import { C, R } from '../../lib/theme';

const WEEKDAY = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const dayTitle = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY[d.getDay()]}`;
};

export default function CalendarScreen() {
  const router = useRouter();
  const t = today();
  const [sel, setSel] = useState(t);
  const [ym, setYm] = useState({ y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 });
  const [busy, setBusy] = useState(false);
  const { plans, logs, visits, dots, reload } = useCalendarData();

  const go = (delta: number) =>
    setYm(({ y, m }) => {
      const n = new Date(y, m + delta, 1);
      return { y: n.getFullYear(), m: n.getMonth() };
    });
  const goToday = () => {
    setYm({ y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 });
    setSel(t);
  };

  // 보조 기능: 의견서를 사진으로 직접 추가
  const pick = async (camera: boolean) => {
    const opts = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7 };
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
      return Alert.alert('카메라를 켜 주세요', '설정에서 카메라를 허용해 주세요.');
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    setBusy(true);
    try {
      await addVisit(await scanVisit(res.assets[0].uri));
      await reload();
      goToday();
    } catch {
      Alert.alert('의견서를 읽지 못했어요', '잠시 뒤에 다시 해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  const addRecord = () =>
    Alert.alert('의견서 사진으로 추가', '의사 의견서를 찍어 주세요.', [
      { text: '사진 찍기', onPress: () => pick(true) },
      { text: '앨범에서 고르기', onPress: () => pick(false) },
      { text: '취소', style: 'cancel' },
    ]);

  const dayPlans = plans.filter((p) => p.start <= sel && sel <= addDays(p.start, p.days - 1));
  const dayLogs = logs.filter((l) => l.date === sel).map((l) => SLOTS.find((s) => s.id === l.slot)?.label);
  const dayVisits = visits.filter((v) => v.date === sel);

  return (
    <ScrollView contentContainerStyle={styles.wrap} style={{ backgroundColor: C.bg }}>
      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.month}>{ym.y}년 {ym.m + 1}월</Text>
          <View style={styles.nav}>
            <Pressable accessibilityLabel="이전 달" onPress={() => go(-1)} style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}>
              <Text style={styles.arrow}>‹</Text>
            </Pressable>
            <Pressable accessibilityLabel="오늘로" onPress={goToday} style={({ pressed }) => [styles.navBtn, styles.todayBtn, pressed && { opacity: 0.6 }]}>
              <Text style={styles.todayText}>오늘</Text>
            </Pressable>
            <Pressable accessibilityLabel="다음 달" onPress={() => go(1)} style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          </View>
        </View>
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

      <View style={styles.card}>
        <Text style={styles.title}>{dayTitle(sel)}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>먹을 약</Text>
          {dayPlans.length ? (
            dayPlans.map((p) => (
              <View key={p.id}>
                <Text style={styles.value}>{p.slots.map((s) => SLOTS.find((x) => x.id === s)?.label).join(' · ')}</Text>
                <Text style={styles.sub}>{p.drugs.join(', ')}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.sub}>이 날은 먹을 약이 없어요</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>먹은 기록</Text>
          <Text style={dayLogs.length ? styles.value : styles.sub}>{dayLogs.length ? dayLogs.join(' · ') : '아직 없어요'}</Text>
        </View>

        {dayVisits.map((v) => (
          <View key={v.id} style={styles.section}>
            <Text style={styles.label}>병원 방문</Text>
            <Text style={styles.hospital}>{v.hospital}</Text>
            <Text style={styles.sub}>{v.summary}</Text>
            <View style={{ marginTop: 8 }}>
              <BigButton label="의사에게 보여주기" small onPress={() => router.push({ pathname: '/show', params: { id: v.id } })} />
            </View>
          </View>
        ))}
      </View>

      {busy ? <ActivityIndicator size="large" color={C.primary} /> : <BigButton label="의견서 사진으로 진료 기록 추가" variant="secondary" small onPress={addRecord} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 16 },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 16, gap: 12, borderWidth: 1, borderColor: C.line },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontSize: 26, fontWeight: '900', color: C.text },
  nav: { flexDirection: 'row', gap: 8 },
  navBtn: { minWidth: 44, height: 44, borderRadius: R.ctl, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  arrow: { fontSize: 28, lineHeight: 32, fontWeight: '700', color: C.text },
  todayBtn: { paddingHorizontal: 12 },
  todayText: { fontSize: 18, fontWeight: '800', color: C.primary },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 18, color: C.sub },
  title: { fontSize: 26, fontWeight: '900', color: C.text },
  section: { gap: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line },
  label: { fontSize: 18, fontWeight: '800', color: C.primary },
  value: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 20, lineHeight: 28, color: C.sub },
  hospital: { fontSize: 24, fontWeight: '800', color: C.text },
});
