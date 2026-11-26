import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Svg, { Circle } from 'react-native-svg';
import { C } from '../lib/theme';
import { Slot } from '../lib/store';
import Icon from './Icon';

export type RingSlot = { id: Slot; label: string; hour: number; minute: number; done: boolean };

const SIZE = 340;
const R = 122;
const STROKE = 28;
const CX = SIZE / 2;
const NODE = 60;

const dayFrac = (h: number, m: number) => (h + m / 60) / 24;
// 24시간 시계: 맨 위가 0시, 시계 방향으로 흐른다
const pos = (frac: number, radius: number) => ({
  x: CX + radius * Math.sin(frac * 2 * Math.PI),
  y: CX - radius * Math.cos(frac * 2 * Math.PI),
});

type Props = { slots: RingSlot[]; now: Date; onNode: (id: Slot) => void; title: string; big: string; small?: string };

// 하루 시계 위에 아침·점심·저녁 약을 이름이 적힌 동그란 점으로 놓고(먹으면 남색+체크), 가운데에 "다음 약까지" 안내를 보여준다.
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
          strokeLinecap="round"
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
        return (
          <View key={s.id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={s.done ? `${s.label} 약 먹은 기록 취소` : `${s.label} 약 먹었어요`}
              onPress={() => onNode(s.id)}
              hitSlop={10}
              style={[styles.node, { left: p.x - NODE / 2, top: p.y - NODE / 2 }, s.done ? styles.nodeDone : styles.nodeTodo]}
            >
              <Text style={[styles.nodeText, s.done && { color: '#fff' }]} numberOfLines={1}>{s.label}</Text>
              {s.done && (
                <View style={styles.badge}>
                  <Icon name="check" size={14} color={C.primary} stroke={4} />
                </View>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 72 },
  title: { fontSize: 20, color: C.sub },
  big: { fontSize: 36, fontWeight: '800', color: C.text, marginVertical: 2 },
  small: { fontSize: 20, fontWeight: '800', color: C.primary },
  node: { position: 'absolute', width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: C.primary },
  nodeTodo: { backgroundColor: '#fff', borderWidth: 5, borderColor: C.orange },
  nodeText: { fontSize: 20, fontWeight: '800', color: C.text },
  badge: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});
