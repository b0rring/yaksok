import * as ImagePicker from 'expo-image-picker';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import BigButton from '../../components/BigButton';
import { useDialog } from '../../components/Dialog';
import Chip from '../../components/Chip';
import Icon from '../../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJobs } from '../../lib/jobs';
import { useCalendarData } from '../../lib/calendarData';
import { C, CARD, S } from '../../lib/theme';

type Phase = 'idle' | 'recording';

const lengthText = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`);

// 기록 탭: 위에 "녹음 시작"(과 의견서 사진 추가), 아래에 지난 진료 기록 목록. 녹음 시작 → "끝내기" → "진료 기록에 추가할까요?" 한 번 확인 → AI가 뒤에서 받아쓰기·요약해 저장(위쪽 카드로 안내).
// 녹음 중에는 "취소"로 녹음을 버릴 수 있다 (확인 창을 거친다).
export default function Record() {
  const router = useRouter();
  const ask = useDialog();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<Phase>('idle');
  const [sec, setSec] = useState(0);
  const { visits, reload } = useCalendarData();
  const { startVisit, version } = useJobs();
  // 진료 기록이 새로 저장되면 목록을 다시 불러온다
  useEffect(() => {
    reload();
  }, [version]);

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
      message: `${lengthText(length)} 녹음했어요.\nAI가 글로 정리해서 저장해요.\n다른 화면을 보셔도 돼요.`,
      actions: [
        { label: '추가하기', onPress: () => startVisit(uri, true) },
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

  // 의견서(소견서)를 사진으로 추가: 사진을 고르면 바로 돌아와 AI가 뒤에서 정리한다 (위쪽 카드가 알려 줌)
  const pick = async (camera: boolean) => {
    const opts = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7 };
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
        return ask({ title: '카메라를 켜 주세요', message: '설정에서 카메라를 허용해 주세요.' });
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled) startVisit(res.assets[0].uri, false);
    } catch {
      ask({ title: '사진을 가져오지 못했어요', message: '다시 눌러 주세요.' });
    }
  };
  const addPhoto = () =>
    ask({
      title: '의견서 사진으로 추가',
      message: '의사 의견서를 찍어 주세요.',
      actions: [
        { label: '사진 찍기', onPress: () => pick(true) },
        { label: '앨범에서 고르기', kind: 'secondary', onPress: () => pick(false) },
        { label: '닫기', kind: 'secondary' },
      ],
    });

  useEffect(() => {
    if (phase !== 'recording') return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const body = (
    <View style={styles.wrap}>
      {phase === 'recording' ? (
        <>
          <Text style={styles.dot}>●</Text>
          <Text style={styles.text}>의사 선생님 말씀을 녹음하고 있어요</Text>
          <Text style={styles.time}>
            {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
          </Text>
          <BigButton label="끝내기" color={C.red} onPress={finish} />
          <BigButton label="녹음 취소" variant="secondary" small onPress={cancel} />
        </>
      ) : null}
    </View>
  );
  return phase === 'idle' ? (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.startCard}>
          <View style={styles.micCircle}>
            <Icon name="mic" size={34} color={C.primary} />
          </View>
          <Text style={styles.text}>진료 녹음</Text>
          <Text style={styles.hint}>끝내면 한 번 물어본 뒤, 글로 정리해 드려요</Text>
          <BigButton label="녹음 시작" onPress={start} />
          <BigButton label="의견서 사진으로 추가" variant="secondary" small onPress={addPhoto} />
        </View>
        <View style={styles.group}>
        <Text style={styles.section}>지난 진료 기록</Text>
        {!visits.length && <Text style={styles.empty}>아직 진료 기록이 없어요</Text>}
        {[...visits].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).map((v) => (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/show', params: { id: v.id } })}
            style={({ pressed }) => [styles.visit, pressed && { opacity: 0.85 }]}
          >
            <Chip text={v.date.replace(/^\d+-0?(\d+)-0?(\d+)$/, '$1월 $2일')} />
            <Text style={styles.vHospital}>{v.hospital}</Text>
            <Text style={styles.vSub} numberOfLines={2}>{v.reason}</Text>
            <Text style={styles.vMore}>의사에게 보여주기 ›</Text>
          </Pressable>
        ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  ) : (
    body
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: S.page, justifyContent: 'center', gap: S.gap },
  text: { fontSize: 24, fontWeight: '800', textAlign: 'center', color: C.text },
  micCircle: { ...CARD, alignSelf: 'center', width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 17, textAlign: 'center', color: C.sub, marginBottom: 10 },
  list: { padding: S.page, paddingBottom: 34, gap: S.section },
  group: { gap: S.gap },
  startCard: { ...CARD, padding: S.pad, gap: S.in },
  section: { fontSize: 22, fontWeight: '800', color: C.text },
  empty: { fontSize: 19, color: C.sub },
  visit: { ...CARD, padding: S.item, gap: S.tight },
  vDate: { fontSize: 17, fontWeight: '700', color: C.sub },
  vHospital: { fontSize: 22, fontWeight: '800', color: C.text },
  vSub: { fontSize: 17, lineHeight: 24, color: C.sub },
  vMore: { fontSize: 17, fontWeight: '800', color: C.primary, marginTop: 7 },
  dot: { fontSize: 54, textAlign: 'center', color: C.red },
  time: { fontSize: 48, fontWeight: '800', textAlign: 'center', color: C.text, marginBottom: 14 },
});
