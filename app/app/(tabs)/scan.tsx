import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/AppText';
import BigButton from '../../components/BigButton';
import { useDialog } from '../../components/Dialog';
import Icon, { IconName } from '../../components/Icon';
import { useJobs } from '../../lib/jobs';
import { CARD, C, S } from '../../lib/theme';

const MEDS: [IconName, string][] = [['pill', '약 봉투'], ['note', '처방전'], ['box', '약 상자']];
const DOCS: [IconName, string][] = [['person', '의사 소견서'], ['record', '진료 기록서'], ['clock', '검사 결과지']];
const STEPS: [string, string][] = [
  ['AI가 사진을 읽어요', '다른 화면을 보셔도 돼요'],
  ['쉬운 말로 정리해요', '약은 효과와 먹는 법, 서류는 의사 선생님 말씀을 정리해요'],
  ['알맞은 곳에 넣어요', '약은 알림과 달력에, 서류는 진료 기록에 넣어요. 한 번만 확인하면 끝'],
];

// 찍는 틀 그림: 약 봉투와 소견서가 겹쳐 있고 네 모서리에 틀 표시
const Corner = ({ pos }: { pos: object }) => <View style={[styles.corner, pos]} />;
function Frame() {
  return (
    <View accessible accessibilityLabel="약 봉투와 소견서를 네모 안에 맞춰 찍는 그림" style={styles.frame}>
      <Corner pos={{ top: 24, left: 24, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 10 }} />
      <Corner pos={{ top: 24, right: 24, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 10 }} />
      <Corner pos={{ bottom: 24, left: 24, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 10 }} />
      <Corner pos={{ bottom: 24, right: 24, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 10 }} />
      <Paper title="약 봉투" ring="#E7B9A5" style={{ left: 78, top: 54, transform: [{ rotate: '-8deg' }] }} />
      <Paper title="소견서" ring="#9FC2B5" style={{ left: 164, top: 46, transform: [{ rotate: '6deg' }] }} />
    </View>
  );
}
function Paper({ title, ring, style }: { title: string; ring: string; style: object }) {
  return (
    <View style={[styles.paper, style]}>
      <Text style={styles.paperTitle}>{title}</Text>
      <View style={styles.line} />
      <View style={[styles.line, { width: '80%' }]} />
      <View style={[styles.line, { width: '90%' }]} />
      <View style={[styles.line, { width: '60%' }]} />
      <View style={[styles.stamp, { borderColor: ring }]} />
    </View>
  );
}

function Kinds({ title, to, items }: { title: string; to: string; items: [IconName, string][] }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.kindHead}>
        <Text style={styles.kindTitle}>{title}</Text>
        <View style={styles.to}>
          <Icon name="right" size={16} color="#2F5A43" stroke={2.6} />
          <Text style={styles.toText}>{to}</Text>
        </View>
      </View>
      <View style={styles.kindRow}>
        {items.map(([icon, label]) => (
          <View key={label} style={styles.kindItem}>
            <View style={styles.kindIcon}>
              <Icon name={icon} size={22} color={C.primary} />
            </View>
            <Text style={styles.kindLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 약 찍기: 사진을 고르면 바로 홈으로 돌아가고, AI가 읽는 동안은 위쪽 카드("정리하고 있어요")가 알려 준다.
// 약이면 알림·캘린더로, 약이 아니면(병원 서류) 진료 기록으로 정리한다. 끝나면 카드의 "확인하기"에서 한 번 묻는다 (components/JobBanner.tsx).
export default function Scan() {
  const router = useRouter();
  const ask = useDialog();
  const { startScan } = useJobs();
  const started = useRef(false);

  const run = async (camera: boolean) => {
    const opts = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7 };
    let res: ImagePicker.ImagePickerResult;
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
        return ask({ title: '카메라를 켜 주세요', message: '설정에서 카메라를 허용해 주세요.' });
      res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    } catch {
      return ask({ title: '사진을 가져오지 못했어요', message: '다시 눌러 주세요.' });
    }
    if (res.canceled) return router.canGoBack() ? router.back() : router.navigate('/');
    startScan(res.assets[0].uri);
    router.navigate('/');
  };

  // 가장 쉬운 길: 화면이 열리면 바로 카메라가 켜진다. 앨범은 아래 버튼으로.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run(true);
  }, []);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>약 찍기</Text>
        </View>

        <Frame />
        <Text style={styles.guide}>{'약이나 병원 서류를\n네모 안에 맞춰 찍어 주세요'}</Text>

        <View style={{ gap: 12 }}>
          <BigButton label="사진 찍기" icon="camera" onPress={() => run(true)} />
          <BigButton label="앨범에서 고르기" icon="image" onPress={() => run(false)} variant="secondary" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>이런 것을 찍을 수 있어요</Text>
          <Kinds title="약" to="내 약과 알림으로" items={MEDS} />
          <Kinds title="병원 서류" to="진료 기록으로" items={DOCS} />
          <Text style={styles.note}>무엇을 찍었는지는 AI가 알아서 알아봐요. 따로 고르지 않아도 돼요.</Text>
        </View>

        <View style={[styles.card, { gap: 16 }]}>
          <Text style={styles.cardTitle}>찍으면 이렇게 돼요</Text>
          {STEPS.map(([t, d], i) => (
            <View key={t} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stepTitle}>{t}</Text>
                <Text style={styles.stepDesc}>{d}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  wrap: { paddingHorizontal: S.page, paddingTop: 16, paddingBottom: 120, gap: 28 },
  titleRow: { minHeight: 48, justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: C.text },
  frame: { height: 260, borderRadius: 24, backgroundColor: C.frame, overflow: 'hidden' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#fff' },
  paper: { position: 'absolute', zIndex: 1, width: 128, height: 160, borderRadius: 10, backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 14, gap: 9, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  paperTitle: { fontSize: 15, fontWeight: '900', color: C.primary },
  line: { height: 7, borderRadius: 4, backgroundColor: C.fill },
  stamp: { marginTop: 'auto', width: 34, height: 34, borderRadius: 17, borderWidth: 3, alignSelf: 'flex-end' },
  guide: { marginTop: -8, fontSize: 22, lineHeight: 32, fontWeight: '800', textAlign: 'center', color: C.text },
  card: { ...CARD, padding: S.pad, gap: 20 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  kindHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kindTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  to: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, backgroundColor: C.done, paddingHorizontal: 10, paddingVertical: 3 },
  toText: { fontSize: 16, fontWeight: '800', color: '#2F5A43' },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindItem: { flex: 1, minHeight: 116, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 4 },
  kindIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  kindLabel: { fontSize: 16, fontWeight: '800', lineHeight: 20, textAlign: 'center', color: C.text },
  note: { fontSize: 16, lineHeight: 24, color: C.sub },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  stepTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  stepDesc: { fontSize: 16, lineHeight: 24, color: C.sub },
});
