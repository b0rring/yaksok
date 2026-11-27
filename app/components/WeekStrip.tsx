import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Icon from './Icon';
import { DayCount, dayState } from '../lib/calendarData';
import { C } from '../lib/theme';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const toDate = (s: string) => new Date(`${s}T00:00:00`);

// 날짜 아래 표시: 다 먹음(초록 바탕 체크) / 빠뜨림(산호 바탕 !) / 고른 날은 "먹은 횟수/전체" 글자. 색만으로 뜻을 전하지 않는다.
export function DayMark({ state, size = 22 }: { state: 'done' | 'missed'; size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size / 2, backgroundColor: state === 'done' ? C.done : C.peach }]}>
      {state === 'done' ? <Icon name="check" size={size - 6} color="#2F5A43" stroke={3} /> : <Text style={styles.bang}>!</Text>}
    </View>
  );
}

// 범례: 다 먹은 날 / 빠뜨린 날 / 진료 간 날
export function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <Icon name="check" size={16} color="#2F5A43" stroke={3} />
        <Text style={styles.legendText}>다 먹은 날</Text>
      </View>
      <View style={styles.legendItem}>
        <Text style={styles.legendBang}>!</Text>
        <Text style={styles.legendText}>빠뜨린 날</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={styles.visitDot} />
        <Text style={styles.legendText}>진료 간 날</Text>
      </View>
    </View>
  );
}

// 한 주(일~토) 7칸. 오늘은 초록으로 채우고 먹은 횟수/전체를 적는다. 진료 간 날은 오른쪽 위에 파란 점.
export default function WeekStrip({ days, counts, visits, today, onSelect }: { days: string[]; counts: Record<string, DayCount>; visits: Record<string, boolean>; today: string; onSelect: (d: string) => void }) {
  return (
    <View style={styles.strip}>
      {days.map((d) => {
        const on = d === today;
        const dt = toDate(d);
        const c = counts[d];
        const st = dayState(c, d, today);
        return (
          <Pressable key={d} accessibilityLabel={`${dt.getMonth() + 1}월 ${dt.getDate()}일`} onPress={() => onSelect(d)} style={[styles.cell, on && styles.cellOn]}>
            {visits[d] && <View accessibilityLabel="진료" style={styles.visit} />}
            <Text style={[styles.week, dt.getDay() === 0 && { color: C.orange }, on && { color: '#fff' }]}>{WEEK[dt.getDay()]}</Text>
            <Text style={[styles.num, on && { color: '#fff' }]}>{dt.getDate()}</Text>
            {on ? (
              !!c?.total && <Text style={styles.count}>{c.taken}/{c.total}</Text>
            ) : st === 'done' || st === 'missed' ? (
              <DayMark state={st} />
            ) : (
              <View style={{ height: 22 }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 4 },
  cell: { flex: 1, minHeight: 88, alignItems: 'center', paddingVertical: 8, gap: 4, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  cellOn: { backgroundColor: C.primary, borderColor: C.primary },
  week: { fontSize: 16, fontWeight: '700', color: C.sub },
  num: { fontSize: 20, fontWeight: '800', color: C.text },
  count: { fontSize: 13, fontWeight: '800', color: '#fff' },
  visit: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue },
  mark: { alignItems: 'center', justifyContent: 'center' },
  bang: { fontSize: 14, fontWeight: '900', color: C.orange },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 16, color: C.sub },
  legendBang: { fontSize: 16, fontWeight: '900', color: C.orange },
  visitDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue },
});
