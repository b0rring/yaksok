import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ScanResult } from '../lib/api';

const rows = [
  ['효과', 'effect'],
  ['먹는 법', 'how'],
  ['조심할 점', 'caution'],
  ['같이 먹으면 안 되는 약', 'avoid'],
] as const;

export default function Result() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const { drugs, source }: ScanResult = JSON.parse(data);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {drugs.map((d) => (
        <View key={d.name} style={styles.card}>
          <Text style={styles.name}>{d.name}</Text>
          {rows.map(([label, key]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.body}>{d[key]}</Text>
            </View>
          ))}
        </View>
      ))}
      <Text style={styles.source}>출처: {source}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 20, backgroundColor: '#fff' },
  card: { borderWidth: 2, borderColor: '#1B5E20', borderRadius: 20, padding: 20, gap: 14 },
  name: { fontSize: 30, fontWeight: '800' },
  row: { gap: 4 },
  label: { fontSize: 20, fontWeight: '700', color: '#1B5E20' },
  body: { fontSize: 22, lineHeight: 32 },
  source: { fontSize: 18, color: '#444', textAlign: 'center' },
});
