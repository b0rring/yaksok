import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { C } from '../lib/theme';

// 날짜·시간대처럼 "글자만 덩그러니" 있으면 묻히는 표시: 둥근 테두리 상자 안에 넣는다. big은 화면 제목급, small은 좁은 곳,
// solid(색)는 그 화면에서 가장 중요한 표시를 그 색으로 꽉 채운다.
export default function Chip({ text, big, small, solid, white }: { text: string; big?: boolean; small?: boolean; solid?: string; white?: boolean }) {
  return (
    <View style={[styles.box, big && styles.boxBig, small && styles.boxSmall, !!solid && { backgroundColor: solid, borderColor: solid }, white && { backgroundColor: '#fff' }]}>
      <Text style={[styles.text, big && styles.textBig, small && styles.textSmall, !!solid && { color: '#fff' }]}>{text}</Text>
    </View>
  );
}

// 같은 덩어리지만 성격이 다른 두 정보(날짜 | 시각)를 한 상자 안에서 세로선으로 나눠 보여 준다.
export function SplitChip({ parts }: { parts: string[] }) {
  return (
    <View style={[styles.box, styles.boxSmall, styles.split]}>
      {parts.map((t, i) => (
        <View key={t} style={styles.splitRow}>
          {i > 0 && <View style={styles.splitLine} />}
          <Text style={[styles.text, styles.textSmall]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  splitLine: { width: 1.5, height: 16, backgroundColor: C.border },
  box: { alignSelf: 'flex-start', backgroundColor: C.fill, borderWidth: 0, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5 },
  boxBig: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  boxSmall: { paddingHorizontal: 8, paddingVertical: 3 },
  textSmall: { fontSize: 16 },
  text: { fontSize: 18, fontWeight: '800', color: C.primary },
  textBig: { fontSize: 20 },
});
