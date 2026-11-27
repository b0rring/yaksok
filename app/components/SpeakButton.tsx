import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { useSettings } from '../lib/settings';
import { C } from '../lib/theme';
import Icon from './Icon';

// 화면 오른쪽 아래의 스피커 버튼. 누르면 text를 한국어로 읽어 주고, 읽는 중에 다시 누르면 멈춘다.
// 화면을 떠나면 읽기도 멈춘다. 읽는 속도는 설정에서 고른다.
export default function SpeakButton({ text, inline, wide, ai }: { text: string; inline?: boolean; wide?: boolean; ai?: boolean }) {
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
      style={({ pressed }) => [ai ? styles.aiPill : wide ? styles.wide : inline ? styles.small : styles.fab, on && !ai && (wide ? { borderColor: C.orange } : { backgroundColor: C.orange }), pressed && { opacity: 0.85 }]}
    >
      <Icon name={on ? 'stop' : 'speaker'} size={ai ? 20 : inline || wide ? 24 : 30} color={ai ? C.ai : wide ? (on ? C.orange : C.primary) : '#fff'} />
      {ai && <Text style={styles.aiText}>{on ? '멈추기' : '소리로 듣기'}</Text>}
      {wide && <Text style={[styles.wideText, on && { color: C.orange }]}>{on ? '멈추기' : '소리로 듣기'}</Text>}
      {inline && !wide && !ai && <Text style={styles.smallText}>{on ? '멈추기' : '듣기'}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 글 옆에 붙는 작은 "듣기" 버튼 (챗봇 답변)
  small: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 24, backgroundColor: C.primary },
  // 카드 안의 넓은 "소리로 듣기" 버튼: 흰 바탕 + 테두리
  wide: { minHeight: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border },
  wideText: { fontSize: 20, fontWeight: '800', color: C.primary },
  // AI 답변 아래의 작은 보라 "소리로 듣기"
  aiPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: 10, paddingRight: 14, borderRadius: 22, backgroundColor: C.aiSoft },
  aiText: { fontSize: 16, fontWeight: '800', color: C.ai },
  smallText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 28,
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
