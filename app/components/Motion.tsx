import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Svg, { Circle, Line } from 'react-native-svg';
import Icon from './Icon';
import SlotIcon from './SlotIcon';
import { C } from '../lib/theme';

// 먹었다는 표시에 살아 있는 느낌을 주는 짧은 움직임 모음.
// 규칙: ① 이미 그려진 것을 줄였다 키우지 않는다(깜빡임 방지, 커졌다가 제자리로) ② 여러 개가 한꺼번에 바뀌면 차례로 ③ 어느 것도 부모 영역 밖으로 잘리지 않게 여유를 둔다.

// 값이 true로 바뀔 때만 delay(ms)만큼 늦춰서 반영한다. "모두 체크"처럼 여럿이 한꺼번에 바뀔 때 차례로 보이게 하려는 것.
function useLate(value: boolean, delay: number) {
  const [v, setV] = useState(value);
  const wait = useRef(delay);
  wait.current = delay;
  useEffect(() => {
    if (!value || !wait.current) {
      setV(value);
      return;
    }
    const t = setTimeout(() => setV(true), wait.current);
    return () => clearTimeout(t);
  }, [value]);
  return v;
}

// 체크칸: 칸이 한 번 커졌다 돌아오고, 체크 표시가 통통 튀며 나타난다.
export function CheckBox({ done, warn, delay = 0 }: { done: boolean; warn?: boolean; delay?: number }) {
  const on = useLate(done, delay);
  const check = useRef(new Animated.Value(on ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!on) {
      check.setValue(0);
      return;
    }
    check.setValue(0.3);
    Animated.parallel([
      Animated.spring(check, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 100, useNativeDriver: true }),
        Animated.spring(pulse, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]),
    ]).start();
  }, [on, check, pulse]);
  return (
    <Animated.View style={[styles.box, on && styles.boxOn, warn && !on && { borderColor: C.orange }, { transform: [{ scale: pulse }] }]}>
      <Animated.View style={{ opacity: check, transform: [{ scale: check }] }}>
        <Icon name="check" size={24} color="#fff" stroke={3.5} />
      </Animated.View>
    </Animated.View>
  );
}

// 시간대 동그라미: 다 먹으면 카드를 뒤집듯 가로로 납작해졌다 펴지며(0.42초) 해·달 그림이 체크로 바뀐다. 되돌리면 반대로.
// 두 그림을 겹쳐 두고 하나의 값(0~1)으로 가로 배율과 투명도를 함께 움직인다. 그림을 바꾸려고 JS로 되돌아오는 단계가 없어서
// (예전에는 납작해진 순간 JS가 그림을 바꿨고, 그 사이 휴대폰에서 깜빡였다) 도중에 끊기거나 연달아 눌러도 어긋나지 않는다.
export function FlipBadge({ slot, done, doneColor }: { slot: 'morning' | 'noon' | 'evening'; done: boolean; doneColor: string }) {
  const p = useRef(new Animated.Value(done ? 1 : 0)).current; // 0 = 해·달, 1 = 체크
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    Animated.timing(p, { toValue: done ? 1 : 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  }, [done, p]);
  const scaleX = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 1] });
  const sun = p.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const chk = p.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });
  return (
    <Animated.View style={[styles.badge, { transform: [{ scaleX }] }]}>
      <Animated.View style={[styles.layer, { opacity: sun }]}>
        <SlotIcon slot={slot} size={28} />
      </Animated.View>
      <Animated.View style={[styles.layer, { opacity: chk }]}>
        <Icon name="check" size={24} color={doneColor} stroke={3.5} />
      </Animated.View>
    </Animated.View>
  );
}

