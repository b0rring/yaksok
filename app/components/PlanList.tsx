import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Icon from './Icon';
import Chip from './Chip';
import DrugCard from './DrugCard';
import { useDialog } from './Dialog';
import { syncNotifications } from '../lib/notify';
import { Plan, Visit, addDays, addPlan, deletePlan, getVisits, hasDuplicate, isActive, planEnd, planTitle, stopPlan, today } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const DAY = 86_400_000;
const dayNo = (start: string) => Math.floor((Date.parse(`${today()}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / DAY) + 1;
const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
const sameHospital = (a: string, b: string) => !!a && !!b && (a.includes(b) || b.includes(a));

// 내 약 탭의 목록: "무슨 병 약"으로 묶은 카드. 카드 안은 성격이 다른 정보마다 모양을 달리한다.
//  복용 기간 = 진행 막대(몇 일째) + 끝나는 날(달력 아이콘 글자) / 처방 정보 = 이름표와 값이 나란한 칸(병원·약국·조제일) / 약 = 이름과 "자세히" 단추.
// 드시고 있는 약(복용 중지 / 삭제)과 지난 약(다시 먹기 / 삭제).
export default function PlanList({ all, reload }: { all: Plan[]; reload: () => unknown }) {
  const ask = useDialog();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null); // 펼친 약 "계획id:약이름"
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [visits, setVisits] = useState<Visit[]>([]);
  useEffect(() => {
    getVisits().then(setVisits);
  }, [all]);
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
    await addPlan({ drugs: p.drugs, slots: p.slots, days: p.days, condition: p.condition, guess: p.guess, info: p.info, hospital: p.hospital, pharmacy: p.pharmacy, prescribedOn: p.prescribedOn, metaAi: p.metaAi });
    await done();
    ask({ title: '다시 등록했어요', message: `오늘부터 ${p.days}일 동안 알려 드려요.` });
  };

  const find = (name: string, k: 'HP8' | 'PM9') => router.navigate({ pathname: '/hospital', params: { q: name, k } });

  // 처방 정보 한 줄: 이름표 + 값 + (있으면) 병원 탭에서 찾는 둥근 검색 버튼
  const metaRow = (label: string, value: string, findKind?: 'HP8' | 'PM9') => (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
      {!!findKind && (
        <Pressable accessibilityRole="button" accessibilityLabel={`${value} 찾기`} onPress={() => find(value, findKind)} style={({ pressed }) => [styles.round, { backgroundColor: '#fff' }, pressed && { opacity: 0.6 }]}>
          <Icon name="search" size={22} color={C.primary} stroke={2.4} />
        </Pressable>
      )}
    </View>
  );

  const card = (p: Plan, isActiveCard: boolean) => {
    const end = planEnd(p);
    const n = Math.min(p.days, Math.max(1, dayNo(p.start)));
    const relatedVisit = visits.find((v) => (p.prescribedOn ? v.date === p.prescribedOn : false) && (!p.hospital || sameHospital(v.hospital, p.hospital)));
    const hasMeta = !!(p.hospital || p.pharmacy || p.prescribedOn);
    return (
      <View key={p.id} style={styles.card}>
        <View style={{ gap: 4 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{planTitle(p)}</Text>
            {isActiveCard && (
              <Pressable accessibilityRole="button" accessibilityLabel="약 정보 고치기" onPress={() => router.push({ pathname: '/edit', params: { id: p.id } })} style={({ pressed }) => [styles.round, pressed && { opacity: 0.6 }]}>
                <Icon name="edit" size={22} color={C.primary} />
              </Pressable>
            )}
          </View>
          {p.guess && <Text style={styles.guess}>병명은 AI가 약을 보고 짐작했어요</Text>}
        </View>

        {/* 복용 기간: 진행 막대 */}
        <View style={styles.part}>
          <Text style={styles.blockLabel}>복용 기간</Text>
          {isActiveCard ? (
            <>
              <View style={styles.periodHead}>
                <Text style={styles.periodText}>
                  {p.days}일 중 <Text style={styles.periodNow}>{n}일째</Text>
                </Text>
                <View style={styles.periodEnd}>
                  <Icon name="calendar" size={18} color={C.sub} />
                  <Text style={styles.periodEndText}>{md(addDays(p.start, p.days - 1))}까지</Text>
                </View>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(n / p.days) * 100}%` }]} />
              </View>
            </>
          ) : (
            <View style={styles.periodEnd}>
              <Icon name="calendar" size={18} color={C.sub} />
              <Text style={styles.periodEndText}>{p.stopped ? `${md(p.stopped)}에 중지했어요` : `${md(end)}에 끝났어요`}</Text>
            </View>
          )}
        </View>

        {/* 처방 정보: 병원·약국·조제일 */}
        {hasMeta ? (
          <View style={styles.part}>
            <Text style={styles.blockLabel}>처방 정보</Text>
            <View style={styles.meta}>
              {!!p.hospital && metaRow('병원', p.hospital, 'HP8')}
              {!!p.pharmacy && metaRow('약국', p.pharmacy, 'PM9')}
              {!!p.prescribedOn && metaRow('조제일', md(p.prescribedOn))}
            </View>
            {!!relatedVisit && (
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/show', params: { id: relatedVisit.id } })} style={styles.metaLink}>
                <Text style={styles.metaLinkText}>이날 진료 기록 보기</Text>
                <Icon name="right" size={20} color={C.primary} stroke={2.6} />
              </Pressable>
            )}
            {!!p.metaAi && <Text style={styles.ai}>AI가 봉투에서 읽은 내용이에요. 틀리면 고쳐 주세요.</Text>}
          </View>
        ) : isActiveCard ? (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/edit', params: { id: p.id } })} style={styles.addMeta}>
            <Icon name="plus" size={18} color={C.primary} />
            <Text style={styles.addMetaText}>병원 정보 추가</Text>
          </Pressable>
        ) : null}

        <View style={styles.part}>
          <Text style={styles.blockLabel}>약 {p.drugs.length}가지</Text>
          {p.drugs.map((name) => {
            const info = p.info?.find((d) => d.name === name);
            const k = `${p.id}:${name}`;
            const on = open === k;
            return (
              <View key={name} style={[styles.drug, on && styles.drugOpen]}>
                <View style={styles.drugHead}>
                  <View style={styles.drugTitle}>
                    <Text style={[styles.drugName, on && { fontSize: 22, fontWeight: '800' }]}>{name}</Text>
                    {!!info?.dose && <Chip small text={`1회 ${info.dose}`} />}
                  </View>
                  {!!info && (
                    <Pressable accessibilityRole="button" accessibilityLabel={on ? `${name} 설명 접기` : `${name} 설명 보기`} onPress={() => setOpen(on ? null : k)} style={({ pressed }) => [styles.more, pressed && { opacity: 0.6 }]}>
                      <Text style={styles.moreText}>{on ? '접기' : '자세히'}</Text>
                      <Icon name={on ? 'up' : 'down'} size={18} color={C.primary} stroke={2.6} />
                    </Pressable>
                  )}
                </View>
                {!!info?.effect && !on && <Text style={styles.effect}>{info.effect}</Text>}
                {!!info && on && <DrugCard d={info} bare compact speak />}
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          {(isActiveCard
            ? ([['복용 중지', () => stop(p)], ['삭제', () => remove(p)]] as [string, () => void, boolean?][])
            : ([['다시 먹기', () => again(p), true], ['삭제', () => remove(p)]] as [string, () => void, boolean?][])
          ).map(([label, onPress, main]) => (
            <Pressable key={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, main && styles.actionMain, label === '삭제' && styles.actionDel, pressed && { opacity: 0.6 }]}>
              <Text style={[styles.actionText, main && { color: '#fff' }, label === '삭제' && { color: C.orange }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  if (!active.length && !past.length) return null;
  const shown = tab === 'active' ? active : past;
  return (
    <View style={styles.wrap}>
      <View accessibilityRole="tablist" style={styles.seg}>
        {([['active', `먹는 중 ${active.length}`], ['past', `지난 약 ${past.length}`]] as const).map(([v, label]) => (
          <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: tab === v }} onPress={() => setTab(v)} style={[styles.segItem, tab === v && styles.segOn]}>
            <Text style={[styles.segText, tab === v && { color: C.primary }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {shown.length ? shown.map((p) => card(p, tab === 'active')) : <Text style={styles.none}>{tab === 'active' ? '지금 드시는 약이 없어요' : '지난 약이 아직 없어요'}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.gap },
  seg: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 28, backgroundColor: C.fill },
  segItem: { flex: 1, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: '#fff', shadowColor: '#1E3A2F', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  segText: { fontSize: 18, fontWeight: '800', color: C.sub },
  none: { fontSize: 18, color: C.sub, textAlign: 'center', marginTop: 20 },
  card: { ...CARD, padding: S.pad, gap: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 24, lineHeight: 32, fontWeight: '900', letterSpacing: -0.5, color: C.text },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  guess: { fontSize: 16, color: C.orange },
  part: { gap: 8 },
  blockLabel: { fontSize: 16, fontWeight: '700', color: C.sub },
  periodHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  periodText: { fontSize: 22, fontWeight: '800', color: C.text },
  periodNow: { fontSize: 22, fontWeight: '900', color: C.primary },
  periodEnd: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  periodEndText: { fontSize: 16, color: C.sub },
  track: { height: 8, borderRadius: 4, backgroundColor: C.fill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.primary },
  meta: { backgroundColor: C.soft, borderRadius: 14, paddingVertical: 6, paddingLeft: 16, paddingRight: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  metaLabel: { width: 56, fontSize: 16, fontWeight: '700', color: C.sub },
  metaValue: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '800', color: C.text },
  metaLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaLinkText: { fontSize: 18, fontWeight: '800', color: C.primary },
  ai: { fontSize: 16, color: C.ai },
  addMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  addMetaText: { fontSize: 18, fontWeight: '800', color: C.primary },
  drug: { gap: 8, backgroundColor: C.soft, borderRadius: 16, padding: 14 },
  drugOpen: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line },
  drugHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  drugTitle: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', gap: 8, minHeight: 44 },
  drugName: { fontSize: 20, lineHeight: 28, fontWeight: '800', color: C.text },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#fff' },
  moreText: { fontSize: 16, fontWeight: '800', color: C.primary },
  effect: { fontSize: 18, lineHeight: 26, color: C.sub },
  actions: { flexDirection: 'row', gap: S.in },
  action: { flex: 1, minHeight: 56, borderRadius: 28, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  actionMain: { backgroundColor: C.primary },
  actionDel: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E7B9A5' },
  actionText: { fontSize: 20, fontWeight: '800', color: C.primary },
});
