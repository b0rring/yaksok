import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import BigButton from '../components/BigButton';
import { scanVisit } from '../lib/api';
import { Plan, SLOTS, Visit, addDays, addVisit, getLogs, getPlans, getVisits, today } from '../lib/store';
import { C } from '../lib/theme';

LocaleConfig.locales.ko = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
};
LocaleConfig.defaultLocale = 'ko';

const DOT = { plan: { key: 'plan', color: C.blue }, taken: { key: 'taken', color: C.green }, visit: { key: 'visit', color: C.orange } };

export default function CalendarScreen() {
  const router = useRouter();
  const [sel, setSel] = useState(today());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [logs, setLogs] = useState<{ date: string; slot: string }[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setPlans(await getPlans());
    setLogs(await getLogs());
    setVisits(await getVisits());
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const marks: Record<string, any> = {};
  const dot = (date: string, d: (typeof DOT)[keyof typeof DOT]) => {
    const m = (marks[date] ??= { dots: [] });
    if (!m.dots.some((x: any) => x.key === d.key)) m.dots.push(d);
  };
  for (const p of plans) for (let i = 0; i < p.days; i++) dot(addDays(p.start, i), DOT.plan);
  for (const l of logs) dot(l.date, DOT.taken);
  for (const v of visits) dot(v.date, DOT.visit);
  marks[sel] = { ...marks[sel], selected: true, selectedColor: C.blue };

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
      await load();
      setSel(today());
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
      <Calendar
        markingType="multi-dot"
        markedDates={marks}
        onDayPress={(d) => setSel(d.dateString)}
        theme={{ textDayFontSize: 22, textMonthFontSize: 26, textDayHeaderFontSize: 18, todayTextColor: C.blue, calendarBackground: C.card }}
        style={styles.cal}
      />
      <Text style={styles.legend}>
        <Text style={{ color: C.blue }}>●</Text> 먹을 날  <Text style={{ color: C.green }}>●</Text> 먹은 날  <Text style={{ color: C.orange }}>●</Text> 병원 간 날
      </Text>

      <View style={styles.card}>
        <Text style={styles.title}>{sel}</Text>
        {dayPlans.map((p) => (
          <Text key={p.id} style={styles.body}>
            💊 {p.slots.map((s) => SLOTS.find((x) => x.id === s)?.label).join(', ')} · {p.drugs.join(', ')}
          </Text>
        ))}
        <Text style={styles.body}>✅ 먹은 기록: {dayLogs.length ? dayLogs.join(', ') : '없어요'}</Text>
        {dayVisits.map((v) => (
          <View key={v.id} style={styles.visit}>
            <Text style={styles.hospital}>🏥 {v.hospital}</Text>
            <Text style={styles.body}>{v.summary}</Text>
            <BigButton label="의사에게 보여주기" color={C.orange} small onPress={() => router.push({ pathname: '/show', params: { id: v.id } })} />
          </View>
        ))}
      </View>

      {busy ? <ActivityIndicator size="large" /> : <BigButton label="의견서 사진으로 진료 기록 추가" color={C.gray} small onPress={addRecord} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 16 },
  cal: { borderRadius: 24, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  legend: { fontSize: 18, textAlign: 'center', color: C.sub },
  card: { backgroundColor: C.card, borderRadius: 24, padding: 18, gap: 10, borderWidth: 1, borderColor: C.line },
  title: { fontSize: 26, fontWeight: '900', color: C.text },
  body: { fontSize: 22, lineHeight: 30, color: C.text },
  visit: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line },
  hospital: { fontSize: 24, fontWeight: '800', color: C.orange },
});
