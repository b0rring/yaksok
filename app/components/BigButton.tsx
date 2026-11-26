import { Pressable, StyleSheet, Text } from 'react-native';
import { C } from '../lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  color?: string; // 으뜸 버튼 색을 바꿀 때만 (끝내기=빨강, 완료=회색)
  variant?: 'primary' | 'secondary';
  small?: boolean;
};

// 한 화면에 으뜸(채운) 버튼은 하나, 나머지는 secondary.
export default function BigButton({ label, onPress, color = C.primary, variant = 'primary', small }: Props) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.small,
        secondary ? styles.secondary : { backgroundColor: color },
        { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <Text style={[styles.label, small && styles.smallLabel, secondary && { color: C.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondary: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  label: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center' },
  small: { minHeight: 64 },
  smallLabel: { fontSize: 22 },
});
