import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import BigButton from '../../components/BigButton';
import Chip from '../../components/Chip';
import Section from '../../components/Section';
import SlotIcon from '../../components/SlotIcon';
import HomeSummary from '../../components/HomeSummary';
import AccountSwitch from '../../components/AccountSwitch';
import TabTitle from '../../components/TabTitle';
import ChatFab from '../../components/ChatFab';
import Icon from '../../components/Icon';
import { CheckBox, FlipBadge, PillGauge } from '../../components/Motion';
import { getHealth } from '../../lib/api';
import { useSettings } from '../../lib/settings';
import { fmtTime, planTitle, timeText, today } from '../../lib/store';
import { C, CARD, R, S } from '../../lib/theme';
import { useTodayMeds } from '../../lib/useTodayMeds';

// 지금 시각이 아침·점심·저녁 중 어디인지 (시간대 이름)
// 상태별 카드 바탕(테두리 없음): 지금 먹을 시간대는 진한 푸른 바탕, 아직 시간 전은 옅은 회청색 바탕, 다 먹은 건 회녹색 바탕+체크 아이콘
const SLOT_BG: [string, string, string] = [C.peach, C.soft, C.done]; // 지금, 아직, 먹음
// 시간대 상태가 바뀔 때(지금 → 먹음 등) 카드와 이름표 색이 갑자기 바뀌지 않고 0.35초 동안 스며들듯 바뀐다
const STATE_IDX = { now: 0, later: 1, done: 2 } as const;
function Tint({ st, colors, style, children }: { st: 'now' | 'later' | 'done'; colors: [string, string, string]; style: object; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(STATE_IDX[st])).current;
  useEffect(() => {
    Animated.timing(v, { toValue: STATE_IDX[st], duration: 350, useNativeDriver: false }).start();
  }, [st, v]);
  return <Animated.View style={[style, { backgroundColor: v.interpolate({ inputRange: [0, 1, 2], outputRange: colors }) }]}>{children}</Animated.View>;
}
const SLOT_CHIP = { now: C.orange, later: '#5F7168', done: '#4F7A60' } as const;
const TAG_BG: [string, string, string] = [SLOT_CHIP.now, SLOT_CHIP.later, SLOT_CHIP.done];

