import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '../lib/theme';
import { Slot } from '../lib/store';
import Icon from './Icon';

export type RingSlot = { id: Slot; label: string; hour: number; minute: number; done: boolean };

const SIZE = 340;
const R = 118;
const STROKE = 28;
const CX = SIZE / 2;
const NODE = 44;

const dayFrac = (h: number, m: number) => (h + m / 60) / 24;
// 24시간 시계: 맨 위가 0시, 시계 방향으로 흐른다
const pos = (frac: number, radius: number) => ({
  x: CX + radius * Math.sin(frac * 2 * Math.PI),
  y: CX - radius * Math.cos(frac * 2 * Math.PI),
});

type Props = { slots: RingSlot[]; now: Date; onNode: (id: Slot) => void; title: string; big: string; small?: string };

// 하루 시계 위에 아침·점심·저녁 약을 점으로 놓고, 가운데에 "다음 약까지" 안내를 보여준다.
export default function DoseRing({ slots, now, onNode, title, big, small }: Props) {
  const circ = 2 * Math.PI * R;
  const nowFrac = dayFrac(now.getHours(), now.getMinutes());

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={CX} cy={CX} r={R} stroke={C.soft} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={CX}
          cy={CX}
          r={R}
          stroke={C.mist}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${circ * nowFrac} ${circ}`}
          rotation={-90}
          origin={`${CX}, ${CX}`}
        />
      </Svg>

      <View pointerEvents="none" style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>{big}</Text>
        {!!small && <Text style={styles.small}>{small}</Text>}
      </View>

      {slots.map((s) => {
        const f = dayFrac(s.hour, s.minute);
        const p = pos(f, R);
        const l = pos(f, R + 38);
        return (
          <View key={s.id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={s.done ? `${s.label} 약 먹은 기록 취소` : `${s.label} 약 먹었어요`}
              onPress={() => onNode(s.id)}
              hitSlop={10}
              style={[styles.node, { left: p.x - NODE / 2, top: p.y - NODE / 2 }, s.done ? styles.nodeDone : styles.nodeTodo]}
            >
              {s.done && <Icon name="check" size={24} color="#fff" stroke={3} />}
            </Pressable>
            <Text pointerEvents="none" style={[styles.label, { left: l.x - 24, top: l.y - 14 }]}>{s.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 66 },
  title: { fontSize: 20, color: C.sub },
  big: { fontSize: 38, fontWeight: '800', color: C.text, marginVertical: 2 },
  small: { fontSize: 20, fontWeight: '800', color: C.primary },
  node: { position: 'absolute', width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: C.primary },
  nodeTodo: { backgroundColor: '#fff', borderWidth: 6, borderColor: C.orange },
  label: { position: 'absolute', width: 48, textAlign: 'center', fontSize: 20, fontWeight: '800', color: C.text },
});
