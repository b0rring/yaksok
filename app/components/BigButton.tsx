import { Pressable, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { C } from '../lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  color?: string; // 으뜸 버튼 색을 바꿀 때만 (끝내기=빨강, 완료=회색)
  variant?: 'primary' | 'secondary';
  small?: boolean;
};

// 한 화면에 으뜸(채운) 버튼은 하나, 나머지는 secondary. 크기는 모든 버튼이 같다(높이 54·글자 20). small은 옛 호출 호환용으로 무시한다.
export default function BigButton({ label, onPress, color = C.primary, variant = 'primary' }: Props) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        secondary ? styles.secondary : { backgroundColor: color },
        { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <Text style={[styles.label, secondary && { color: C.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  // 버튼은 채운 바탕: 흰 바탕+테두리인 카드와 한눈에 구별된다 (으뜸 버튼=진한 초록, 보조 버튼=연초록)
  secondary: { backgroundColor: C.fill },
  label: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
});
