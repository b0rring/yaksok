import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
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
      message: `${data.condition ? `${data.condition} 약${data.guess ? ' (AI 짐작)' : ''}\n` : ''}${names.join(', ')}\n\n${when}\n${data.schedule.days}일 동안`,
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
        return (
          <View key={j.id} style={[styles.card, j.status === 'error' && styles.cardErr]}>
            <View style={styles.row}>
              {j.status === 'running' ? (
                <ActivityIndicator color={C.primary} />
              ) : (
                <Icon name={j.status === 'done' ? 'check' : 'stop'} size={22} color={j.status === 'done' ? C.green : C.orange} stroke={3} />
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>
                  {j.status === 'running'
                    ? `AI가 ${WHAT[j.kind]}을 정리하고 있어요`
                    : j.status === 'done'
                      ? `${WHAT[j.kind]} 정리가 끝났어요`
                      : noMatch
                        ? j.kind === 'scan'
                          ? '약을 찾지 못했어요'
                          : '내용을 알아보지 못했어요'
                        : '정리하지 못했어요'}
                </Text>
                {j.status === 'running' && <Text style={styles.sub}>다른 화면을 보셔도 돼요</Text>}
                {j.status === 'error' && <Text style={styles.sub}>{noMatch ? '더 또렷하게 다시 찍거나 녹음해 주세요' : '잠시 뒤에 다시 시도해 주세요'}</Text>}
              </View>
              {j.status !== 'running' && (
                <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={() => dismiss(j.id)} hitSlop={8} style={styles.close}>
                  <Text style={styles.closeText}>닫기</Text>
                </Pressable>
              )}
            </View>
            {j.status === 'done' && j.kind === 'scan' && <BigButton label="확인하기" small onPress={() => confirm(j)} />}
            {j.status === 'done' && j.kind === 'visit' && (
              <BigButton
                label="보기"
                small
                onPress={() => {
                  dismiss(j.id);
                  router.push({ pathname: '/show', params: { id: j.visitId, saved: '1' } });
                }}
              />
            )}
            {j.status === 'error' && !noMatch && <BigButton label="다시 시도" small onPress={() => retry(j.id)} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: S.page, right: S.page, gap: S.in, zIndex: 50 },
  card: { ...CARD, padding: S.item, gap: S.in, shadowOpacity: 0.18, shadowRadius: 18, elevation: 10 },
  cardErr: { backgroundColor: '#FFF4EE' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.in },
  title: { fontSize: 19, fontWeight: '800', color: C.text },
  sub: { fontSize: 17, color: C.sub },
  close: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 6 },
  closeText: { fontSize: 17, fontWeight: '800', color: C.sub },
});
