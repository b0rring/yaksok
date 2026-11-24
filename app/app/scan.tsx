import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import BigButton from '../components/BigButton';
import { scanImage } from '../lib/api';

export default function Scan() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async (camera: boolean) => {
    const opts = { mediaTypes: ['images'] as ImagePicker.MediaType[], quality: 0.7 };
    if (camera) {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) return Alert.alert('카메라를 켜 주세요', '설정에서 카메라를 허용해 주세요.');
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    setBusy(true);
    try {
      const data = await scanImage(res.assets[0].uri);
      router.push({ pathname: '/result', params: { data: JSON.stringify(data) } });
    } catch {
      Alert.alert('약을 읽지 못했어요', '잠시 뒤에 다시 해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>약 봉투나 약을 찍어 주세요</Text>
      {busy ? (
        <ActivityIndicator size="large" />
      ) : (
        <View style={styles.buttons}>
          <BigButton label="사진 찍기" onPress={() => run(true)} />
          <BigButton label="앨범에서 고르기" onPress={() => run(false)} color="#0D47A1" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  text: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 32 },
  buttons: { gap: 20 },
});
