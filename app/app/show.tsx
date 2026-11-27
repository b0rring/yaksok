import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import ScreenTitle from '../components/ScreenTitle';
import BigButton from '../components/BigButton';
import Icon from '../components/Icon';
import SpeakButton from '../components/SpeakButton';
import { Visit, getVisits } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

// 한 덩어리 글을 문장 단위 점 목록으로 (이미 줄이 나뉘어 있으면 줄 단위)
const points = (t: string) =>
  t
    .split(/\n+|(?<=[.!?])\s+/)
    .map((x) => x.replace(/^[-•·]\s*/, '').trim())
    .filter(Boolean);

// 진료 기록 보기. "크게 보여주기"를 누르면 의사 선생님께 보여드리기 좋게 아주 큰 글자로 바뀐다. 녹음 직후에는 저장 완료 안내(saved)도 보여준다.
export default function Show() {
  const router = useRouter();
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const [v, setV] = useState<Visit | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [big, setBig] = useState(false);
  const [text, setText] = useState(false); // 받아쓴 글 펼침
  useEffect(() => {
    getVisits().then((all) => {
      setV(all.find((x) => x.id === id) ?? null);
      setLoaded(true);
    });
  }, [id]);

  if (!loaded) return null;
  if (!v)
    return (
      <View style={[styles.outer, { flex: 1, justifyContent: 'center', gap: 16, backgroundColor: C.page }]}>
        <Text style={styles.bigText}>진료 기록을 찾지 못했어요</Text>
        <BigButton label="홈으로" onPress={() => router.navigate('/')} />
      </View>
    );
  const date = v.date.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, '$1년 $2월 $3일');
  const speak = `${v.hospital}. 병원에 간 이유: ${v.reason}. 의사 선생님 말씀: ${v.summary}`;

  if (big)
    return (
      <ScrollView style={{ backgroundColor: C.page }} contentContainerStyle={styles.outer}>
        <View style={styles.bigCard}>
          <Text style={styles.bigDate}>{date}</Text>
          <Text style={styles.bigHospital}>{v.hospital}</Text>
          <Text style={styles.bigLabel}>병원에 간 이유</Text>
          <Text style={styles.bigText}>{v.reason}</Text>
          <Text style={styles.bigLabel}>의사 선생님 말씀</Text>
          <Text style={styles.bigText}>{v.summary}</Text>
        </View>
        <View style={{ marginTop: S.gap }}>
          <BigButton label="작게 보기" variant="secondary" onPress={() => setBig(false)} />
        </View>
      </ScrollView>
    );

  return (
    <ScrollView style={{ backgroundColor: C.page }} contentContainerStyle={styles.outer}>
<ScreenTitle text="진료 기록" />
      {!!saved && (
        <View accessibilityRole="alert" style={styles.done}>
          <View style={styles.doneIcon}>
            <Icon name="check" size={22} color="#fff" stroke={3} />
          </View>
          <Text style={styles.doneText}>캘린더에 저장했어요</Text>
        </View>
      )}
      <View style={{ gap: 10, marginTop: -8 }}>
        <View style={styles.dateChip}>
          <Icon name="calendar" size={18} color={C.primary} stroke={2.4} />
          <Text style={styles.dateText}>{date}</Text>
        </View>
        <Text style={styles.hospital}>{v.hospital}</Text>
      </View>
      <BigButton label="크게 보여주기" icon="person" onPress={() => setBig(true)} />

      <View style={styles.card}>
        <Text style={styles.label}>병원에 간 이유</Text>
        <Text style={styles.reason}>{v.reason}</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Icon name="person" size={22} color={C.primary} />
          <Text style={[styles.label, { color: C.primary }]}>의사 선생님 말씀</Text>
        </View>
        <View style={{ gap: 10 }}>
          {points(v.summary).map((l, i) => (
            <View key={i} style={styles.line}>
              <View style={styles.bullet} />
              <Text style={styles.say}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
      {!!v.transcript && (
        <View style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: text }} onPress={() => setText((o) => !o)} style={styles.fold}>
            <Text style={[styles.label, { color: C.primary }]}>녹음 내용 (받아쓴 글)</Text>
            <Icon name={text ? 'up' : 'down'} size={24} color={C.primary} />
          </Pressable>
          {text && <Text style={styles.transcript}>{v.transcript}</Text>}
        </View>
      )}
      <View style={styles.pair}>
        <View style={{ flex: 1 }}>
          <SpeakButton wide text={speak} />
        </View>
        <View style={{ flex: 1 }}>
          <BigButton label="고치기" icon="edit" variant="secondary" onPress={() => router.push({ pathname: '/visit-edit', params: { id: v.id } })} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outer: { padding: S.page, paddingBottom: 40, gap: 28 },
  done: { minHeight: 64, borderRadius: 18, backgroundColor: C.done, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F7A60', alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: 20, fontWeight: '800', color: '#2F5A43' },
  dateChip: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, backgroundColor: C.fill, paddingHorizontal: 10, paddingVertical: 3 },
  dateText: { fontSize: 16, fontWeight: '800', color: C.primary },
  hospital: { fontSize: 30, lineHeight: 40, fontWeight: '900', color: C.text },
  card: { ...CARD, padding: S.pad, gap: 16 },
  label: { fontSize: 18, fontWeight: '800', color: C.sub },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reason: { fontSize: 22, lineHeight: 32, fontWeight: '800', color: C.text, marginTop: -8 },
  line: { flexDirection: 'row', gap: 10 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginTop: 12 },
  say: { flex: 1, fontSize: 20, lineHeight: 30, color: C.text },
  fold: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  transcript: { fontSize: 18, lineHeight: 28, color: C.sub },
  pair: { flexDirection: 'row', gap: 10 },
  // 크게 보여주기
  bigCard: { ...CARD, padding: S.pad, gap: S.in },
  bigDate: { fontSize: 34, fontWeight: '800', color: C.text },
  bigHospital: { fontSize: 36, fontWeight: '800', color: C.text },
  bigLabel: { fontSize: 22, fontWeight: '800', color: C.green, marginTop: 12 },
  bigText: { fontSize: 30, lineHeight: 44, fontWeight: '700', color: C.text },
});
