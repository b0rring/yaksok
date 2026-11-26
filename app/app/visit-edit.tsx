import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import { addDays, addVisit, deleteVisit, getVisits, today, updateVisit } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

// 진료 기록 고치기 / 직접 추가 / 지우기. (id가 없으면 새 기록) 날짜는 ‹ › 로 하루씩 옮긴다.
export default function VisitEdit() {
  const router = useRouter();
  const ask = useDialog();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [loaded, setLoaded] = useState(!id);
  const [missing, setMissing] = useState(false);
  const [date, setDate] = useState(today());
  const [hospital, setHospital] = useState('');
  const [reason, setReason] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (!id) return;
    getVisits().then((all) => {
      const v = all.find((x) => x.id === id);
      if (!v) setMissing(true);
      else {
        setDate(v.date);
        setHospital(v.hospital);
        setReason(v.reason);
        setSummary(v.summary);
      }
      setLoaded(true);
    });
  }, [id]);

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/record'));

  const save = async () => {
    if (!hospital.trim()) return ask({ title: '병원 이름을 적어 주세요' });
    const body = { hospital: hospital.trim(), reason: reason.trim(), summary: summary.trim(), date };
    if (id) await updateVisit(String(id), body);
    else await addVisit(body);
    ask({ title: '저장했어요', actions: [{ label: '확인', onPress: back }] });
  };
  const remove = () =>
    ask({
      title: '이 진료 기록을 지울까요?',
      message: '지우면 되돌릴 수 없어요.',
      actions: [
        { label: '지우기', kind: 'danger', onPress: () => deleteVisit(String(id)).then(() => router.navigate('/record')) },
        { label: '취소', kind: 'secondary' },
      ],
    });

  if (!loaded) return null;
  if (missing)
    return (
      <View style={[styles.wrap, { flex: 1, justifyContent: 'center' }]}>
        <Text style={styles.title}>진료 기록을 찾지 못했어요</Text>
        <BigButton label="기록으로" onPress={() => router.navigate('/record')} />
      </View>
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>날짜</Text>
          <View style={styles.dateRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="하루 전" onPress={() => setDate(addDays(date, -1))} style={styles.step}>
              <Text style={styles.stepText}>‹</Text>
            </Pressable>
            <Text style={styles.date}>{md(date)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="하루 뒤" onPress={() => setDate(addDays(date, 1))} style={styles.step}>
              <Text style={styles.stepText}>›</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>병원</Text>
          <TextInput value={hospital} onChangeText={setHospital} placeholder="병원 이름" placeholderTextColor={C.gray} style={styles.input} />
          <Text style={styles.label}>병원에 간 이유</Text>
          <TextInput value={reason} onChangeText={setReason} placeholder="예: 편도염" placeholderTextColor={C.gray} style={styles.input} />
          <Text style={styles.label}>의사 선생님 말씀</Text>
          <TextInput value={summary} onChangeText={setSummary} multiline placeholder="소견·주의할 점" placeholderTextColor={C.gray} style={[styles.input, styles.multi]} />
        </View>
        <BigButton label="저장" onPress={save} />
        {!!id && <BigButton label="이 기록 지우기" variant="secondary" onPress={remove} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: S.gap },
  title: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center' },
  card: { ...CARD, padding: S.pad, gap: S.in },
  label: { fontSize: 18, fontWeight: '800', color: C.green },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.in },
  step: { width: 56, height: 44, borderRadius: 22, backgroundColor: C.soft, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 26, lineHeight: 28, fontWeight: '700', color: C.primary },
  date: { fontSize: 20, fontWeight: '800', color: C.text, flexShrink: 0 },
  input: { minHeight: 56, borderRadius: 16, backgroundColor: C.soft, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, color: C.text },
  multi: { minHeight: 140, textAlignVertical: 'top' },
});
