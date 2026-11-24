import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Visit, getVisits } from '../lib/store';
import { C } from '../lib/theme';

// "의사에게 보여주기" 전체 화면. 녹음 직후에는 저장 완료 안내(saved)도 함께 보여준다.
export default function Show() {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const [v, setV] = useState<Visit | null>(null);
  useEffect(() => {
    getVisits().then((all) => setV(all.find((x) => x.id === id) ?? null));
  }, [id]);

  if (!v) return null;
  return (
    <ScrollView contentContainerStyle={styles.wrap} style={{ backgroundColor: C.bg }}>
      {!!saved && <Text style={styles.saved}>✓ 캘린더에 저장했어요</Text>}
      <Text style={styles.date}>{v.date}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, gap: 14, flexGrow: 1 },
  saved: { fontSize: 24, fontWeight: '800', color: C.green },
  date: { fontSize: 40, fontWeight: '900', color: C.text },
  hospital: { fontSize: 44, fontWeight: '900', color: C.orange },
  label: { fontSize: 26, fontWeight: '800', color: C.green, marginTop: 12 },
  big: { fontSize: 36, lineHeight: 52, fontWeight: '700', color: C.text },
  small: { fontSize: 22, lineHeight: 32, color: C.sub },
});
