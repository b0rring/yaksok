import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Kind } from '../lib/calendarData';
import { C } from '../lib/theme';

export const DOT_COLOR: Record<Kind, string> = { plan: C.gray, taken: C.primary, visit: C.orange };
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');

type Props = {
  year: number;
  month: number; // 0~11
  dots: Record<string, Kind[]>;
  todayStr: string;
  selected?: string;
  onSelect?: (date: string) => void; // 없으면 보기만 (홈 미리보기)
};

// 달력 한 달. 숫자는 항상 같은 크기의 원 안 가운데에, 점은 원 바로 아래 고정 칸에 둔다.
export default function MonthGrid({ year, month, dots, todayStr, selected, onSelect }: Props) {
  const lead = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));

  return (
    <View>
      <View style={styles.row}>
        {WEEK.map((w, i) => (
          <View key={w} style={styles.cell}>
            <Text style={[styles.week, i === 0 && { color: C.red }, i === 6 && { color: C.blue }]}>{w}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((d, c) => {
            if (!d) return <View key={c} style={styles.cell} />;
            const date = `${year}-${pad(month + 1)}-${pad(d)}`;
            const isSel = date === selected;
            const isToday = date === todayStr;
            const kinds = dots[date] ?? [];
            const body = (
              <>
                <View style={[styles.circle, isToday && !isSel && styles.today, isSel && styles.sel]}>
                  <Text
                    style={[
                      styles.day,
                      c === 0 && { color: C.red },
                      c === 6 && { color: C.blue },
                      isToday && !isSel && { color: C.primary },
                      isSel && { color: '#fff' },
                    ]}
                  >
                    {d}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {kinds.map((k) => (
                    <View key={k} style={[styles.dot, { backgroundColor: DOT_COLOR[k] }]} />
                  ))}
                </View>
              </>
            );
            return onSelect ? (
              <Pressable
                key={c}
                style={({ pressed }) => [styles.cell, pressed && { opacity: 0.6 }]}
                onPress={() => onSelect(date)}
                accessibilityLabel={`${month + 1}월 ${d}일`}
              >
                {body}
              </Pressable>
            ) : (
              <View key={c} style={styles.cell}>{body}</View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  week: { fontSize: 18, fontWeight: '700', color: C.sub, lineHeight: 32 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 2, borderColor: C.primary },
  sel: { backgroundColor: C.primary },
  day: { fontSize: 20, fontWeight: '700', color: C.text, includeFontPadding: false },
  dots: { height: 8, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
