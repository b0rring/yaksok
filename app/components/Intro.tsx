import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { C } from '../lib/theme';

// 앱을 켤 때 한 번만 보이는 시작 화면. 그 뒤로는 화면 위에 "약속" 글자를 계속 두지 않는다.
export default function Intro() {
  const [done, setDone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const t = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setDone(true)), 1300);
    return () => clearTimeout(t);
  }, [opacity]);
  if (done) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity }]}>
      <Text style={styles.logo}>약속</Text>
      <Text style={styles.sub}>어려운 약, 쉽게 챙겨요</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logo: { fontSize: 64, fontWeight: '800', color: C.primary },
  sub: { fontSize: 22, color: C.sub },
});
