import { Pressable, StyleSheet, Text } from 'react-native';
import { C } from '../lib/theme';

type Props = { label: string; onPress: () => void; color?: string; small?: boolean };

export default function BigButton({ label, onPress, color = C.green, small }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.small,
        { backgroundColor: color, transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <Text style={[styles.label, small && styles.smallLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  label: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  small: { minHeight: 64, borderRadius: 18 },
  smallLabel: { fontSize: 24 },
});