// 홈 = 오늘의 약 체크리스트: 지금 시각과 "지금 뭘 해야 하는지" 한 줄, 그 아래 시간대별로 "무슨 병 약"을 체크한다.
export default function Home() {
  const router = useRouter();
  const [online, setOnline] = useState<boolean | null>(null);
  // 홈이 보일 때마다 서버를 다시 확인하고, 끊겨 있으면 10초마다 재확인
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const check = () => getHealth().then((ok) => alive && setOnline(ok));
      check();
      const t = setInterval(check, 10_000);
      return () => {
        alive = false;
        clearInterval(t);
      };
    }, []),
  );

  const { slots, eat, eatAll } = useTodayMeds();
  const [openItem, setOpenItem] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const at = (s: { hour: number; minute: number }) => s.hour * 60 + s.minute;
  const pending = slots.filter((s) => !s.done);
  // 시간대 상태: now = 시간이 됐는데 아직 안 먹음(강조), later = 아직 시간 전(색을 죽임), done = 다 먹음(다른 색으로 죽임)
  const stateOf = (s: (typeof slots)[number]) => (s.done ? 'done' : at(s) <= nowMin ? 'now' : 'later');
  // 순서: 지금 시간대(시각이 지난 것 중 가장 늦은 시간대)는 다 먹었어도 맨 위, 나머지는 아침·점심·저녁 시간 순
  const curId = slots.filter((s) => at(s) <= nowMin).sort((a, b) => at(b) - at(a))[0]?.id;
  const ordered = [...slots].sort((a, b) => (b.id === curId ? 1 : 0) - (a.id === curId ? 1 : 0) || at(a) - at(b));
  const [pick, setPick] = useState<string | null>(null); // 아래 목록에서 고른 시간대(없으면 지금 시간대)
  const dueNow = ordered.find((s) => stateOf(s) === 'now');
  const nextLater = slots.filter((s) => stateOf(s) === 'later').sort((a, b) => at(a) - at(b))[0];
  // 맨 위 카드: 먹을 약이 하나라도 있으면 항상 하나를 보여 준다.
  // 지금 시간대(시각이 지난 것 중 가장 늦은 시간대)는 다 먹었어도 "다 드셨어요"로 그대로 두고, 다음 시간대는 그 시간이 되기 전에는 올라오지 않는다.
  // 첫 시간대 전(새벽)에는 하루의 마지막 시간대(예: 저녁)를 보여 준다. 아침이 되면 아침으로 바뀐다.
  const lastSlot = [...slots].sort((a, b) => at(b) - at(a))[0];
  const focus = ordered.find((s) => s.id === pick) ?? slots.find((s) => s.id === curId) ?? lastSlot;
  const nowCount = slots.reduce((n, s) => n + (stateOf(s) === 'now' ? s.items.filter((i) => !i.done).length : 0), 0);
  const hint = dueNow ? `지금 ${dueNow.label} 약 드실 시간이에요` : nextLater ? `다음은 ${nextLater.label} ${timeText(nextLater)}이에요` : '';
  const total = slots.reduce((n, s) => n + s.items.length, 0);
  const doneN = slots.reduce((n, s) => n + s.items.filter((i) => i.done).length, 0);
  const summary = !slots.length ? '오늘은 먹을 약이 없어요' : !pending.length ? '오늘 약을 다 드셨어요' : `오늘 ${total}개 중 ${doneN}개 먹었어요`;


  const [y, m, d] = today().split('-').map(Number);
  const dateText = `${m}월 ${d}일`;
  const weekday = `${'일월화수목금토'[new Date(y, m - 1, d).getDay()]}요일`;
  // 오전·오후 대신 시간대 이름(새벽·아침·점심·저녁·밤)을 시각 앞에 붙인다: 날짜와 시각이 한 덩어리
  useSettings(); // 시각 표시(12·24시간)를 바꾸면 다시 그린다
  const clock = fmtTime(now.getHours(), now.getMinutes());

  const curLabel = slots.find((x) => x.id === curId)?.label;
  const fst = focus ? stateOf(focus) : 'done';
  const fNow = fst === 'now';
  const bigText = !focus ? '' : fst === 'done' ? `${focus.label} 약을 다 드셨어요` : fNow ? `${focus.label} 약 드실 시간이에요` : `${focus.label} 약은 ${timeText(focus)}이에요`;
  const others = ordered.filter((s) => s.id !== focus?.id);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.top}>
            <View style={styles.dateGroup}>
              <Text style={styles.dateBig}>{dateText}</Text>
              <View style={styles.weekBadge}>
                <Text style={styles.weekText}>{weekday}</Text>
              </View>
            </View>
            <View style={styles.timeBox}>
              <Icon name="clock" size={20} color={C.primary} />
              <Text style={styles.timeText}>{curLabel ? `${curLabel} ${clock}` : clock}</Text>
            </View>
          </View>
          <TabTitle
            title="홈"
            right={
              <Pressable accessibilityRole="button" accessibilityLabel="설정" onPress={() => router.push('/more')} style={({ pressed }) => [styles.gear, pressed && { opacity: 0.6 }]}>
                <Icon name="settings" size={22} color={C.primary} />
              </Pressable>
            }
          />
        </View>

        <AccountSwitch />

        {!slots.length && (
          <View style={styles.empty}>
            <Text style={styles.statusText}>오늘은 먹을 약이 없어요</Text>
            <BigButton label="약 사진 찍어서 추가" onPress={() => router.navigate('/scan')} />
          </View>
        )}

        {/* 지금 시간대 카드: 시간대 이름표, 큰 안내, 오늘 진행(알약), 약 줄, 모두 먹었어요 */}
        {!!focus && (
          <Tint st={fst} colors={SLOT_BG} style={styles.slot}>
            <View style={styles.slotTop}>
              <View style={styles.slotHead}>
                <Tint st={fst} colors={TAG_BG} style={styles.tag}>
                  <FlipBadge slot={focus.id} done={fst === 'done'} doneColor={SLOT_CHIP.done} />
                  <Text style={styles.tagText}>{focus.label}</Text>
                </Tint>
                <Text numberOfLines={1} style={styles.slotTime}>{timeText(focus)}</Text>
              </View>
              <Text style={styles.bigText}>{bigText}</Text>
              <Text style={styles.count}>{total > 0 && pending.length ? <>오늘 {total}개 중 <Text style={styles.countOn}>{doneN}개</Text> 먹었어요</> : summary}</Text>
              {total > 0 && <PillGauge total={total} done={doneN} now={nowCount} />}
            </View>

            {focus.items.map(({ plan, done }, idx) => {
              const k = `${focus.id}:${plan.id}`;
              return (
                <View key={plan.id} style={styles.row}>
                  <View style={styles.itemRow}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: done }}
                      accessibilityLabel={`${focus.label} ${planTitle(plan)}`}
                      onPress={() => eat(focus.id, plan, done)}
                      style={({ pressed }) => [styles.check, pressed && { opacity: 0.8 }]}
                    >
                      <CheckBox done={done} warn={fNow} delay={idx * 80} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={styles.titleLine}>
                          <Text style={[styles.itemName, done && { color: C.sub }]}>{planTitle(plan)}</Text>
                          <Chip small text={`약 ${plan.drugs.length}가지`} />
                        </View>
                        <Text numberOfLines={1} style={styles.itemSub}>{plan.drugs.join(', ')}</Text>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={openItem[k] ? '약 목록 접기' : `약 ${plan.drugs.length}가지 보기`}
                      onPress={() => setOpenItem((o) => ({ ...o, [k]: !o[k] }))}
                      style={styles.expand}
                    >
                      <Icon name={openItem[k] ? 'up' : 'down'} size={22} color={C.primary} />
                    </Pressable>
                  </View>
                  {!!openItem[k] &&
                    plan.drugs.map((name) => {
                      const di = plan.info?.find((d) => d.name === name);
                      return (
                        <View key={name} style={styles.drugRow}>
                          <View style={styles.titleLine}>
                            <Text style={styles.drugName}>{name}</Text>
                            {!!di?.dose && <Chip small white text={`1회 ${di.dose}`} />}
                          </View>
                          {!!di?.effect && <Text style={styles.itemSub}>{di.effect}</Text>}
                        </View>
                      );
                    })}
                </View>
              );
            })}

            {fst !== 'done' && focus.items.length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => eatAll(focus.id)}
                style={({ pressed }) => [styles.allBtn, { backgroundColor: fNow ? C.orange : C.primary }, pressed && { opacity: 0.85 }]}
              >
                <Icon name="check" size={24} color="#fff" stroke={2.6} />
                <Text style={styles.allText}>{focus.label} 약 모두 먹었어요</Text>
              </Pressable>
            )}
          </Tint>
        )}

        {others.length > 0 && (
          <Section icon="pill" title="오늘 남은 약">
            {others.map((s) => {
              const done = stateOf(s) === 'done';
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.label} 약 보기`}
                  onPress={() => setPick(s.id)}
                  style={({ pressed }) => [styles.other, done ? { backgroundColor: C.done } : styles.otherLater, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.otherIcon, done && { backgroundColor: SLOT_CHIP.done }]}>
                    {done ? <Icon name="check" size={24} color="#fff" stroke={3} /> : <SlotIcon slot={s.id} size={28} />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.titleLine}>
                      <Text style={[styles.itemName, done && { color: '#2F5A43' }]}>{s.label}</Text>
                      <Text style={styles.otherTime}>{timeText(s)}</Text>
                    </View>
                    <Text style={styles.itemSub} numberOfLines={1}>{done ? `${s.items.length}개 모두 먹었어요` : s.items.map(({ plan }) => planTitle(plan)).join(', ')}</Text>
                  </View>
                  <Icon name="right" size={24} color={C.primary} stroke={2.4} />
                </Pressable>
              );
            })}
          </Section>
        )}

        <HomeSummary />

        {online === false && <Text style={styles.offline}>서버에 연결되지 않았어요</Text>}
      </ScrollView>
      <ChatFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  wrap: { flexGrow: 1, paddingHorizontal: S.page, paddingTop: 16, paddingBottom: 168, gap: 28 }, // 구역 사이 28, 아래는 ChatFab·탭바에 가리지 않게 여유
  header: { gap: 8 }, // 날짜 줄과 제목 줄 사이 8, 제목 줄과 첫 카드 사이는 구역 간격 28 (시안 그대로)
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBig: { fontSize: 22, fontWeight: '800', color: C.text },
  weekBadge: { borderRadius: 14, backgroundColor: C.primary, paddingHorizontal: 10, paddingVertical: 3 },
  weekText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, backgroundColor: C.fill, paddingHorizontal: 14, minHeight: 40 },
  timeText: { fontSize: 20, fontWeight: '800', color: C.primary },
  gear: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  empty: { ...CARD, padding: S.pad, gap: S.gap },
  statusText: { fontSize: 22, lineHeight: 32, fontWeight: '800', color: C.text },
  // 지금 시간대 카드 (산호 바탕 큰 카드)
  slot: { gap: 14, borderRadius: 24, padding: 14, paddingTop: 20 },
  slotTop: { gap: 10, paddingHorizontal: 6 },
  slotHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 32, padding: 6, paddingRight: 22 },
  tagText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  slotTime: { flexShrink: 1, fontSize: 18, fontWeight: '700', color: C.sub },
  bigText: { fontSize: 26, lineHeight: 36, fontWeight: '900', letterSpacing: -0.5, color: C.text },
  countOn: { fontWeight: '900', color: C.primary },
  count: { fontSize: 18, fontWeight: '700', color: C.text },
  row: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingLeft: 14, paddingRight: 12, gap: S.in },
  titleLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14 },
  expand: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  drugRow: { backgroundColor: C.soft, borderRadius: 12, padding: S.in, gap: S.tight },
  drugName: { fontSize: 18, lineHeight: 28, fontWeight: '700', color: C.text },
  itemName: { fontSize: 20, lineHeight: 28, fontWeight: '800', color: C.text },
  guess: { fontSize: 16, color: C.orange },
  itemSub: { fontSize: 16, color: C.sub },
  allBtn: { minHeight: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  allText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  // 오늘 남은 약: 다른 시간대를 한 줄씩
  other: { minHeight: 72, borderRadius: 18, paddingVertical: 12, paddingLeft: 14, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  otherLater: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  otherIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  otherTime: { fontSize: 16, fontWeight: '500', color: C.sub },
  offline: { fontSize: 16, textAlign: 'center', color: C.red },
});
