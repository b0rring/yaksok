import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './AppText';
import Icon from './Icon';
import { C } from '../lib/theme';

// 홈 오른쪽 아래의 "약 물어보기" 버튼 (AI 챗봇). 읽어주기(스피커)는 정보를 보여주는 화면에 따로 둔다.
export default function ChatFab() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="약에 대해 물어보기"
      onPress={() => router.push('/chat')}
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
    >
      <Icon name="sparkles" size={24} color="#fff" />
      <Text style={styles.label}>물어보기</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    minWidth: 60,
    height: 60,
    borderRadius: 28,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: C.ai,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.ai,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
