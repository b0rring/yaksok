import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import BigButton from '../components/BigButton';
import { scanVisit } from '../lib/api';
import { Plan, SLOTS, Visit, addVisit, getLogs, getPlan, getVisits, today } from '../lib/store';

LocaleConfig.locales.ko = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
};
LocaleConfig.defaultLocale = 'ko';

const TAKEN = { key: 'taken', color: '#1B5E20' };
const VISIT = { key: 'visit', color: '#E65100' };

export default function CalendarScreen() {
  const router = useRouter();
  const [sel, setSel] = useState(today());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [logs, setLogs] = useState<{ date: string; slot: string }[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setPlan(await getPlan());
    setLogs(await getLogs());
    setVisits(await getVisits());
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const marks: Record<string, any> = {};
  for (const l of logs) (marks[l.date] ??= { dots: [] }).dots.push(TAKEN);
  for (const v of visits) (marks[v.date] ??= { dots: [] }).dots.push(VISIT);
  marks[sel] = { ...marks[sel], selected: true, selectedColor: '#0D47A1' };

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
    Alert.alert('진료 기록 추가', '의사 의견서를 찍어 주세요.', [
      { text: '사진 찍기', onPress: () => pick(true) },
      { text: '앨범에서 고르기', onPress: () => pick(false) },
      { text: '취소', style: 'cancel' },
    ]);

  const dayLogs = logs.filter((l) => l.date === sel).map((l) => SLOTS.find((s) => s.id === l.slot)?.label);
  const dayVisits = visits.filter((v) => v.date === sel);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Calendar
        markingType="multi-dot"
        markedDates={marks}
        onDayPress={(d) => setSel(d.dateString)}
        theme={{ textDayFontSize: 22, textMonthFontSize: 26, textDayHeaderFontSize: 18, todayTextColor: '#0D47A1' }}
      />
      <Text style={styles.legend}>● 초록: 약 먹은 날   ● 주황: 병원 간 날</Text>

      <View style={styles.card}>
        <Text style={styles.title}>{sel}</Text>
        {plan && <Text style={styles.body}>먹을 약: {plan.slots.map((s) => SLOTS.find((x) => x.id === s)?.label).join(', ')}</Text>}
        <Text style={styles.body}>먹은 기록: {dayLogs.length ? dayLogs.join(', ') : '없어요'}</Text>
        {dayVisits.map((v) => (
          <BigButton
            key={v.id}
            label={`${v.hospital} · 의사에게 보여주기`}
            color="#E65100"
            onPress={() => router.push({ pathname: '/show', params: { id: v.id } })}
          />
        ))}
      </View>

      {busy ? <ActivityIndicator size="large" /> : <BigButton label="진료 기록 추가" color="#0D47A1" onPress={addRecord} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 16, backgroundColor: '#fff' },
  legend: { fontSize: 18, textAlign: 'center', color: '#333' },
  card: { borderWidth: 2, borderColor: '#0D47A1', borderRadius: 20, padding: 16, gap: 10 },
  title: { fontSize: 26, fontWeight: '800' },
  body: { fontSize: 22, lineHeight: 30 },
});
