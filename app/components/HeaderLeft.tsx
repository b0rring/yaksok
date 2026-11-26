import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Text } from './AppText';
import { C } from '../lib/theme';

// 탭 밖 화면(결과·시간 고르기·보여주기·설정)의 왼쪽 위 버튼.
// 이전 화면이 있으면 "뒤로", 없으면(새로고침·알림으로 바로 열린 경우) "홈으로" — 어디서 열어도 홈으로 돌아올 수 있다.
export default function HeaderLeft({ canGoBack }: { canGoBack?: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => (canGoBack ? router.back() : router.navigate('/'))}
      style={({ pressed }) => ({ minHeight: 37, justifyContent: 'center', paddingHorizontal: 7, opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ fontSize: 17, fontWeight: '800', color: C.primary }}>{canGoBack ? '‹ 뒤로' : '‹ 홈으로'}</Text>
    </Pressable>
  );
}
