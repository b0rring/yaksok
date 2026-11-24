import { Pressable, StyleSheet, Text } from 'react-native';

type Props = { label: string; onPress: () => void; color?: string };

export default function BigButton({ label, onPress, color = '#1B5E20' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { backgroundColor: color, opacity: pressed ? 0.8 : 1 }]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 96, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  label: { color: '#fff', fontSize: 30, fontWeight: '700' },
});
