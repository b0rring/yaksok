import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import CalendarView from './CalendarView';
import Chip from './Chip';
import Icon from './Icon';
import Section from './Section';
import { useAuth } from '../lib/auth';
import { useCalendarData } from '../lib/calendarData';
import { isActive, planEnd, planTitle, today } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const md = (d: string) => d.replace(/^\d+-0?(\d+)-0?(\d+)$/, '$1월 $2일');
const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000);

// 홈을 아래로 내리면 이어서 보이는 구역: 드시고 있는 약, 이번 주, 최근 진료 기록, 보호자 연결 상태, 도움이 필요할 때.
// 구역 제목은 한 줄(아이콘 + 제목 + 전체 보기 링크)이고, 내용 카드는 그 아래에 따로 놓는다.
export default function HomeSummary() {
  const router = useRouter();
  const { links } = useAuth();
  const { plans, visits } = useCalendarData();
  const t = today();
  const active = plans.filter(isActive);
  const recent = [...visits].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];
  const guardian = links.guardians[0];

  return (
    <>
      <Section icon="pill" title="드시고 있는 약" action="전체 보기" onAction={() => router.navigate('/drugs')}>
        {active.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.empty}>드시고 있는 약이 없어요</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {active.slice(0, 3).map((p, i) => {
              const n = Math.min(p.days, Math.max(1, daysBetween(p.start, t) + 1));
              const left = daysBetween(t, planEnd(p));
              return (
                <View key={p.id} style={[styles.drug, i > 0 && styles.sep]}>
                  <View style={styles.head}>
                    <Text style={styles.name} numberOfLines={1}>{planTitle(p)}</Text>
                    <Chip small text={`약 ${p.drugs.length}가지`} />
                  </View>
                  <View accessibilityLabel={`진행 ${Math.round((n / p.days) * 100)}%`} style={styles.track}>
                    <View style={[styles.fill, { width: `${(n / p.days) * 100}%` }]} />
                  </View>
                  <View style={styles.between}>
                    <Text style={styles.sub}>
                      {p.days}일 중 <Text style={styles.on}>{n}일째</Text>
                    </Text>
                    <Text style={styles.sub}>{left <= 0 ? '오늘까지 드세요' : `${md(planEnd(p))}까지`}</Text>
                  </View>
                </View>
              );
            })}
            {active.length > 3 && <Text style={styles.more}>그 밖에 {active.length - 3}개가 더 있어요</Text>}
          </View>
        )}
      </Section>

      <Section icon="calendar" title="이번 주" action="달력 보기" onAction={() => router.navigate('/calendar')}>
        <CalendarView mode="week" />
      </Section>

      <Section icon="note" title="최근 진료 기록" action="전체 보기" onAction={() => router.navigate('/record')}>
        {!recent ? (
          <View style={styles.card}>
            <Text style={styles.empty}>아직 진료 기록이 없어요</Text>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/show', params: { id: recent.id } })} style={({ pressed }) => [styles.card, styles.visit, pressed && { opacity: 0.85 }]}>
            <View style={styles.between}>
              <Chip text={md(recent.date)} />
              <Icon name="right" size={22} color={C.primary} stroke={2.6} />
            </View>
            <Text style={styles.name}>{recent.hospital}</Text>
            {!!recent.reason && <Text style={styles.body} numberOfLines={2}>{recent.reason}</Text>}
          </Pressable>
        )}
      </Section>

      {!!guardian && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/links')} style={({ pressed }) => [styles.link, pressed && { opacity: 0.85 }]}>
          <View style={styles.linkIcon}>
            <Icon name="users" size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>보호자 {guardian.name}님과 연결돼 있어요</Text>
            <Text style={styles.sub}>드신 기록을 함께 볼 수 있어요</Text>
          </View>
          <Icon name="right" size={22} color={C.primary} stroke={2.6} />
        </Pressable>
      )}

      <Section icon="info" title="도움이 필요할 때">
        <View style={styles.help}>
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/hospital')} style={({ pressed }) => [styles.card, styles.helpCard, pressed && { opacity: 0.85 }]}>
            <View style={styles.helpIcon}>
              <Icon name="hospital" size={24} color={C.primary} />
            </View>
            <Text style={styles.name}>병원 찾기</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/community')} style={({ pressed }) => [styles.card, styles.helpCard, pressed && { opacity: 0.85 }]}>
            <View style={styles.helpIcon}>
              <Icon name="users" size={24} color={C.primary} />
            </View>
            <Text style={styles.name}>커뮤니티</Text>
          </Pressable>
        </View>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  card: { ...CARD, paddingHorizontal: 18, paddingVertical: 6 },
  empty: { fontSize: 18, color: C.sub, paddingVertical: 12 },
  drug: { paddingVertical: 14, gap: 8 },
  sep: { borderTopWidth: 1, borderTopColor: C.line },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  name: { flexShrink: 1, fontSize: 20, fontWeight: '800', color: C.text },
  track: { height: 8, borderRadius: 8, backgroundColor: C.fill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 8, backgroundColor: C.primary },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sub: { fontSize: 16, color: C.sub },
  on: { fontWeight: '800', color: C.primary },
  more: { fontSize: 16, color: C.sub, paddingVertical: 12 },
  visit: { paddingVertical: 18, paddingHorizontal: 18, gap: 10 },
  body: { fontSize: 18, lineHeight: 26, color: C.sub },
  link: { minHeight: 64, borderRadius: 18, backgroundColor: C.soft, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  linkTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  help: { flexDirection: 'row', gap: 10 },
  helpCard: { flex: 1, minHeight: 112, paddingVertical: 16, paddingHorizontal: 16, justifyContent: 'space-between' },
  helpIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
});
