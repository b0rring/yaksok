import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { C, S } from '../lib/theme';

// 모든 탭 맨 위의 제목: 왼쪽 정렬, 탭 이름과 같은 글, 오른쪽에는 필요할 때만 버튼. 첫 구역과는 가깝게(wrap의 구역 간격을 되돌림).
export default function TabTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: -S.gap },
  title: { fontSize: 30, fontWeight: '800', color: C.text },
});
