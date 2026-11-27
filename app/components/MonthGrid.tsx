import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { DayCount, dayState } from '../lib/calendarData';
import { C } from '../lib/theme';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');

type Props = {
  year: number;
  month: number; // 0~11
  counts: Record<string, DayCount>;
  visits: Record<string, boolean>;
  todayStr: string;
  selected?: string;
  onSelect?: (date: string) => void;
};

// 달력 한 달. 날짜 숫자 아래에 작은 표시: 다 먹음 = 초록 점, 빠뜨림 = 산호색 "!". 진료 간 날은 숫자 오른쪽 위 파란 점.
// 고른 날은 진한 초록 둥근 네모에 흰 글자.
export default function MonthGrid({ year, month, counts, visits, todayStr, selected, onSelect }: Props) {
  const lead = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));

  return (
    <View style={{ gap: 4 }}>
      <View style={styles.row}>
        {WEEK.map((w, i) => (
          <View key={w} style={styles.cell}>
            <Text style={[styles.week, i === 0 && { color: C.orange }]}>{w}</Text>
          </View>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((d, c) => {
            if (!d) return <View key={c} style={styles.cell} />;
            const date = `${year}-${pad(month + 1)}-${pad(d)}`;
            const isSel = date === selected;
            const st = dayState(counts[date], date, todayStr);
            const body = (
              <View style={[styles.box, isSel && styles.sel]}>
                {visits[date] && <View accessibilityLabel="진료" style={[styles.visit, isSel && { backgroundColor: '#8FB2F0' }]} />}
                <Text style={[styles.day, c === 0 && { color: C.orange }, isSel && { color: '#fff' }]}>{d}</Text>
                <View style={styles.mark}>
                  {st === 'done' && <View style={[styles.dot, isSel && { backgroundColor: '#fff' }]} />}
                  {st === 'missed' && <Text style={[styles.bang, isSel && { color: '#fff' }]}>!</Text>}
                  {st === 'todo' && isSel && <View style={[styles.dot, { backgroundColor: '#fff' }]} />}
                </View>
              </View>
            );
            return onSelect ? (
              <Pressable key={c} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.6 }]} onPress={() => onSelect(date)} accessibilityLabel={`${month + 1}월 ${d}일`}>
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
  cell: { flex: 1, alignItems: 'center' },
  week: { fontSize: 16, fontWeight: '700', color: C.sub, lineHeight: 28, marginBottom: 7 },
  box: { width: 44, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 1 },
  sel: { backgroundColor: C.primary },
  day: { fontSize: 18, fontWeight: '800', color: C.text, lineHeight: 24 },
  mark: { height: 10, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4F7A60' },
  bang: { fontSize: 13, lineHeight: 14, fontWeight: '900', color: C.orange },
  visit: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue },
});
