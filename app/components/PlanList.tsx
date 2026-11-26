import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import BigButton from './BigButton';
import { useDialog } from './Dialog';
import { syncNotifications } from '../lib/notify';
import { Plan, addDays, addPlan, deletePlan, hasDuplicate, isActive, stopPlan, today } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const DAY = 86_400_000;
const dayNo = (start: string) => Math.floor((Date.parse(`${today()}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / DAY) + 1;
const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

// 홈 아래에 이어 붙는 약 목록: 지금 드시고 계신 약(복용 중지 / 삭제)과 지난 약(다시 먹기 / 삭제).
export default function PlanList({ all, reload }: { all: Plan[]; reload: () => unknown }) {
  const ask = useDialog();
  const active = all.filter(isActive);
  const past = all.filter((p) => !isActive(p)).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 10);

  // 바꾼 뒤에는 알림과 화면을 맞춘다 (웹에는 알림이 없어 실패해도 넘어간다)
  const done = async () => {
    await syncNotifications().catch(() => {});
    await reload();
  };
  const stop = (p: Plan) =>
    ask({
      title: '복용을 중지할까요?',
      message: '오늘부터 알림이 오지 않아요.\n지금까지 기록은 남아요.',
      actions: [
        { label: '중지하기', kind: 'danger', onPress: () => stopPlan(p.id).then(done) },
        { label: '그대로 두기', kind: 'secondary' },
      ],
    });
  const remove = (p: Plan) =>
    ask({
      title: '이 약을 지울까요?',
      message: '목록에서 없어지고 되돌릴 수 없어요.',
      actions: [
        { label: '지우기', kind: 'danger', onPress: () => deletePlan(p.id).then(done) },
        { label: '취소', kind: 'secondary' },
      ],
    });
  const again = async (p: Plan) => {
    if (await hasDuplicate(p.drugs)) return ask({ title: '이미 드시고 있어요', message: '같은 약이 목록에 있어요.' });
    await addPlan({ drugs: p.drugs, slots: p.slots, days: p.days });
    await done();
    ask({ title: '다시 등록했어요', message: `오늘부터 ${p.days}일 동안 알려 드려요.` });
  };

  if (!active.length && !past.length) return null;
  return (
    <View style={styles.wrap}>
      {!!active.length && <Text style={styles.section}>드시고 있는 약</Text>}
      {active.map((p) => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.drugs}>{p.drugs.join('\n')}</Text>
          <Text style={styles.sub}>{p.days}일 중 {Math.max(1, dayNo(p.start))}일째 · {md(addDays(p.start, p.days - 1))}까지</Text>
          <View style={styles.pair}>
            <View style={{ flex: 1 }}><BigButton label="복용 중지" variant="secondary" small onPress={() => stop(p)} /></View>
            <View style={{ flex: 1 }}><BigButton label="삭제" variant="secondary" small onPress={() => remove(p)} /></View>
          </View>
        </View>
      ))}

      {!!past.length && <Text style={styles.section}>지난 약</Text>}
      {past.map((p) => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.drugs}>{p.drugs.join('\n')}</Text>
          <Text style={styles.sub}>{p.stopped ? `${md(p.stopped)}에 중지했어요` : `${md(addDays(p.start, p.days - 1))}에 끝났어요`}</Text>
          <View style={styles.pair}>
            <View style={{ flex: 1 }}><BigButton label="다시 먹기" small onPress={() => again(p)} /></View>
            <View style={{ flex: 1 }}><BigButton label="삭제" variant="secondary" small onPress={() => remove(p)} /></View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.gap, marginTop: 8 },
  section: { fontSize: 26, fontWeight: '800', color: C.text },
  card: { ...CARD, padding: S.pad, gap: 14 },
  drugs: { fontSize: 24, lineHeight: 34, fontWeight: '800', color: C.text },
  sub: { fontSize: 20, color: C.sub },
  pair: { flexDirection: 'row', gap: 12 },
});
