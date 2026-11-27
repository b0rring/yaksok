import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import BigButton from '../../components/BigButton';
import Chip from '../../components/Chip';
import Section from '../../components/Section';
import HomeSummary from '../../components/HomeSummary';
import AccountSwitch from '../../components/AccountSwitch';
import TabTitle from '../../components/TabTitle';
import ChatFab from '../../components/ChatFab';
import CalendarView from '../../components/CalendarView';
import Icon from '../../components/Icon';
import { CheckBox, FlipBadge, PillGauge } from '../../components/Motion';
import { getHealth } from '../../lib/api';
import { useSettings } from '../../lib/settings';
import { fmtTime, planTitle, timeText, today } from '../../lib/store';
import { C, CARD, R, S } from '../../lib/theme';
import { useTodayMeds } from '../../lib/useTodayMeds';

// 지금 시각이 아침·점심·저녁 중 어디인지 (시간대 이름)
// 상태별 카드 바탕(테두리 없음): 지금 먹을 시간대는 진한 푸른 바탕, 아직 시간 전은 옅은 회청색 바탕, 다 먹은 건 회녹색 바탕+체크 아이콘
const SLOT_BG: [string, string, string] = [C.peach, '#F4F4F1', '#E6F2EA']; // 지금, 아직, 먹음
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
  const dueNow = ordered.find((s) => stateOf(s) === 'now');
  const nextLater = slots.filter((s) => stateOf(s) === 'later').sort((a, b) => at(a) - at(b))[0];
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

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <TabTitle
          title="홈"
          above={
            <View style={styles.top}>
              <View style={styles.dateGroup}>
                <Text style={styles.dateBig}>{dateText}</Text>
                <View style={styles.weekBadge}>
                  <Text style={styles.weekText}>{weekday}</Text>
                </View>
              </View>
              <View style={styles.timeBox}>
                <Icon name="clock" size={20} color={C.primary} />
                <Text style={styles.timeText}>{clock}</Text>
              </View>
            </View>
          }
          right={
            <Pressable accessibilityRole="button" accessibilityLabel="설정" onPress={() => router.push('/more')} style={({ pressed }) => [styles.gear, pressed && { opacity: 0.6 }]}>
              <Icon name="settings" size={28} color={C.primary} />
            </Pressable>
          }
        />

        <AccountSwitch />

        {/* 오늘 먹을 약 + 복용 진행도: 한 구역 안에서 함께 본다 (진행 카드 → 시간대 카드들) */}
        <Section flush icon="pill" title="오늘 먹을 약">
          <View style={styles.status}>
            <Text style={styles.statusText}>{summary}</Text>
            {total > 0 && <PillGauge total={total} done={doneN} />}
            {!!hint && <Text style={[styles.hint, !!dueNow && { color: C.orange }]}>{hint}</Text>}
          </View>
          {!slots.length && <BigButton label="약 사진 찍어서 추가" onPress={() => router.navigate('/scan')} />}
        {ordered.map((s) => {
          const st = stateOf(s);
          const now = st === 'now';
          return (
            <Tint key={s.id} st={st} colors={SLOT_BG} style={styles.slot}>
              <View style={styles.slotHead}>
                <View style={styles.slotLeft}>
                  <Tint st={st} colors={TAG_BG} style={styles.tag}>
                    <FlipBadge slot={s.id} done={st === 'done'} doneColor={SLOT_CHIP.done} />
                    <Text style={styles.tagText}>{s.label}</Text>
                  </Tint>
                  <Text numberOfLines={1} style={styles.slotTime}>{timeText(s)}</Text>
                </View>
                {/* 묶음이 둘 이상이고 아직 남았을 때만, 머리줄 오른쪽에 "모두 체크"(겹친 체크 아이콘). 카드 높이는 변하지 않는다 */}
                {st !== 'done' && s.items.length > 1 && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`${s.label} 약 모두 체크`} onPress={() => eatAll(s.id)} style={[styles.allBtn, now && styles.allNow]}>
                    <Icon name="checks" size={24} color={now ? '#fff' : C.primary} stroke={2.6} />
                  </Pressable>
                )}
              </View>

              {/* 처방 묶음은 카드 하나 안에 줄로 나열하고 가는 선으로만 나눈다 (카드 안의 카드를 없앰) */}
              <View style={styles.rows}>
                {s.items.map(({ plan, done }, idx) => {
                  const k = `${s.id}:${plan.id}`;
                  return (
                    <View key={plan.id} style={styles.row}>
                      <View style={styles.itemRow}>
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: done }}
                          accessibilityLabel={`${s.label} ${planTitle(plan)}`}
                          onPress={() => eat(s.id, plan, done)}
                          style={({ pressed }) => [styles.check, pressed && { opacity: 0.8 }]}
                        >
                          <CheckBox done={done} warn={now} delay={idx * 80} />
                          <View style={{ flex: 1, gap: 4 }}>
                            <View style={styles.titleLine}>
                              <Text style={[styles.itemName, done && { color: C.sub }]}>{planTitle(plan)}</Text>
                              <Chip small text={`약 ${plan.drugs.length}가지`} />
                            </View>
                            <Text numberOfLines={1} style={styles.itemSub}>{plan.drugs.join(', ')}</Text>
                            {plan.guess && <Text style={styles.guess}>병명은 AI 짐작</Text>}
                          </View>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={openItem[k] ? '약 목록 접기' : `약 ${plan.drugs.length}가지 보기`}
                          onPress={() => setOpenItem((o) => ({ ...o, [k]: !o[k] }))}
                          style={styles.expand}
                        >
                          <Icon name={openItem[k] ? 'up' : 'down'} size={24} color={C.primary} />
                        </Pressable>
                      </View>
                      {!!openItem[k] &&
                        plan.drugs.map((name) => {
                          const di = plan.info?.find((d) => d.name === name);
                          const effect = di?.effect;
                          return (
                            <View key={name} style={styles.drugRow}>
                              <View style={styles.titleLine}>
                                <Text style={styles.drugName}>{name}</Text>
                                {!!di?.dose && <Chip small text={`1회 ${di.dose}`} />}
                              </View>
                              {!!effect && <Text style={styles.itemSub}>{effect}</Text>}
                            </View>
                          );
                        })}
                    </View>
                  );
                })}
              </View>
            </Tint>
          );
        })}
        </Section>

        <Section icon="calendar" title="캘린더">
          <CalendarView mode="week" />
        </Section>

        <HomeSummary />

        {online === false && <Text style={styles.offline}>서버에 연결되지 않았어요</Text>}
      </ScrollView>
      <ChatFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flexGrow: 1, paddingHorizontal: S.page, paddingTop: 8, paddingBottom: 102, gap: 16 }, // 구역 사이는 Section이 8을 더해 24, 제목 줄과 첫 구역은 바로 붙는다
  date: { fontSize: 18, color: C.sub },
  gear: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  // 날짜 | 요일 | 시각: 진행 카드 맨 위에 같은 폭의 세 칸으로 나눠 놓는다
  // 맨 위 한 줄: 왼쪽 날짜 + 요일 단추, 오른쪽 시각
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40, marginBottom: S.in },
  dateGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBig: { fontSize: 22, fontWeight: '800', color: C.text },
  weekBadge: { borderRadius: 14, backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 3 },
  weekText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, backgroundColor: C.fill, paddingHorizontal: 14, minHeight: 40 },
  timeText: { fontSize: 20, fontWeight: '800', color: C.primary },
  status: { ...CARD, padding: S.pad, gap: S.in },
  hint: { fontSize: 18, fontWeight: '800', color: C.sub },
  nowRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  now: { fontSize: 18, fontWeight: '700', color: C.sub },
  statusText: { fontSize: 22, lineHeight: 32, fontWeight: '800', color: C.text },
  bar: { height: 12, borderRadius: 8, backgroundColor: C.soft, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 8, backgroundColor: C.primary },
  count: { fontSize: 18, color: C.sub },
  // 시간대 하나 = 연한 큰 카드 안에 머리줄(아이콘·이름·시각·상태)과 약 묶음 카드들
  slot: { gap: S.in, borderRadius: R.card, padding: S.in },
  // 시간대 이름표: 색을 꽉 채운 둥근 상자 안에 둥근 흰 원(그림)과 이름
  tag: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 28, padding: 5, paddingRight: 16 },
  tagIcon: { width: 36, height: 36, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  slotHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  slotLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  slotTime: { flexShrink: 0, fontSize: 16, color: C.sub },
  slotName: { fontSize: 20, fontWeight: '800', color: C.text, flexShrink: 1 },
  chip: { flexShrink: 0, fontSize: 16, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, overflow: 'hidden' },
  allBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  allNow: { backgroundColor: C.orange, borderColor: C.orange },
  chipDone: { backgroundColor: '#4F7A60', color: '#fff' },
  chipLate: { backgroundColor: C.orange, color: '#fff' },
  rows: { gap: 8 },
  row: { backgroundColor: '#fff', borderRadius: R.card, padding: S.item, gap: S.in },
  titleLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 16 },
  expand: { width: 44, height: 44, borderRadius: 24, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  drugRow: { backgroundColor: C.soft, borderRadius: 12, padding: S.in, gap: S.tight },
  drugName: { fontSize: 18, lineHeight: 28, fontWeight: '700', color: C.text },
  box: { width: 40, height: 40, borderRadius: 12, borderWidth: 3, borderColor: C.border, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  boxDone: { backgroundColor: C.primary, borderColor: C.primary },
  itemName: { fontSize: 20, lineHeight: 28, fontWeight: '800', color: C.text },
  guess: { fontSize: 16, color: C.orange },
  itemSub: { fontSize: 18, color: C.sub },
  // 홈은 두 구역: 오늘 먹을 약(체크리스트) / 캘린더. 구역마다 제목을 달고, 둘 사이는 줄과 넓은 간격으로 나눈다.
  part: { gap: S.gap },
  partTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  calPart: { gap: S.gap },
  // 구역 제목은 카드가 아니라 "선 — 아이콘·제목 — 선" 구분자: 카드(네모 상자)와 모양이 달라 한눈에 구역이 나뉜다
  band: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flex: 1, height: 2, borderRadius: 1, backgroundColor: C.mist },
  bandText: { fontSize: 22, fontWeight: '800', color: C.primary },
  offline: { fontSize: 16, textAlign: 'center', color: C.red },
});
