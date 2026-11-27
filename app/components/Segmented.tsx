import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { C } from '../lib/theme';

// 둘 이상 중 하나를 고르는 붙은 막대: 연초록 알약 막대 안에서 고른 쪽이 흰색으로 올라온다.
export default function Segmented<T extends string | number>({ options, value, onPick, big }: { options: readonly { id: T; label: string }[]; value: T; onPick: (v: T) => void; big?: boolean }) {
  return (
    <View accessibilityRole="tablist" style={[styles.bar, big && { borderRadius: 30 }]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={String(o.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onPick(o.id)} style={[styles.item, big && { minHeight: 52, borderRadius: 26 }, on && styles.on]}>
            <Text style={[styles.text, on && { color: C.primary, fontWeight: '800' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 28, backgroundColor: C.fill },
  item: { flex: 1, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  on: { backgroundColor: '#fff', shadowColor: '#1E3A2F', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  text: { fontSize: 18, fontWeight: '700', color: C.sub },
});
