import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import Chip from '../components/Chip';
import SpeakButton from '../components/SpeakButton';
import { Visit, getVisits } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

// "의사에게 보여주기" 전체 화면. 녹음 직후에는 저장 완료 안내(saved)도 함께 보여준다.
export default function Show() {
  const router = useRouter();
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const [v, setV] = useState<Visit | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    getVisits().then((all) => {
      setV(all.find((x) => x.id === id) ?? null);
      setLoaded(true);
    });
  }, [id]);

  if (!loaded) return null;
  if (!v)
    return (
      <View style={[styles.outer, { flex: 1, justifyContent: 'center', gap: 16, backgroundColor: C.bg }]}>
        <Text style={styles.big}>진료 기록을 찾지 못했어요</Text>
        <BigButton label="홈으로" onPress={() => router.navigate('/')} />
      </View>
    );
  const speak = `${v.hospital}. 병원에 간 이유: ${v.reason}. 의사 선생님 말씀: ${v.summary}`;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <ScrollView contentContainerStyle={styles.outer}>
      <View style={styles.wrap}>
      {!!saved && <Text style={styles.saved}>✓ 캘린더에 저장했어요</Text>}
      <Chip big text={v.date.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, '$1년 $2월 $3일')} />
      <Text style={styles.hospital}>{v.hospital}</Text>
      <Text style={styles.label}>병원에 간 이유</Text>
      <Text style={styles.big}>{v.reason}</Text>
      <Text style={styles.label}>의사 선생님 말씀</Text>
      <Text style={styles.big}>{v.summary}</Text>
      {!!v.transcript && (
        <>
          <Text style={styles.label}>녹음 내용 (받아쓴 글)</Text>
          <Text style={styles.small}>{v.transcript}</Text>
        </>
      )}
      </View>
      <View style={{ marginTop: S.gap }}>
        <BigButton label="홈으로" variant="secondary" small onPress={() => router.navigate('/')} />
      </View>
    </ScrollView>
    <SpeakButton text={speak} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { padding: S.page, paddingBottom: 102 },
  wrap: { ...CARD, padding: S.pad, gap: S.in },
  saved: { fontSize: 20, fontWeight: '800', color: C.green },
  date: { fontSize: 34, fontWeight: '800', color: C.text },
  hospital: { fontSize: 36, fontWeight: '800', color: C.text },
  label: { fontSize: 22, fontWeight: '800', color: C.green, marginTop: 12 },
  big: { fontSize: 30, lineHeight: 44, fontWeight: '700', color: C.text },
  small: { fontSize: 18, lineHeight: 28, color: C.sub },
});
