import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import { Drug, organizeDrugs } from '../lib/api';
import { syncNotifications } from '../lib/notify';
import { getPlans, updatePlan } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const FIELDS = [
  ['effect', '효과 (무엇에 쓰는 약인가요?)'],
  ['how', '먹는 법'],
  ['caution', '조심할 점'],
  ['avoid', '같이 먹으면 안 되는 약'],
] as const;
const blank = (name = ''): Drug => ({ name, effect: '', how: '', caution: '', avoid: '' });
const wrote = (d: Drug) => [d.effect, d.how, d.caution, d.avoid].some((t) => t.trim());

// 내 약 고치기: 병명과 약 정보를 직접 고친다. "AI로 정리하기"는 지금 적은 내용(약 이름 등)을 바탕으로 빈 칸만 쉬운 말로 채운다.
export default function Edit() {
  const router = useRouter();
  const ask = useDialog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orig, setOrig] = useState(''); // 처음 병명 (바뀌면 "AI 짐작" 표시를 뗀다)
  const [guess, setGuess] = useState(false);
  const [found, setFound] = useState<boolean | null>(null);
  const [condition, setCondition] = useState('');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [busy, setBusy] = useState(false);
  const [hospital, setHospital] = useState('');
  const [pharmacy, setPharmacy] = useState('');
  const [date, setDate] = useState(''); // 조제일 YYYY-MM-DD
  const [metaOrig, setMetaOrig] = useState(''); // 처음 값(바뀌면 "AI가 읽음" 표시를 뗀다)
  const [metaAi, setMetaAi] = useState(false);

  useEffect(() => {
    getPlans().then((all) => {
      const p = all.find((x) => x.id === id);
      setFound(!!p);
      if (!p) return;
      setOrig(p.condition ?? '');
      setCondition(p.condition ?? '');
      setGuess(!!p.guess);
      setHospital(p.hospital ?? '');
      setPharmacy(p.pharmacy ?? '');
      setDate(p.prescribedOn ?? '');
      setMetaOrig(`${p.hospital ?? ''}|${p.pharmacy ?? ''}|${p.prescribedOn ?? ''}`);
      setMetaAi(!!p.metaAi);
      setDrugs(p.drugs.map((n) => p.info?.find((d) => d.name === n) ?? blank(n)));
    });
  }, [id]);

  // 설명 글을 고치면 "직접 적은 설명"이 된다 (AI가 쓴 글을 고치면 둘이 섞인 것). 이름만 바꾸면 공식 설명은 맞지 않으니 뗀다.
  const edit = (i: number, patch: Partial<Drug>) =>
    setDrugs((all) => all.map((d, k) => (k === i ? { ...d, ...patch, by: d.by === 'ai' ? 'mix' : 'user' } : d)));
  const rename = (i: number, name: string) =>
    setDrugs((all) => all.map((d, k) => (k === i ? { ...d, name, official: null } : d)));

  const organize = async () => {
    const list = drugs.filter((d) => d.name.trim());
    if (!list.length) return ask({ title: '약 이름을 적어 주세요', message: '이름을 바탕으로 정리해요.' });
    setBusy(true);
    try {
      const r = await organizeDrugs(condition, list);
      setDrugs(
        list.map((d) => {
          const a = r.drugs.find((x) => x.name === d.name.trim());
          if (!a) return d;
          return { ...a, by: wrote(d) && d.by !== 'ai' ? 'mix' : 'ai' };
        }),
      );
      ask({ title: 'AI가 정리했어요', message: '비어 있던 칸을 채웠어요.\n틀린 곳이 없는지 읽어 보고 고쳐 주세요.' });
    } catch {
      ask({ title: '정리하지 못했어요', message: '잠시 뒤에 다시 눌러 주세요.' });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const list = drugs.map((d) => ({ ...d, name: d.name.trim() })).filter((d) => d.name);
    if (!list.length) return ask({ title: '약이 하나는 있어야 해요', message: '약 이름을 적어 주세요.' });
    const c = condition.trim();
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ? date.trim() : '';
    const meta = { hospital: hospital.trim(), pharmacy: pharmacy.trim(), prescribedOn: dateOk };
    await updatePlan(String(id), { condition: c, guess: guess && c === orig, drugs: list.map((d) => d.name), info: list, ...meta, metaAi: metaAi && `${meta.hospital}|${meta.pharmacy}|${meta.prescribedOn}` === metaOrig });
    syncNotifications().catch(() => {}); // 알림에 적힌 약 이름도 새로 맞춘다
    ask({ title: '저장했어요', actions: [{ label: '확인', onPress: () => (router.canGoBack() ? router.back() : router.navigate('/drugs')) }] });
  };

  if (found === null) return null;
  if (!found)
    return (
      <View style={[styles.wrap, { flex: 1, justifyContent: 'center', backgroundColor: C.bg }]}>
        <Text style={styles.title}>약을 찾지 못했어요</Text>
        <BigButton label="내 약으로" onPress={() => router.navigate('/drugs')} />
      </View>
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>무슨 병·증상 때문에 받은 약인가요?</Text>
          <TextInput value={condition} onChangeText={setCondition} placeholder="예: 편도염" placeholderTextColor={C.gray} style={styles.input} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>처방받은 병원</Text>
          <TextInput value={hospital} onChangeText={setHospital} placeholder="병원 이름 (모르면 비워 두세요)" placeholderTextColor={C.gray} style={styles.input} />
          <Text style={styles.label}>조제한 약국</Text>
          <TextInput value={pharmacy} onChangeText={setPharmacy} placeholder="약국 이름" placeholderTextColor={C.gray} style={styles.input} />
          <Text style={styles.label}>조제일</Text>
          <TextInput value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="예: 2026-11-27" placeholderTextColor={C.gray} style={styles.input} />
        </View>

        {drugs.map((d, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.label}>약 이름</Text>
            <TextInput value={d.name} onChangeText={(t) => rename(i, t)} placeholder="약 이름" placeholderTextColor={C.gray} style={styles.input} />
            {FIELDS.map(([k, label]) => (
              <View key={k} style={{ gap: 5 }}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  value={d[k]}
                  onChangeText={(t) => edit(i, { [k]: t })}
                  multiline
                  placeholder="비워 두고 AI로 정리해도 돼요"
                  placeholderTextColor={C.gray}
                  style={[styles.input, styles.multi]}
                />
              </View>
            ))}
            {drugs.length > 1 && <BigButton label="이 약 빼기" variant="secondary" small onPress={() => setDrugs((all) => all.filter((_, k) => k !== i))} />}
          </View>
        ))}

        <BigButton label="약 더 적기" variant="secondary" small onPress={() => setDrugs((all) => [...all, blank()])} />
        <BigButton label={busy ? 'AI가 정리하는 중…' : 'AI로 정리하기'} color={C.ai} onPress={busy ? () => {} : organize} />
        <Text style={styles.hint}>지금 적은 내용을 바탕으로 빈 칸만 채워요. 이미 적은 글은 바꾸지 않아요. AI가 쓴 내용은 틀릴 수 있어요.</Text>
        <BigButton label="저장" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 52, gap: S.gap },
  title: { fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'center' },
  card: { ...CARD, padding: S.pad, gap: 12 },
  label: { fontSize: 18, fontWeight: '800', color: C.green },
  input: { minHeight: 52, borderRadius: 12, backgroundColor: C.soft, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, color: C.text },
  multi: { minHeight: 76, textAlignVertical: 'top' },
  hint: { fontSize: 16, lineHeight: 24, color: C.sub, textAlign: 'center' },
});