// 알약 한 알: 먹음 = 초록 두 색 알약(가운데 흰 이음선, 반짝임), 지금 = 흰 속 + 산호 테두리 + 점선 이음선, 아직 = 연한 속 + 갈색빛 테두리.
// 먹은 순간 한 번 커졌다 돌아온다(작아졌다 커지지 않는다).
type PillState = 'done' | 'now' | 'later';
function PillSvg({ state, size }: { state: PillState; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {state === 'done' && (
        <>
          <Circle cx={9.5} cy={22.5} r={6} fill={C.primary} />
          <Line x1={9.5} y1={22.5} x2={16} y2={16} stroke={C.primary} strokeWidth={12} />
          <Line x1={16} y1={16} x2={22.5} y2={9.5} stroke={C.mint} strokeWidth={12} />
          <Circle cx={22.5} cy={9.5} r={6} fill={C.mint} />
          <Line x1={13.2} y1={13.2} x2={18.8} y2={18.8} stroke="#fff" strokeWidth={1.4} strokeOpacity={0.5} />
          <Line x1={8.5} y1={19.5} x2={12} y2={16} stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeOpacity={0.6} />
        </>
      )}
      {state === 'now' && (
        <>
          <Line x1={9.5} y1={22.5} x2={22.5} y2={9.5} stroke={C.orange} strokeWidth={14.5} strokeLinecap="round" />
          <Line x1={9.5} y1={22.5} x2={22.5} y2={9.5} stroke="#fff" strokeWidth={9.5} strokeLinecap="round" />
          <Line x1={13.6} y1={13.6} x2={18.4} y2={18.4} stroke={C.orange} strokeWidth={1.6} strokeDasharray="1.6 1.6" />
        </>
      )}
      {state === 'later' && (
        <>
          <Line x1={9.5} y1={22.5} x2={22.5} y2={9.5} stroke={C.laterPill} strokeWidth={13} strokeLinecap="round" />
          <Line x1={9.5} y1={22.5} x2={22.5} y2={9.5} stroke="#FFF7F2" strokeWidth={9.5} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

function Pill({ state, delay }: { state: PillState; delay: number }) {
  const on = state === 'done';
  const shown = useLate(on, delay);
  const s = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (shown) {
      Animated.sequence([
        Animated.timing(s, { toValue: 1.3, duration: 110, useNativeDriver: true }),
        Animated.spring(s, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [shown, s]);
  return (
    <Animated.View style={[styles.pill, { transform: [{ scale: s }] }]}>
      <PillSvg state={on && !shown ? 'later' : state} size={40} />
    </Animated.View>
  );
}

// 오늘 약 게이지: 먹어야 할 횟수만큼 알약을 늘어놓는다. 먹음 / 지금 먹을 것 / 아직으로 나누고, 아래 범례(글자)로 색만으로 뜻을 전하지 않게 한다.
// 한꺼번에 여럿이 채워지면 차례로 채워진다.
export function PillGauge({ total, done, now = 0 }: { total: number; done: number; now?: number }) {
  const prev = useRef(done);
  const base = prev.current; // 이번에 새로 채워지는 알약은 base 번째부터
  useEffect(() => {
    prev.current = done;
  }, [done]);
  const later = Math.max(0, total - done - now);
  const stateOf = (i: number): PillState => (i < done ? 'done' : i < done + now ? 'now' : 'later');
  const legend: { st: PillState; label: string; n: number; color: string }[] = [
    { st: 'done', label: '먹음', n: done, color: C.primary },
    { st: 'now', label: '지금', n: now, color: C.orange },
    { st: 'later', label: '남음', n: later, color: C.sub },
  ];
  return (
    <View accessibilityRole="image" accessibilityLabel={`오늘 ${total}개 중 ${done}개 먹었고, 지금 ${now}개, 나중에 ${later}개`} style={styles.gauge}>
      <View style={styles.row}>
        {Array.from({ length: total }, (_, i) => (
          <Pill key={i} state={stateOf(i)} delay={i >= base ? (i - base) * 90 : 0} />
        ))}
      </View>
      <View style={styles.legend}>
        {legend.filter((l) => l.n > 0).map((l) => (
          <View key={l.st} style={styles.legendItem}>
            <PillSvg state={l.st} size={24} />
            <Text style={[styles.legendText, { color: l.color }]}>{l.label} {l.n}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 48, height: 48, borderRadius: 16, borderWidth: 3, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.primary, borderColor: C.primary },
  badge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pill: { padding: 2 },
  gauge: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginLeft: -4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  legendText: { fontSize: 16, fontWeight: '700' },
});
