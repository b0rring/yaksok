import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import Icon from '../../components/Icon';
import BigButton from '../../components/BigButton';
import { sendVoice } from '../../lib/api';
import { addVisit } from '../../lib/store';
import { C } from '../../lib/theme';

type Phase = 'idle' | 'recording' | 'saving';

// 가장 쉬운 길: 홈의 "진료 녹음"을 누르면 바로 녹음 시작 → "끝내기" → 받아쓰기·요약 후 캘린더에 자동 저장.
export default function Record() {
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<Phase>('idle');
  const [sec, setSec] = useState(0);
  const started = useRef(false);

  const start = async () => {
    if (!(await requestRecordingPermissionsAsync()).granted)
      return Alert.alert('마이크를 켜 주세요', '설정에서 마이크를 허용해 주세요.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setSec(0);
    setPhase('recording');
  };

  const finish = async () => {
    setPhase('saving');
    try {
      await recorder.stop();
      const summary = await sendVoice(recorder.uri!);
      const visit = await addVisit(summary);
      router.push({ pathname: '/show', params: { id: visit.id, saved: '1' } });
    } catch {
      Alert.alert('저장하지 못했어요', '다시 녹음해 주세요.');
      setPhase('idle');
    }
  };

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
          <ActivityIndicator size="large" color={C.red} />
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
        </>
      ) : (
        <>
          <View style={styles.micCircle}>
            <Icon name="mic" size={48} color={C.primary} />
          </View>
          <Text style={styles.text}>녹음을 시작할까요?</Text>
          <Text style={styles.hint}>의사 선생님 말씀이 글로 정리돼요</Text>
          <BigButton label="녹음 시작" onPress={start} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center', gap: 20 },
  text: { fontSize: 28, fontWeight: '800', textAlign: 'center', color: C.text },
  micCircle: { alignSelf: 'center', width: 96, height: 96, borderRadius: 48, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 20, textAlign: 'center', color: C.sub, marginBottom: 12 },
  dot: { fontSize: 64, textAlign: 'center', color: C.red },
  time: { fontSize: 56, fontWeight: '900', textAlign: 'center', color: C.text, marginBottom: 16 },
});
