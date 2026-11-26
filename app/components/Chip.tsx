import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { C } from '../lib/theme';

// 날짜·시간대처럼 "글자만 덩그러니" 있으면 묻히는 표시: 둥근 테두리 상자 안에 넣는다. big은 화면 제목급, small은 좁은 곳,
// solid(색)는 그 화면에서 가장 중요한 표시를 그 색으로 꽉 채운다.
export default function Chip({ text, big, small, solid }: { text: string; big?: boolean; small?: boolean; solid?: string }) {
  return (
    <View style={[styles.box, big && styles.boxBig, small && styles.boxSmall, !!solid && { backgroundColor: solid, borderColor: solid }]}>
      <Text style={[styles.text, big && styles.textBig, small && styles.textSmall, !!solid && { color: '#fff' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'flex-start', backgroundColor: C.card, borderWidth: 1.5, borderColor: C.mist, borderRadius: 17, paddingHorizontal: 12, paddingVertical: 5 },
  boxBig: { borderRadius: 20, paddingHorizontal: 15, paddingVertical: 7 },
  boxSmall: { paddingHorizontal: 8, paddingVertical: 3 },
  textSmall: { fontSize: 15 },
  text: { fontSize: 17, fontWeight: '800', color: C.primary },
  textBig: { fontSize: 20 },
});
