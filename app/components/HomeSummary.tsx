import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Chip from './Chip';
import Icon from './Icon';
import Section from './Section';
import { useCalendarData } from '../lib/calendarData';
import { isActive, planEnd, planTitle, today } from '../lib/store';
import { C, S } from '../lib/theme';

const md = (d: string) => d.replace(/^\d+-0?(\d+)-0?(\d+)$/, '$1월 $2일');
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000);

// 홈을 아래로 내리면 이어서 보이는 다른 탭의 요약: 내 약(드시고 있는 약) → 기록(최근 진료). 구역마다 흰 칸으로 나열하고 전체 보기 버튼이 있다.
export default function HomeSummary() {
  const router = useRouter();
  const { plans, visits } = useCalendarData();
  const t = today();
  const active = plans.filter(isActive);
  const recent = [...visits].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 2);

  return (
    <>
      <Section icon="pill" title="내 약">
        {active.length === 0 && <Text style={styles.empty}>드시고 있는 약이 없어요</Text>}
        {active.slice(0, 3).map((p) => {
          const n = Math.min(p.days, Math.max(1, daysBetween(p.start, t) + 1));
          const left = daysBetween(t, planEnd(p));
          return (
            <View key={p.id} style={styles.tile}>
              <View style={styles.head}>
                <Text style={styles.name} numberOfLines={1}>{planTitle(p)}</Text>
                <Chip small white text={`약 ${p.drugs.length}가지`} />
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(n / p.days) * 100}%` }]} />
              </View>
              <Text style={styles.sub}>
                {p.days}일 중 {n}일째, {left <= 0 ? '오늘까지 드세요' : `${md(planEnd(p))}까지`}
              </Text>
            </View>
          );
        })}
        {active.length > 3 && <Text style={styles.more}>그 밖에 {active.length - 3}개가 더 있어요</Text>}
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/drugs')} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.btnText}>내 약 전체 보기</Text>
        </Pressable>
      </Section>

      <Section icon="note" title="최근 진료 기록">
        {recent.length === 0 && <Text style={styles.empty}>아직 진료 기록이 없어요</Text>}
        {recent.map((v) => (
          <Pressable key={v.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/show', params: { id: v.id } })} style={styles.tile}>
            <View style={styles.go}>
              <View style={{ flex: 1, gap: S.in }}>
                <Chip small white text={md(v.date)} />
                <Text style={styles.name} numberOfLines={1}>{v.hospital}</Text>
                <Text style={styles.sub} numberOfLines={1}>{v.reason}</Text>
              </View>
              <Icon name="right" size={24} color={C.primary} />
            </View>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/record')} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.btnText}>기록 전체 보기</Text>
        </Pressable>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: C.soft, borderRadius: 16, padding: S.item, gap: S.in },
  go: { flexDirection: 'row', alignItems: 'center', gap: S.in },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontSize: 20, lineHeight: 28, fontWeight: '800', color: C.text },
  sub: { fontSize: 18, color: C.sub },
  more: { fontSize: 16, color: C.sub, textAlign: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: C.fill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.primary },
  empty: { fontSize: 18, color: C.sub, textAlign: 'center', padding: S.in },
  btn: { minHeight: 56, borderRadius: 28, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 20, fontWeight: '800', color: C.primary },
});
