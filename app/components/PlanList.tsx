import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Chip from './Chip';
import Icon from './Icon';
import DrugCard from './DrugCard';
import { useDialog } from './Dialog';
import { syncNotifications } from '../lib/notify';
import { Plan, addDays, addPlan, deletePlan, hasDuplicate, isActive, planTitle, stopPlan, today } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const DAY = 86_400_000;
const dayNo = (start: string) => Math.floor((Date.parse(`${today()}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / DAY) + 1;
const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;

// 내 약 탭의 목록: "무슨 병 약"으로 묶은 카드. 약 이름을 누르면 쉬운 설명과 식약처 공식 설명이 펼쳐진다.
// 드시고 있는 약(복용 중지 / 삭제)과 지난 약(다시 먹기 / 삭제).
export default function PlanList({ all, reload }: { all: Plan[]; reload: () => unknown }) {
  const ask = useDialog();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null); // 펼친 약 "계획id:약이름"
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
    await addPlan({ drugs: p.drugs, slots: p.slots, days: p.days, condition: p.condition, guess: p.guess, info: p.info });
    await done();
    ask({ title: '다시 등록했어요', message: `오늘부터 ${p.days}일 동안 알려 드려요.` });
  };

  const card = (p: Plan, sub: string[], actions: [string, () => void, boolean?][], editable?: boolean) => (
    <View key={p.id} style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{planTitle(p)}</Text>
        {editable && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="약 정보 고치기"
            onPress={() => router.push({ pathname: '/edit', params: { id: p.id } })}
            style={({ pressed }) => [styles.pen, pressed && { opacity: 0.6 }]}
          >
            <Icon name="edit" size={22} color={C.primary} />
          </Pressable>
        )}
      </View>
      {p.guess && <Text style={styles.guess}>병명은 AI가 약을 보고 짐작했어요</Text>}
      <View style={styles.chips}>
        {sub.map((t) => (
          <Chip key={t} small text={t} />
        ))}
      </View>
      {p.drugs.map((name) => {
        const info = p.info?.find((d) => d.name === name);
        const k = `${p.id}:${name}`;
        return (
          <View key={name} style={styles.drug}>
            <Pressable
              accessibilityRole="button"
              disabled={!info}
              onPress={() => setOpen(open === k ? null : k)}
              style={({ pressed }) => [styles.drugHead, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.drugName}>{name}</Text>
              {!!info && <Text style={styles.more}>{open === k ? '접기' : '자세히'}</Text>}
            </Pressable>
            {!!info?.effect && open !== k && <Text style={styles.effect}>{info.effect}</Text>}
            {!!info && open === k && <DrugCard d={info} bare speak />}
          </View>
        );
      })}
      <View style={styles.actions}>
        {actions.map(([label, onPress, main]) => (
          <Pressable key={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, main && styles.actionMain, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.actionText, main && { color: '#fff' }, label === '삭제' && { color: C.red }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (!active.length && !past.length) return null;
  return (
    <View style={styles.wrap}>
      {!!active.length && (
        <View style={styles.group}>
          <Text style={styles.section}>드시고 있는 약</Text>
      {active.map((p) =>
        card(
          p,
          [`${p.days}일 중 ${Math.max(1, dayNo(p.start))}일째`, `${md(addDays(p.start, p.days - 1))}까지`],
          [['복용 중지', () => stop(p)], ['삭제', () => remove(p)]],
          true,
        ),
      )}
        </View>
      )}

      {!!past.length && (
        <View style={styles.group}>
          <Text style={styles.section}>지난 약</Text>
      {past.map((p) =>
        card(
          p,
          [p.stopped ? `${md(p.stopped)}에 중지했어요` : `${md(addDays(p.start, p.days - 1))}에 끝났어요`],
          [['다시 먹기', () => again(p), true], ['삭제', () => remove(p)]],
        ),
      )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.section },
  group: { gap: S.gap },
  section: { fontSize: 22, fontWeight: '800', color: C.text },
  card: { ...CARD, padding: S.item, gap: S.tight },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 20, lineHeight: 28, fontWeight: '800', color: C.text },
  pen: { width: 44, height: 44, borderRadius: 24, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  guess: { fontSize: 16, color: C.orange },
  sub: { fontSize: 18, color: C.sub },
  drug: { gap: S.tight },
  drugHead: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: C.line, marginTop: 8, paddingTop: 8 },
  effect: { fontSize: 18, lineHeight: 24, color: C.sub },
  drugName: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: C.text, flexShrink: 1 },
  more: { fontSize: 18, fontWeight: '800', color: C.primary },
  actions: { flexDirection: 'row', gap: S.in, marginTop: S.in },
  action: { flex: 1, minHeight: 56, borderRadius: 28, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  actionMain: { backgroundColor: C.primary, borderColor: C.primary },
  actionText: { fontSize: 20, fontWeight: '800', color: C.text },
});
