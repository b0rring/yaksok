import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { useSettings } from '../lib/settings';
import { C } from '../lib/theme';
import Icon from './Icon';

// 화면 오른쪽 아래의 스피커 버튼. 누르면 text를 한국어로 읽어 주고, 읽는 중에 다시 누르면 멈춘다.
// 화면을 떠나면 읽기도 멈춘다. 읽는 속도는 설정에서 고른다.
export default function SpeakButton({ text, inline }: { text: string; inline?: boolean }) {
  const { rate } = useSettings();
  const [on, setOn] = useState(false);
  useEffect(() => () => void Speech.stop(), []);

  const press = () => {
    if (on) {
      Speech.stop();
      setOn(false);
      return;
    }
    setOn(true);
    const end = () => setOn(false);
    Speech.speak(text, { language: 'ko-KR', rate, onDone: end, onStopped: end, onError: end });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? '읽기 멈추기' : '소리로 읽어주기'}
      onPress={press}
      style={({ pressed }) => [inline ? styles.small : styles.fab, on && { backgroundColor: C.orange }, pressed && { opacity: 0.85 }]}
    >
      <Icon name={on ? 'stop' : 'speaker'} size={inline ? 24 : 30} color="#fff" />
      {inline && <Text style={styles.smallText}>{on ? '멈추기' : '듣기'}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 글 옆에 붙는 작은 "듣기" 버튼 (챗봇 답변)
  small: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 18, borderRadius: 26, backgroundColor: C.primary },
  smallText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
