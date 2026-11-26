import { Platform, Text as RNText, StyleSheet, TextProps } from 'react-native';
import { useSettings } from '../lib/settings';

// 한글은 단어 중간에서 줄이 바뀌지 않게 한다 (웹: keep-all, iOS: hangul-word)
const KEEP = Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as object) : null;

// 앱의 모든 글자는 이것을 쓴다. 설정의 글씨 크기 배율을 fontSize·lineHeight에 곱한다.
export function Text({ style, ...rest }: TextProps) {
  const { scale } = useSettings();
  if (scale === 1) return <RNText lineBreakStrategyIOS="hangul-word" style={[KEEP, style]} {...rest} />;
  const f = StyleSheet.flatten(style) ?? {};
  return (
    <RNText
      lineBreakStrategyIOS="hangul-word"
      {...rest}
      style={[KEEP, f, f.fontSize ? { fontSize: f.fontSize * scale } : null, f.lineHeight ? { lineHeight: f.lineHeight * scale } : null]}
    />
  );
}
