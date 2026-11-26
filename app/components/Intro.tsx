import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { Text } from './AppText';

// 앱을 켤 때 한 번만 보이는 시작 화면 (Splash.dc.html 시안): 짙은 초록 바탕, 알약+체크 아이콘, "약(藥)속", 한 줄 문구.
// 이 화면만 시안의 초록·크림색을 쓰고 나머지 화면은 남색 테마다.
const BG = '#1F5E52';
const CREAM = '#FBF6EA';

export default function Intro() {
  const [done, setDone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const t = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setDone(true)), 1500);
    return () => clearTimeout(t);
  }, [opacity]);
  if (done) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity }]}>
      <View accessibilityLabel="약속 앱 아이콘">
        <Svg viewBox="0 0 512 512" width={132} height={132}>
          <Rect width={512} height={512} rx={116} fill="#17493F" />
          <G transform="translate(-14 -14) rotate(-45 256 256)">
            <Path d="M166 186H256V326H166A70 70 0 0 1 166 186Z" fill={CREAM} />
            <Path d="M256 186H346A70 70 0 0 1 346 326H256Z" fill="#F26B4B" />
            <Rect x={256} y={186} width={12} height={140} fill="#000000" opacity={0.14} />
            <Rect x={284} y={204} width={56} height={14} rx={7} fill="#FFFFFF" opacity={0.38} />
          </G>
          <Circle cx={372} cy={372} r={66} fill={BG} />
          <Circle cx={372} cy={372} r={52} fill={CREAM} />
          <Path d="M348 374L366 392L398 354" fill="none" stroke={BG} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={styles.texts}>
        <Text style={styles.logo}>약(藥)속</Text>
        <Text style={styles.sub}>내일의 나와 한 약속,{'\n'}오늘도 잊지 않게</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 36 },
  texts: { alignItems: 'center', gap: 12 },
  logo: { fontSize: 46, fontWeight: '700', color: CREAM, letterSpacing: 1 },
  sub: { fontSize: 20, lineHeight: 30, color: '#D9E6DF', textAlign: 'center' },
});
