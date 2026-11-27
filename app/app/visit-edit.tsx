import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import ScreenTitle from '../components/ScreenTitle';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import Icon from '../components/Icon';
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
<ScreenTitle text="진료 기록 고치기" />
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>날짜</Text>
            <View style={styles.dateRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="하루 줄이기" onPress={() => setDate(addDays(date, -1))} style={styles.step}>
                <Icon name="minus" size={28} color={C.primary} stroke={2.6} />
              </Pressable>
              <Text style={styles.date}>{md(date)}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="하루 늘리기" onPress={() => setDate(addDays(date, 1))} style={styles.step}>
                <Icon name="plus" size={28} color={C.primary} stroke={2.6} />
              </Pressable>
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>병원</Text>
            <TextInput value={hospital} onChangeText={setHospital} placeholder="병원 이름" placeholderTextColor={C.gray} style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>병원에 간 이유</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="예: 편도염" placeholderTextColor={C.gray} style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>의사 선생님 말씀</Text>
            <TextInput value={summary} onChangeText={setSummary} multiline placeholder="주의할 점을 적어 주세요" placeholderTextColor={C.gray} style={[styles.input, styles.multi]} />
          </View>
        </View>
        <BigButton label="저장" icon="check" onPress={save} />
        {!!id && (
          <Pressable accessibilityRole="button" onPress={remove} style={({ pressed }) => [styles.del, pressed && { opacity: 0.6 }]}>
            <Text style={styles.delText}>이 기록 지우기</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: 28 },
  title: { fontSize: 22, fontWeight: '800', color: C.text, textAlign: 'center' },
  card: { ...CARD, padding: S.pad, gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 18, fontWeight: '800', color: C.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  date: { flex: 1, textAlign: 'center', fontSize: 26, fontWeight: '900', color: C.text },
  input: { minHeight: 56, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, color: C.text },
  multi: { minHeight: 140, lineHeight: 28, textAlignVertical: 'top' },
  del: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  delText: { fontSize: 20, fontWeight: '800', color: C.red },
});
