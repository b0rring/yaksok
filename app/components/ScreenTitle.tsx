import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './AppText';
import HeaderLeft from './HeaderLeft';
import { C } from '../lib/theme';

// 탭 밖 화면의 맨 위: 흰 알약 모양 "‹ 뒤로" 버튼, 8 아래에 큰 제목(30). 시스템 제목줄 대신 화면 안에 두어서
// 기기마다 제목줄 높이가 달라 간격이 틀어지지 않는다. 위쪽 안전 영역(노치)은 SafeAreaView가 띄운다. (훅 값은 스택 화면에서 0으로 나와 뒤로 버튼이 상태줄에 겹쳤다)
export default function ScreenTitle({ text }: { text: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={styles.box}>
      <HeaderLeft canGoBack={router.canGoBack()} />
      <Text accessibilityRole="header" style={styles.title}>
        {text}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: C.text, minHeight: 48 },
});
