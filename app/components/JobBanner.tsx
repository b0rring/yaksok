import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './AppText';
import BigButton from './BigButton';
import { useDialog } from './Dialog';
import Icon from './Icon';
import type { ScanResult } from '../lib/api';
import { Job, useJobs } from '../lib/jobs';
import { scheduleSlots } from '../lib/notify';
import { Slot, addPlan, allActiveSlots, hasDuplicate, slotLabel } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const WHAT = { scan: '약 사진', visit: '진료 기록' } as const;

// 화면 위쪽에 뜨는 AI 작업 카드: 정리 중(빙글빙글) → 끝남(확인하기) / 실패(다시 시도). 어느 화면에 있어도 보인다.
export default function JobBanner() {
  const { jobs, retry, dismiss } = useJobs();
  const insets = useSafeAreaInsets();
  const ask = useDialog();
  const router = useRouter();

  const goResult = (data: ScanResult, added: boolean) =>
    router.push({ pathname: '/result', params: { data: JSON.stringify(data), added: added ? '1' : '' } });

  const add = async (data: ScanResult) => {
    await addPlan({
      drugs: data.drugs.map((d) => d.name),
      slots: data.schedule.slots as Slot[],
      days: data.schedule.days,
      condition: data.condition,
      guess: data.guess,
      hospital: data.hospital || undefined, pharmacy: data.pharmacy || undefined, prescribedOn: data.date || undefined, metaAi: !!(data.hospital || data.pharmacy || data.date),
      info: data.drugs,
    });
    if (!(await scheduleSlots(await allActiveSlots()))) ask({ title: '알림을 켜 주세요', message: '설정에서 알림을 허용해 주세요.' });
    goResult(data, true);
  };

  // 약 정리가 끝나면 "알림과 캘린더에 추가할까요?" 한 번만 묻는다. 같은 약이 이미 있으면 한 번 더 묻는다.
  const confirm = (job: Job) => {
    const data = job.scan!;
    const names = data.drugs.map((d) => d.name);
    const when = data.schedule.slots.map(slotLabel).join(', ');
    dismiss(job.id);
    ask({
      title: '알림과 캘린더에 추가할까요?',
      message: `${data.condition ? `${data.condition} 약${data.guess ? ' (AI 짐작)' : ''}\n` : ''}${data.hospital ? `${data.hospital}\n` : ''}${names.join(', ')}\n\n${when}\n${data.schedule.days}일 동안`,
      actions: [
        {
          label: '추가',
          onPress: async () => {
            if (!(await hasDuplicate(names))) return add(data);
            ask({
              title: '이미 있는 약이에요',
              message: '같은 약의 알림이 이미 있어요.\n또 추가할까요?',
              actions: [
                { label: '또 추가', onPress: () => add(data) },
                { label: '아니요', kind: 'secondary', onPress: () => goResult(data, false) },
              ],
            });
          },
        },
        { label: '안 할래요', kind: 'secondary', onPress: () => goResult(data, false) },
      ],
    });
  };

  if (!jobs.length) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }]}>
      {jobs.map((j) => {
        const noMatch = j.code === '422';
        const st = j.status;
        const sub = st === 'running' ? '다른 화면을 보셔도 돼요' : st === 'error' ? (noMatch ? '더 또렷하게 다시 찍거나 녹음해 주세요' : '잠시 뒤에 다시 시도해 주세요') : '';
        return (
          <View key={j.id} style={[styles.card, st === 'running' && styles.cardRun, st === 'done' && styles.cardDone, st === 'error' && styles.cardErr]}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: st === 'running' ? C.aiSoft : st === 'done' ? C.done : C.warn }]}>
                {st === 'running' ? <Icon name="sparkles" size={22} color={C.ai} /> : st === 'done' ? <Icon name="check" size={22} color="#2F5A43" stroke={3} /> : <Icon name="alert" size={22} color={C.orange} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>
                  {st === 'running'
                    ? `AI가 ${WHAT[j.kind]}을 정리하고 있어요`
                    : st === 'done'
                      ? `${WHAT[j.kind]} 정리가 끝났어요`
                      : noMatch
                        ? j.kind === 'scan'
                          ? '약을 찾지 못했어요'
                          : '내용을 알아보지 못했어요'
                        : '정리하지 못했어요'}
                </Text>
                {!!sub && <Text style={styles.sub}>{sub}</Text>}
              </View>
            </View>
            {st === 'running' && (
              <View style={styles.track}>
                <View style={styles.fill} />
              </View>
            )}
            {st === 'done' && j.kind === 'scan' && <BigButton label="확인하기" onPress={() => confirm(j)} />}
            {st === 'done' && j.kind === 'visit' && (
              <BigButton
                label="보기"
                onPress={() => {
                  dismiss(j.id);
                  router.push({ pathname: '/show', params: { id: j.visitId, saved: '1' } });
                }}
              />
            )}
            {st === 'error' && (
              <View style={styles.pair}>
                {!noMatch && (
                  <View style={{ flex: 1 }}>
                    <BigButton label="다시 시도" onPress={() => retry(j.id)} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <BigButton label="닫기" variant="secondary" onPress={() => dismiss(j.id)} />
                </View>
              </View>
            )}
            {st === 'done' && (
              <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={() => dismiss(j.id)} style={styles.close}>
                <Text style={styles.closeText}>닫기</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: S.page, right: S.page, gap: 10, zIndex: 50 },
  card: { ...CARD, padding: 16, gap: 12, shadowOpacity: 0.16, shadowRadius: 18, elevation: 10 },
  cardRun: { borderColor: '#D9D0F5' },
  cardDone: { borderColor: '#9FC2B5' },
  cardErr: { borderColor: '#E7B9A5' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  sub: { fontSize: 16, color: C.sub },
  track: { height: 8, borderRadius: 4, backgroundColor: C.aiSoft, overflow: 'hidden' },
  fill: { width: '55%', height: 8, borderRadius: 4, backgroundColor: C.ai }, // 얼마나 됐는지는 알 수 없어서 모양만
  pair: { flexDirection: 'row', gap: 8 },
  close: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  closeText: { fontSize: 18, fontWeight: '800', color: C.sub },
});
