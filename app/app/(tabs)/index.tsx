import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import BigButton from '../../components/BigButton';
import Chip from '../../components/Chip';
import ChatFab from '../../components/ChatFab';
import CalendarView from '../../components/CalendarView';
import Icon from '../../components/Icon';
import SlotIcon from '../../components/SlotIcon';
import { getHealth } from '../../lib/api';
import { planTitle, timeText, today } from '../../lib/store';
import { C, CARD, R, S } from '../../lib/theme';
import { useTodayMeds } from '../../lib/useTodayMeds';

// 지금 시각이 아침·점심·저녁 중 어디인지 (시간대 이름)
// 상태별 카드 바탕(테두리 없음): 지금 먹을 시간대는 진한 푸른 바탕, 아직 시간 전은 옅은 회청색 바탕, 다 먹은 건 회녹색 바탕+체크 아이콘
const SLOT_STYLE = {
  now: { backgroundColor: C.mist },
  later: { backgroundColor: C.soft },
  done: { backgroundColor: '#E4EBE6' },
} as const;
const SLOT_CHIP = { now: C.orange, later: '#7B879A', done: '#6F8F7B' } as const;
const period = (h: number) => (h < 5 ? '새벽' : h < 11 ? '아침' : h < 17 ? '점심' : h < 21 ? '저녁' : '밤');

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
  const total = slots.reduce((n, s) => n + s.items.length, 0);
  const doneN = slots.reduce((n, s) => n + s.items.filter((i) => i.done).length, 0);
  const summary = !slots.length ? '오늘은 먹을 약이 없어요' : !pending.length ? '오늘 약을 다 드셨어요' : `오늘 ${total}개 중 ${doneN}개 먹었어요`;


  const [y, m, d] = today().split('-').map(Number);
  const dateText = `${m}월 ${d}일 ${'일월화수목금토'[new Date(y, m - 1, d).getDay()]}`;
  // 오전·오후 대신 시간대 이름(새벽·아침·점심·저녁·밤)을 시각 앞에 붙인다: 날짜와 시각이 한 덩어리
  const clock = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.headTitle}>오늘의 약</Text>
          <View style={styles.right}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="설정"
              onPress={() => router.push('/more')}
              style={({ pressed }) => [styles.gear, pressed && { opacity: 0.6 }]}
            >
              <Icon name="settings" size={20} color={C.sub} />
            </Pressable>
          </View>
        </View>

        <View style={styles.status}>
          <Chip small text={`${dateText} ${period(now.getHours())} ${clock}`} />
          <Text style={styles.statusText}>{summary}</Text>
          {total > 0 && (
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${(doneN / total) * 100}%` }]} />
            </View>
          )}
        </View>

        {!slots.length && <BigButton label="약 사진 찍어서 추가" onPress={() => router.navigate('/scan')} />}

        {slots.length > 0 && (
          <View style={styles.part}>
            <View style={styles.band}>
              <View style={styles.rule} />
              <Icon name="pill" size={22} color={C.primary} />
              <Text style={styles.bandText}>오늘 먹을 약</Text>
              <View style={styles.rule} />
            </View>
        {ordered.map((s) => {
          const st = stateOf(s);
          const now = st === 'now';
          const left = s.items.filter((i) => !i.done).length;
          return (
            <View key={s.id} style={[styles.slot, SLOT_STYLE[st]]}>
              <View style={styles.slotHead}>
                <View style={styles.slotLeft}>
                  <View style={[styles.tag, { backgroundColor: SLOT_CHIP[st] }]}>
                    <View style={styles.tagIcon}>
                      {st === 'done' ? <Icon name="check" size={20} color={SLOT_CHIP.done} stroke={3.5} /> : <SlotIcon slot={s.id} size={26} />}
                    </View>
                    <Text style={styles.tagText}>{s.label}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.slotTime}>{timeText(s)}</Text>
                </View>
                <View style={styles.slotRight}>
                  {st !== 'later' && (
                    <Text numberOfLines={1} style={[styles.chip, st === 'done' ? styles.chipDone : styles.chipLate]}>
                      {st === 'done' ? '먹었어요' : '지금 드세요'}
                    </Text>
                  )}
                </View>
              </View>

              {s.items.map(({ plan, done }) => {
                  const k = `${s.id}:${plan.id}`;
                  return (
                    <View key={plan.id} style={styles.item}>
                      <View style={styles.itemRow}>
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: done }}
                          accessibilityLabel={`${s.label} ${planTitle(plan)}`}
                          onPress={() => eat(s.id, plan, done)}
                          style={({ pressed }) => [styles.check, pressed && { opacity: 0.8 }]}
                        >
                          <View style={[styles.box, done && styles.boxDone, now && !done && { borderColor: C.orange }]}>
                            {done && <Icon name="check" size={26} color="#fff" stroke={3.5} />}
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.itemName, done && { color: C.sub }]}>{planTitle(plan)}</Text>
                            <Text style={styles.itemSub}>약 {plan.drugs.length}가지</Text>
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
                          const effect = plan.info?.find((d) => d.name === name)?.effect;
                          return (
                            <View key={name} style={styles.drugRow}>
                              <Text style={styles.drugName}>{name}</Text>
                              {!!effect && <Text style={styles.itemSub}>{effect}</Text>}
                            </View>
                          );
                        })}
                    </View>
                  );
                })}
              {left > 1 && <BigButton label={`${s.label} 약 모두 먹었어요`} small onPress={() => eatAll(s.id)} />}
            </View>
          );
        })}
          </View>
        )}

        <View style={styles.calPart}>
          <View style={styles.band}>
            <View style={styles.rule} />
            <Icon name="calendar" size={22} color={C.primary} />
            <Text style={styles.bandText}>캘린더</Text>
            <View style={styles.rule} />
          </View>
          <View style={{ gap: S.section }}>
            <CalendarView mode="week" />
          </View>
        </View>

        {online === false && <Text style={styles.offline}>서버에 연결되지 않았어요</Text>}
      </ScrollView>
      <ChatFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flexGrow: 1, paddingHorizontal: S.page, paddingTop: 7, paddingBottom: 102, gap: S.section },
  top: { marginBottom: -S.gap, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 41 },
  headTitle: { flexShrink: 0, fontSize: 20, fontWeight: '800', color: C.text },
  right: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  date: { fontSize: 17, color: C.sub },
  gear: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  status: { ...CARD, padding: S.pad, gap: S.in },
  nowRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  now: { fontSize: 19, fontWeight: '700', color: C.sub },
  statusText: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: C.text },
  bar: { height: 12, borderRadius: 6, backgroundColor: C.soft, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 6, backgroundColor: C.primary },
  count: { fontSize: 17, color: C.sub },
  // 시간대 하나 = 연한 큰 카드 안에 머리줄(아이콘·이름·시각·상태)과 약 묶음 카드들
  slot: { gap: S.gap, backgroundColor: C.soft, borderRadius: R.card, padding: S.item },
  // 시간대 이름표: 색을 꽉 채운 둥근 상자 안에 둥근 흰 원(그림)과 이름
  tag: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 26, padding: 5, paddingRight: 14 },
  tagIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  slotHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  slotLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  slotTime: { flexShrink: 0, fontSize: 15, color: C.sub },
  slotName: { fontSize: 20, fontWeight: '800', color: C.text, flexShrink: 1 },
  chip: { flexShrink: 0, fontSize: 15, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15, overflow: 'hidden' },
  chipDone: { backgroundColor: '#6F8F7B', color: '#fff' },
  chipLate: { backgroundColor: C.orange, color: '#fff' },
  slotRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  item: { ...CARD, padding: S.item, gap: S.in },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 14 },
  expand: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  drugRow: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.in, gap: S.tight },
  drugName: { fontSize: 19, lineHeight: 26, fontWeight: '700', color: C.text },
  box: { width: 41, height: 41, borderRadius: 12, borderWidth: 3, borderColor: C.mist, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  boxDone: { backgroundColor: C.primary, borderColor: C.primary },
  itemName: { fontSize: 22, lineHeight: 29, fontWeight: '800', color: C.text },
  guess: { fontSize: 15, color: C.orange },
  itemSub: { fontSize: 17, color: C.sub },
  // 홈은 두 구역: 오늘 먹을 약(체크리스트) / 캘린더. 구역마다 제목을 달고, 둘 사이는 줄과 넓은 간격으로 나눈다.
  part: { gap: S.gap },
  partTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  calPart: { gap: S.gap, marginTop: S.section },
  // 구역 제목은 카드가 아니라 "선 — 아이콘·제목 — 선" 구분자: 카드(네모 상자)와 모양이 달라 한눈에 구역이 나뉜다
  band: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rule: { flex: 1, height: 2, borderRadius: 1, backgroundColor: C.mist },
  bandText: { fontSize: 20, fontWeight: '800', color: C.primary },
  offline: { fontSize: 15, textAlign: 'center', color: C.red },
});
