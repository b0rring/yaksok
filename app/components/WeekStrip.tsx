import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import type { Kind } from '../lib/calendarData';
import { C } from '../lib/theme';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const toDate = (s: string) => new Date(`${s}T00:00:00`);

// 날짜 밑의 점: 먹을 날(빈 동그라미) / 먹은 날(채운 동그라미) / 병원 간 날(주황)
function Dots({ kinds, on }: { kinds: Kind[]; on?: boolean }) {
  return (
    <View style={styles.dots}>
      {kinds.map((k) => (
        <View
          key={k}
          style={[
            styles.dot,
            k === 'plan' && { borderWidth: 2, borderColor: on ? '#fff' : C.primary },
            k === 'taken' && { backgroundColor: on ? '#fff' : C.primary },
            k === 'visit' && { backgroundColor: C.orange },
          ]}
        />
      ))}
    </View>
  );
}

// 한 주(일~토) 줄: 캘린더 탭과 홈 아래 간단 캘린더가 함께 쓴다. sel 날짜는 남색으로 채운다.
export default function WeekStrip({ days, dots, sel, onSelect }: { days: string[]; dots: Record<string, Kind[]>; sel: string; onSelect: (d: string) => void }) {
  return (
    <View style={styles.strip}>
      {days.map((d) => {
        const on = d === sel;
        const dt = toDate(d);
        return (
          <Pressable
            key={d}
            accessibilityLabel={`${dt.getMonth() + 1}월 ${dt.getDate()}일`}
            onPress={() => onSelect(d)}
            style={[styles.dayCell, on && styles.dayOn]}
          >
            <Text style={[styles.dayWeek, on && { color: '#fff' }]}>{WEEK[dt.getDay()]}</Text>
            <Text style={[styles.dayNum, on && { color: '#fff' }]}>{dt.getDate()}</Text>
            <Dots kinds={dots[d] ?? []} on={on} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 5 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 16, gap: 4, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.mist },
  dayOn: { backgroundColor: C.primary, borderColor: C.primary },
  dayWeek: { fontSize: 16, fontWeight: '700', color: C.sub },
  dayNum: { fontSize: 22, fontWeight: '800', color: C.text },
  dots: { height: 12, flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 5 },
});
