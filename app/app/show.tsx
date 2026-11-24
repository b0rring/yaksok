import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Visit, getVisits } from '../lib/store';

export default function Show() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [v, setV] = useState<Visit | null>(null);
  useEffect(() => {
    getVisits().then((all) => setV(all.find((x) => x.id === id) ?? null));
  }, [id]);

  if (!v) return null;
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.date}>{v.date}</Text>
      <Text style={styles.hospital}>{v.hospital}</Text>
      <Text style={styles.label}>병원에 간 이유</Text>
      <Text style={styles.big}>{v.reason}</Text>
      <Text style={styles.label}>의사 선생님 말씀</Text>
      <Text style={styles.big}>{v.summary}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, gap: 16, backgroundColor: '#fff', flexGrow: 1 },
  date: { fontSize: 40, fontWeight: '800' },
  hospital: { fontSize: 44, fontWeight: '800', color: '#E65100' },
  label: { fontSize: 26, fontWeight: '700', color: '#1B5E20', marginTop: 12 },
  big: { fontSize: 36, lineHeight: 52, fontWeight: '600' },
});
