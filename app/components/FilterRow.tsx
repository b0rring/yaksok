import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { C } from '../lib/theme';

// 목록을 걸러 보는 칩 줄: 한 줄에 "이름표 + 가로로 넘기는 칩들". 고른 칩은 초록으로 채우고, 안 고른 칩은 연한 바탕(테두리 없음).
// 칩은 눈에 보이는 높이 36이지만 위아래 4씩 더 눌려서 누르는 면은 44를 지킨다. 자리를 적게 차지한다.
export default function FilterRow<T extends string>({ label, options, value, onPick }: { label: string; options: { id: T; label: string }[]; value: T; onPick: (id: T) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable key={o.id} accessibilityRole="button" accessibilityState={{ selected: on }} hitSlop={{ top: 4, bottom: 4 }} onPress={() => onPick(o.id)} style={({ pressed }) => [styles.chip, on && styles.on, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.text, on && { color: '#fff' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// 필터 줄들을 목록과 구분해 한 상자로 묶는다 (연초록 바탕)
export const FilterBox = ({ children }: { children: ReactNode }) => <View style={styles.box}>{children}</View>;

const styles = StyleSheet.create({
  box: { backgroundColor: C.soft, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 16, fontWeight: '800', color: C.sub },
  chips: { gap: 8, alignItems: 'center' },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: C.primary },
  text: { fontSize: 16, fontWeight: '800', color: C.text },
});
