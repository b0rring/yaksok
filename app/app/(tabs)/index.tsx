import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MonthGrid from '../../components/MonthGrid';
import Icon from '../../components/Icon';
import { getHealth } from '../../lib/api';
import { useCalendarData } from '../../lib/calendarData';
import { today } from '../../lib/store';
import { C, R } from '../../lib/theme';
import { useTodayMeds } from '../../lib/useTodayMeds';

// 홈: 첫 화면에 "오늘 먹을 약"(날짜 크게) → 큰 버튼 4개, 스크롤하면 이번 달 캘린더(누르면 캘린더 탭).
// 으뜸 동작(약 찍기)만 초록으로 채우고, 나머지는 흰 카드 + 얇은 선. 색은 초록 하나만.
const MENU = [
  { icon: 'camera', title: '약 찍기', sub: '사진으로 쉽게', path: '/scan', main: true },
  { icon: 'mic', title: '진료 녹음', sub: '말씀 받아쓰기', path: '/record' },
  { icon: 'pill', title: '오늘 약', sub: '복용 확인', path: '/today' },
  { icon: 'calendar', title: '캘린더', sub: '기록 모아보기', path: '/calendar' },
] as const;

export default function Home() {
  const router = useRouter();
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    getHealth().then(setOnline);
  }, []);
  const { slots, eat } = useTodayMeds();
  const left = slots.filter((s) => !s.done).length;
  // 화면 높이에 맞춰 버튼 높이 조절 (작은 폰에서도 스크롤 없이 보이게)
  const { height } = useWindowDimensions();
  const { dots } = useCalendarData();
  const t = today();
  const [y, m, d] = t.split('-').map(Number);
  const dateText = `${m}월 ${d}일 ${'일월화수목금토'[new Date(y, m - 1, d).getDay()]}요일`;
  const tileH = Math.max(136, Math.min(150, (height - 520) / 2));

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.top}>
          <Text style={styles.brand}>약속</Text>
          <Pressable
            onPress={() => router.push('/more')}
            style={({ pressed }) => [styles.setting, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.settingText}>알림 · 설정</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.date}>{dateText}</Text>
          <Text style={styles.label}>
            오늘 먹을 약 · {slots.length ? (left ? `${left}번 남았어요` : '다 드셨어요') : '아직 없어요'}
          </Text>
          {slots.map((s) => (
            <View key={s.id} style={styles.slotRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.slot}>{s.label}</Text>
                <Text style={styles.drugs} numberOfLines={1}>약 {s.drugs.length}가지</Text>
              </View>
              <Pressable
                onPress={() => eat(s.id)}
                style={({ pressed }) => [styles.eat, s.done && { backgroundColor: C.gray }, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.eatText}>{s.done ? '✓ 완료' : '먹었어요'}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {MENU.map((m) => {
            const main = 'main' in m;
            return (
              <Pressable
                key={m.path}
                accessibilityRole="button"
                onPress={() => router.push(m.path)}
                style={({ pressed }) => [
                  styles.tile,
                  { height: tileH },
                  main ? styles.tileMain : styles.tileQuiet,
                  pressed && { opacity: 0.88 },
                ]}
              >
                <View style={styles.tileTop}>
                  <View style={[styles.iconBox, main ? styles.iconMain : styles.iconQuiet]}>
                    <Icon name={m.icon} size={28} color={main ? '#fff' : C.primary} />
                  </View>
                  <ChevronRight size={28} color={main ? 'rgba(255,255,255,0.85)' : C.sub} strokeWidth={2} />
                </View>
                <View>
                  <Text style={[styles.tileTitle, !main && { color: C.text }]}>{m.title}</Text>
                  <Text
                    style={[styles.tileSub, !main && { color: C.sub }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {m.sub}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="캘린더 열기"
          onPress={() => router.push('/calendar')}
          style={({ pressed }) => [styles.calCard, pressed && { opacity: 0.88 }]}
        >
          <View style={styles.calHead}>
            <Text style={styles.calTitle}>{m}월 캘린더</Text>
            <Text style={styles.calLink}>크게 보기 ›</Text>
          </View>
          <View pointerEvents="none">
            <MonthGrid year={y} month={m - 1} dots={dots} todayStr={t} />
          </View>
        </Pressable>
        {online === false && <Text style={styles.offline}>서버에 연결되지 않았어요</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  brand: { fontSize: 28, fontWeight: '900', color: C.primary },
  setting: { paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, justifyContent: 'center', borderRadius: R.ctl, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  settingText: { fontSize: 18, fontWeight: '800', color: C.text },
  hero: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  date: { fontSize: 32, fontWeight: '900', color: C.text },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 20, fontWeight: '700', color: C.sub, marginTop: -8 },
  slot: { fontSize: 22, fontWeight: '900', color: C.text },
  drugs: { fontSize: 20, color: C.sub },
  eat: { minHeight: 56, borderRadius: R.ctl, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  eatText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '48%', flexGrow: 1, borderRadius: R.card, padding: 16, justifyContent: 'space-between' },
  tileMain: { backgroundColor: C.primary },
  tileQuiet: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconMain: { backgroundColor: 'rgba(255,255,255,0.2)' },
  iconQuiet: { backgroundColor: C.bg },
  tileTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  tileSub: { fontSize: 20, color: 'rgba(255,255,255,0.92)' },
  calCard: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calTitle: { fontSize: 26, fontWeight: '900', color: C.text },
  calLink: { fontSize: 20, fontWeight: '800', color: C.primary },
  offline: { fontSize: 18, textAlign: 'center', color: C.red },
});
