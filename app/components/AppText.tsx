import { Platform, Text as RNText, StyleSheet, TextProps } from 'react-native';
import { useSettings } from '../lib/settings';

// 한글은 단어 중간에서 줄이 바뀌지 않게 한다 (웹: keep-all, iOS: hangul-word)
const KEEP = Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as object) : null;

// 줄 높이를 정하지 않은 글자는 시안(Noto Sans KR의 기본 줄 높이)과 같은 1.45배로 둔다.
// iOS는 글자마다 줄 높이가 달라서(한글만 있는 줄과 띄어쓰기·숫자가 섞인 줄이 다름) 나란한 글자의 높이·위치가 어긋났다.
const LINE = 1.45;

// 앱의 모든 글자는 이것을 쓴다. 설정의 글씨 크기 배율을 fontSize·lineHeight에 곱한다.
export function Text({ style, ...rest }: TextProps) {
  const { scale } = useSettings();
  const f = StyleSheet.flatten(style) ?? {};
  const size = f.fontSize;
  const line = f.lineHeight ?? (size ? Math.round(size * LINE) : undefined);
  return (
    <RNText
      lineBreakStrategyIOS="hangul-word"
      {...rest}
      style={[KEEP, f, size ? { fontSize: size * scale } : null, line ? { lineHeight: line * scale } : null]}
    />
  );
}
