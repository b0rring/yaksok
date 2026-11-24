import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import BigButton from '../components/BigButton';
import { saveVoice } from '../lib/store';
import { playVoice } from '../lib/voice';

export default function Record() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [on, setOn] = useState(false);
  const [saved, setSaved] = useState(false);

  const start = async () => {
    if (!(await requestRecordingPermissionsAsync()).granted)
      return Alert.alert('마이크를 켜 주세요', '설정에서 마이크를 허용해 주세요.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setOn(true);
  };

  const stop = async () => {
    await recorder.stop();
    setOn(false);
    // ponytail: 녹음 파일을 임시 폴더 그대로 씀. 문서 폴더로 복사는 필요할 때.
    if (recorder.uri) {
      await saveVoice(recorder.uri);
      setSaved(true);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{on ? '녹음하고 있어요…' : '약 드실 때 들려줄 말을 녹음해 주세요'}</Text>
      <BigButton label={on ? '녹음 끝내기' : '녹음 시작'} color={on ? '#C62828' : '#1B5E20'} onPress={on ? stop : start} />
      {saved && !on && <BigButton label="들어보기" color="#0D47A1" onPress={playVoice} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center', gap: 20 },
  text: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
});
