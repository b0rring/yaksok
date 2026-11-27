import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Icon, { IconName } from './Icon';
import { C } from '../lib/theme';

// 홈의 구역: 진한 초록 제목 막대(헤더) 아래에, 같은 초록 테두리의 본 요소 칸이 이어 붙는다.
// 헤더를 상자 안에 가두지 않고 헤더에서 본 요소로 "이어지는" 모양이라, 제목과 내용이 한 구역으로 읽힌다.
export default function Section({ icon, title, children, flush }: { icon: IconName; title: string; children: ReactNode; flush?: boolean }) {
  return (
    <View style={!flush && styles.gap}>
      <View style={styles.head}>
        <Icon name={icon} size={24} color="#fff" />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 8 }, // 구역 사이 (홈의 기본 간격 16 + 8 = 24)
  head: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: C.primary, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  body: { padding: 8, gap: 8, backgroundColor: '#fff', borderWidth: 2, borderTopWidth: 0, borderColor: C.primary, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
});
