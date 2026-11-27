import * as ImagePicker from 'expo-image-picker';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import BigButton from '../../components/BigButton';
import { useDialog } from '../../components/Dialog';
import TabTitle from '../../components/TabTitle';
import Icon from '../../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJobs } from '../../lib/jobs';
import { useCalendarData } from '../../lib/calendarData';
import { addDays, today } from '../../lib/store';
import { C, CARD, S } from '../../lib/theme';

type Phase = 'idle' | 'recording';
type Period = 'all' | 'month' | '3m';
const PERIODS: { id: Period; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'month', label: '이번 달' },
  { id: '3m', label: '최근 3개월' },
];

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
  const [period, setPeriod] = useState<Period>('all');
  const [hosp, setHosp] = useState('all'); // 병원 이름 또는 'all'
  const { startVisit, version } = useJobs();
  // 진료 기록이 새로 저장되면 목록을 다시 불러온다
  useEffect(() => {
    reload();
  }, [version]);

  // 걸러 보기: 기간 + 병원. 병원이 둘 이상일 때만 병원 칩을 보여 준다
  const hospitals = [...new Set(visits.map((v) => v.hospital).filter(Boolean))];
  const since = period === 'month' ? `${today().slice(0, 7)}-01` : period === '3m' ? addDays(today(), -90) : '';
  const shown = [...visits]
    .filter((v) => (!since || v.date >= since) && (hosp === 'all' || v.hospital === hosp))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const filtered = period !== 'all' || hosp !== 'all';

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

  const Chips = ({ options, value, onPick }: { options: { id: string; label: string }[]; value: string; onPick: (id: string) => void }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
      {options.map((o) => (
        <Pressable key={o.id} accessibilityRole="button" accessibilityState={{ selected: o.id === value }} onPress={() => onPick(o.id)} style={[styles.chip, o.id === value && styles.chipOn]}>
          <Text style={[styles.chipText, o.id === value && { color: '#fff' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.page }}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <TabTitle title="기록" />
        {phase === 'recording' ? (
          <View style={[styles.startCard, styles.recCard]}>
            <View style={styles.recOuter}>
              <View style={styles.recMid} />
              <View style={styles.recMic}>
                <Icon name="mic" size={34} color="#fff" />
              </View>
            </View>
            <View style={styles.recLabel}>
              <View style={styles.recDot} />
              <Text style={styles.recLabelText}>녹음하고 있어요</Text>
            </View>
            <Text style={styles.time}>
              {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
            </Text>
            <View accessibilityElementsHidden style={styles.bars}>
              {BARS.map((h, i) => (
                <View key={i} style={[styles.bar, { height: h }]} />
              ))}
            </View>
            <Text style={styles.recHint}>{'의사 선생님 말씀을 녹음하고 있어요.\n휴대폰을 가까이 두세요.'}</Text>
            <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
              <BigButton label="끝내기" icon="stop" color={C.red} onPress={finish} />
              <BigButton label="녹음 취소" variant="secondary" onPress={cancel} />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.startCard}>
              <View style={styles.micCircle}>
                <Icon name="mic" size={34} color={C.primary} />
              </View>
              <Text style={styles.startTitle}>진료 녹음</Text>
              <Text style={styles.hint}>{'의사 선생님 말씀을 녹음하면\n글로 정리해서 오늘 날짜에 넣어 드려요'}</Text>
              <BigButton label="녹음 시작" icon="mic" onPress={start} />
              <View style={styles.pair}>
                <View style={{ flex: 1 }}><BigButton label="사진 추가" icon="camera" variant="secondary" onPress={addPhoto} /></View>
                <View style={{ flex: 1 }}><BigButton label="직접 쓰기" icon="edit" variant="secondary" onPress={() => router.push('/visit-edit')} /></View>
              </View>
            </View>

            <View style={styles.group}>
              <View style={styles.sectionRow}>
                <View style={styles.sectionTitle}>
                  <Icon name="note" size={24} color={C.primary} />
                  <Text style={styles.section}>지난 진료 기록</Text>
                </View>
                {visits.length > 0 && <Text style={styles.count}>{shown.length}건</Text>}
              </View>
              {visits.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Chips options={PERIODS} value={period} onPick={(id) => setPeriod(id as Period)} />
                  {hospitals.length > 1 && <Chips options={[{ id: 'all', label: '모든 병원' }, ...hospitals.map((h) => ({ id: h, label: h }))]} value={hosp} onPick={setHosp} />}
                </View>
              )}
              {!visits.length && <Text style={styles.empty}>아직 진료 기록이 없어요</Text>}
              {!!visits.length && !shown.length && <Text style={styles.empty}>조건에 맞는 기록이 없어요. 위에서 다른 기간이나 병원을 골라 보세요.</Text>}
              {shown.map((v) => (
                <View key={v.id} style={styles.visit}>
                  <View style={styles.vTop}>
                    <View style={styles.dateChip}>
                      <Icon name="calendar" size={18} color={C.primary} stroke={2.4} />
                      <Text style={styles.dateText}>{v.date.replace(/^\d+-0?(\d+)-0?(\d+)$/, '$1월 $2일')}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel="진료 기록 고치기" onPress={() => router.push({ pathname: '/visit-edit', params: { id: v.id } })} style={styles.pen}>
                      <Icon name="edit" size={22} color={C.primary} />
                    </Pressable>
                  </View>
                  <View style={styles.vBody}>
                    <Text style={styles.vHospital}>{v.hospital}</Text>
                    {!!v.reason && <Text style={styles.vReason}>{v.reason}</Text>}
                    {!!v.summary && <Text style={styles.vSub} numberOfLines={2}>{v.summary}</Text>}
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/show', params: { id: v.id } })} style={({ pressed }) => [styles.vFoot, pressed && { opacity: 0.8 }]}>
                    <Icon name="person" size={22} color={C.primary} />
                    <Text style={styles.vMore}>의사에게 보여주기</Text>
                    <Icon name="right" size={22} color={C.primary} stroke={2.6} />
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// 녹음 중 소리 막대(모양만, 실제 소리 크기와 상관없다)
const BARS = [12, 22, 34, 18, 40, 28, 14, 36, 24, 44, 20, 30, 16, 38, 26, 12, 22, 32];

const styles = StyleSheet.create({
  list: { paddingHorizontal: S.page, paddingTop: 16, paddingBottom: 102, gap: S.section },
  group: { gap: 12 },
  pair: { flexDirection: 'row', gap: 8 },
  startCard: { ...CARD, padding: S.pad, gap: 12 },
  micCircle: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  startTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: C.text },
  hint: { fontSize: 18, lineHeight: 26, textAlign: 'center', color: C.sub, marginBottom: 4 },
  recCard: { alignItems: 'center', paddingTop: 40, paddingBottom: 24, gap: 16 },
  recOuter: { width: 140, height: 140, borderRadius: 70, backgroundColor: C.recBg, alignItems: 'center', justifyContent: 'center' },
  recMid: { position: 'absolute', top: 18, left: 18, right: 18, bottom: 18, borderRadius: 52, backgroundColor: C.recMid },
  recMic: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' },
  recLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.red },
  recLabelText: { fontSize: 18, fontWeight: '800', color: C.red },
  time: { fontSize: 56, fontWeight: '900', letterSpacing: 1, color: C.text },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 48 },
  bar: { width: 5, borderRadius: 3, backgroundColor: C.primary, opacity: 0.75 },
  recHint: { fontSize: 18, lineHeight: 26, color: C.sub, textAlign: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontSize: 18, fontWeight: '700', color: C.sub },
  section: { fontSize: 22, fontWeight: '800', color: C.text },
  chipScroll: { marginHorizontal: -S.page, flexGrow: 0 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: S.page },
  chip: { minHeight: 44, borderRadius: 22, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 16, justifyContent: 'center' },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 18, fontWeight: '800', color: C.primary },
  empty: { fontSize: 18, color: C.sub },
  visit: { ...CARD, padding: S.pad, gap: 12 },
  vTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, backgroundColor: C.fill, paddingHorizontal: 10, paddingVertical: 3 },
  dateText: { fontSize: 16, fontWeight: '800', color: C.primary },
  pen: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  vBody: { gap: 4 },
  vHospital: { fontSize: 20, fontWeight: '800', color: C.text },
  vReason: { fontSize: 18, fontWeight: '800', color: C.text },
  vSub: { fontSize: 18, lineHeight: 26, color: C.sub },
  vFoot: { minHeight: 52, borderRadius: 14, backgroundColor: C.soft, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  vMore: { flex: 1, fontSize: 18, fontWeight: '800', color: C.primary },
});
