import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Text } from './AppText';
import Icon from './Icon';
import { C } from '../lib/theme';

// 탭 밖 화면(결과·시간 고르기·보여주기·설정)의 왼쪽 위 버튼: 흰 알약 모양의 "‹ 뒤로".
// 이전 화면이 있으면 "뒤로", 없으면(새로고침·알림으로 바로 열린 경우) "홈으로" — 어디서 열어도 홈으로 돌아올 수 있다.
export default function HeaderLeft({ canGoBack }: { canGoBack?: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => (canGoBack ? router.back() : router.navigate('/'))}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8, paddingRight: 16, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name="left" size={22} color={C.primary} stroke={2.6} />
      <Text style={{ fontSize: 18, fontWeight: '800', color: C.primary }}>{canGoBack ? '뒤로' : '홈으로'}</Text>
    </Pressable>
  );
}
