import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BigButton from '../../components/BigButton';
import DoseRing from '../../components/DoseRing';
import Icon from '../../components/Icon';
import { getHealth } from '../../lib/api';
import { today } from '../../lib/store';
import { C, CARD, S } from '../../lib/theme';
import { useTodayMeds } from '../../lib/useTodayMeds';

const pad = (n: number) => String(n).padStart(2, '0');
const timeText = (s: { hour: number; minute: number }) => `${s.hour < 12 ? '오전' : '오후'} ${s.hour % 12 || 12}:${pad(s.minute)}`;
const diffText = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h && m ? `${h}시간 ${m}분` : h ? `${h}시간` : `${m}분`;
};

// 홈 = "오늘의 약": 하루 시계 위에 아침·점심·저녁 약을 놓고, 다음 약까지 남은 시간과 "지금 먹었어요" 버튼 하나.
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

  const { slots, eat } = useTodayMeds();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const at = (s: { hour: number; minute: number }) => s.hour * 60 + s.minute;
  const pending = slots.filter((s) => !s.done);
  // 시간이 지났는데 아직 안 먹은 약이 있으면 그것부터, 없으면 가장 가까운 다음 약
  const next = pending.find((s) => at(s) <= nowMin) ?? pending[0];
  const late = !!next && at(next) <= nowMin;

  const ring = !slots.length
    ? { title: '오늘은', big: '약이 없어요' }
    : !next
      ? { title: '오늘 약을', big: '다 드셨어요', small: '잘하셨어요' }
      : late
        ? { title: '드실 시간이에요', big: `${next.label} 약`, small: timeText(next) }
        : { title: '다음 약까지', big: diffText(at(next) - nowMin), small: `${next.label} ${timeText(next)}` };

  const [y, m, d] = today().split('-').map(Number);
  const dateText = `${m}월 ${d}일 ${'일월화수목금토'[new Date(y, m - 1, d).getDay()]}`;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.head}>오늘의 약</Text>
          <View style={styles.right}>
            <Text style={styles.date}>{dateText}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="설정"
              onPress={() => router.push('/more')}
              style={({ pressed }) => [styles.gear, pressed && { opacity: 0.6 }]}
            >
              <Icon name="settings" size={24} color={C.sub} />
            </Pressable>
          </View>
        </View>

        <DoseRing
          slots={slots.map(({ id, label, hour, minute, done }) => ({ id, label, hour, minute, done }))}
          now={now}
          onNode={eat}
          {...ring}
        />

        {!!next && <Text style={styles.drugs} numberOfLines={2}>{next.drugs.join(' · ')}</Text>}

        {next ? (
          <BigButton label="지금 먹었어요" onPress={() => eat(next.id)} />
        ) : !slots.length ? (
          <BigButton label="약 사진 찍어서 추가" onPress={() => router.navigate('/scan')} />
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/today')}
          style={({ pressed }) => [styles.link, CARD, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.linkText}>드시고 있는 약 보기</Text>
        </Pressable>

        {online === false && <Text style={styles.offline}>서버에 연결되지 않았어요</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flexGrow: 1, paddingHorizontal: S.page, paddingTop: 8, paddingBottom: 32, gap: S.gap },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  head: { fontSize: 24, fontWeight: '800', color: C.text },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date: { fontSize: 20, color: C.sub },
  gear: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  drugs: { fontSize: 22, textAlign: 'center', color: C.sub, lineHeight: 30 },
  link: { minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 22, fontWeight: '800', color: C.primary },
  offline: { fontSize: 18, textAlign: 'center', color: C.red },
});
