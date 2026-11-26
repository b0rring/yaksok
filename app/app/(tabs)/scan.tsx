import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import BigButton from '../../components/BigButton';
import { useDialog } from '../../components/Dialog';
import { ScanResult, scanImage } from '../../lib/api';
import { scheduleSlots } from '../../lib/notify';
import { Slot, addPlan, allActiveSlots, hasDuplicate, slotLabel } from '../../lib/store';
import { C } from '../../lib/theme';

export default function Scan() {
  const router = useRouter();
  const ask = useDialog();
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const goResult = (data: ScanResult, added: boolean) =>
    router.push({ pathname: '/result', params: { data: JSON.stringify(data), added: added ? '1' : '' } });

  const add = async (data: ScanResult) => {
    await addPlan({ drugs: data.drugs.map((d) => d.name), slots: data.schedule.slots as Slot[], days: data.schedule.days });
    if (!(await scheduleSlots(await allActiveSlots()))) ask({ title: '알림을 켜 주세요', message: '설정에서 알림을 허용해 주세요.' });
    goResult(data, true);
  };

  // 사진을 읽은 직후 "알림과 캘린더에 추가할까요?" 한 번만 묻는다. 같은 약이 이미 있으면 한 번 더 묻는다.
  const confirm = (data: ScanResult) => {
    const names = data.drugs.map((d) => d.name);
    const when = data.schedule.slots.map(slotLabel).join(', ');
    ask({
      title: '알림과 캘린더에 추가할까요?',
      message: `${names.join(', ')}\n\n${when} · ${data.schedule.days}일 동안`,
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
    setBusy(true);
    try {
      confirm(await scanImage(res.assets[0].uri));
    } catch (e) {
      const noDrug = e instanceof Error && e.message === '422';
      ask({ title: noDrug ? '약을 찾지 못했어요' : '약을 읽지 못했어요', message: noDrug ? '약 이름이 잘 보이게 다시 찍어 주세요.' : '잠시 뒤에 다시 해 주세요.' });
    } finally {
      setBusy(false);
    }
  };

  // 가장 쉬운 길: 화면이 열리면 바로 카메라가 켜진다. 앨범은 아래 버튼으로.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run(true);
  }, []);

  return (
    <View style={styles.wrap}>
      {busy ? (
        <>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={styles.text}>약을 읽고 있어요…</Text>
        </>
      ) : (
        <>
          <Image source={require('../../assets/main.jpg')} style={styles.photo} />
          <Text style={styles.text}>약 봉투나 약을 찍어 주세요</Text>
          <BigButton label="사진 찍기" onPress={() => run(true)} />
          <BigButton label="앨범에서 고르기" onPress={() => run(false)} variant="secondary" small />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center', gap: 20 },
  photo: { width: '100%', height: 160, borderRadius: 20 },
  text: { fontSize: 28, fontWeight: '800', textAlign: 'center', color: C.text },
});
