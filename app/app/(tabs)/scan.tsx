import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import BigButton from '../../components/BigButton';
import TabTitle from '../../components/TabTitle';
import { useDialog } from '../../components/Dialog';
import { useJobs } from '../../lib/jobs';
import { C } from '../../lib/theme';

// 약 찍기: 사진을 고르면 바로 홈으로 돌아가고, AI가 읽는 동안은 위쪽 카드("정리하고 있어요")가 알려 준다.
// 끝나면 카드의 "확인하기"에서 "알림과 캘린더에 추가할까요?"를 한 번 묻는다 (components/JobBanner.tsx).
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
      <View style={styles.titleBox}>
        <TabTitle title="약 찍기" />
      </View>
      <View style={styles.wrap}>
      <Image source={require('../../assets/main.jpg')} style={styles.photo} />
      <Text style={styles.text}>약 봉투나 약을 찍어 주세요</Text>
      <BigButton label="사진 찍기" onPress={() => run(true)} />
      <BigButton label="앨범에서 고르기" onPress={() => run(false)} variant="secondary" small />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  titleBox: { paddingHorizontal: 20, paddingTop: 8 },
  wrap: { flex: 1, padding: 20, justifyContent: 'center', gap: 16 },
  photo: { width: '100%', height: 160, borderRadius: 16 },
  text: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: C.text },
});
