import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import BigButton from '../../components/BigButton';
import { useDialog } from '../../components/Dialog';
import Icon from '../../components/Icon';
import { sendVoice } from '../../lib/api';
import { addVisit } from '../../lib/store';
import { C, CARD, S } from '../../lib/theme';

type Phase = 'idle' | 'recording' | 'saving';

const lengthText = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`);

// 홈의 "진료 녹음"을 누르면 바로 녹음 시작 → "끝내기" → "진료 기록에 추가할까요?" 한 번 확인 → 받아쓰기·요약 후 캘린더에 저장.
// 녹음 중에는 "취소"로 녹음을 버릴 수 있다 (확인 창을 거친다).
export default function Record() {
  const router = useRouter();
  const ask = useDialog();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<Phase>('idle');
  const [sec, setSec] = useState(0);
  const started = useRef(false);

  const start = async () => {
    if (phase !== 'idle') return;
    try {
      if (!(await requestRecordingPermissionsAsync()).granted)
        return ask({ title: '마이크를 켜 주세요', message: '설정에서 마이크를 허용해 주세요.' });
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSec(0);
      setPhase('recording');
    } catch {
      ask({ title: '녹음을 시작하지 못했어요', message: '다시 눌러 주세요.' });
      setPhase('idle');
    }
  };

  // 받아쓰기·요약·저장. 실패하면 같은 녹음으로 다시 시도할 수 있다.
  const save = async (uri: string) => {
    setPhase('saving');
    try {
      const visit = await addVisit(await sendVoice(uri));
      router.push({ pathname: '/show', params: { id: visit.id, saved: '1' } });
    } catch (e) {
      const unclear = e instanceof Error && e.message === '422';
      ask({
        title: '저장하지 못했어요',
        message: unclear ? '말씀이 잘 들리지 않았어요.\n다시 녹음해 주세요.' : '잠시 뒤에 다시 시도해 주세요.',
        actions: unclear
          ? [{ label: '확인' }]
          : [{ label: '다시 시도', onPress: () => save(uri) }, { label: '닫기', kind: 'secondary' }],
      });
    } finally {
      // 탭 화면은 떠난 뒤에도 남아 있으므로, 성공이든 실패든 처음 상태로 되돌린다
      setPhase('idle');
    }
  };

  const finish = async () => {
    if (phase !== 'recording') return; // "끝내기"를 두 번 눌러도 한 번만
    const length = sec;
    try {
      await recorder.stop();
    } catch {
      setPhase('idle');
      return ask({ title: '녹음을 마치지 못했어요', message: '다시 녹음해 주세요.' });
    }
    const uri = recorder.uri;
    setPhase('idle');
    if (!uri) return ask({ title: '녹음을 찾지 못했어요', message: '다시 녹음해 주세요.' });
    ask({
      title: '진료 기록에 추가할까요?',
      message: `${lengthText(length)} 녹음했어요.\n글로 옮겨서 오늘 날짜 캘린더에 저장해요.`,
      actions: [
        { label: '추가하기', onPress: () => save(uri) },
        { label: '추가 안 할래요', kind: 'secondary' },
      ],
    });
  };

  const cancel = () =>
    ask({
      title: '녹음을 취소할까요?',
      message: '지금까지 녹음한 내용이 사라져요.',
      actions: [
        { label: '계속 녹음하기' },
        {
          label: '녹음 취소하기',
          kind: 'danger',
          onPress: async () => {
            try {
              await recorder.stop();
            } catch {}
            setPhase('idle');
            setSec(0);
          },
        },
      ],
    });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
  }, []);

  useEffect(() => {
    if (phase !== 'recording') return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <View style={styles.wrap}>
      {phase === 'saving' ? (
        <>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.text}>글로 옮겨서 캘린더에 저장하고 있어요…</Text>
        </>
      ) : phase === 'recording' ? (
        <>
          <Text style={styles.dot}>●</Text>
          <Text style={styles.text}>의사 선생님 말씀을 녹음하고 있어요</Text>
          <Text style={styles.time}>
            {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
          </Text>
          <BigButton label="끝내기" color={C.red} onPress={finish} />
          <BigButton label="녹음 취소" variant="secondary" small onPress={cancel} />
        </>
      ) : (
        <>
          <View style={styles.micCircle}>
            <Icon name="mic" size={48} color={C.primary} />
          </View>
          <Text style={styles.text}>녹음을 시작할까요?</Text>
          <Text style={styles.hint}>끝내면 한 번 물어본 뒤, 글로 정리해 드려요</Text>
          <BigButton label="녹음 시작" onPress={start} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: S.page + 4, justifyContent: 'center', gap: S.gap + 4 },
  text: { fontSize: 28, fontWeight: '800', textAlign: 'center', color: C.text },
  micCircle: { ...CARD, alignSelf: 'center', width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 20, textAlign: 'center', color: C.sub, marginBottom: 12 },
  dot: { fontSize: 64, textAlign: 'center', color: C.red },
  time: { fontSize: 56, fontWeight: '800', textAlign: 'center', color: C.text, marginBottom: 16 },
});
