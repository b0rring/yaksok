import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Icon, { IconName } from './Icon';
import { C } from '../lib/theme';

// 구역: 한 줄 제목(초록 아이콘 24 + 제목 22 굵게, 오른쪽에 "전체 보기 ›" 링크) 아래에 내용 카드들을 따로 놓는다.
export default function Section({ icon, title, children, action, onAction }: { icon: IconName; title: string; children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <Icon name={icon} size={24} color={C.primary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {!!action && (
          <Pressable accessibilityRole="link" onPress={onAction} style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}>
            <Text style={styles.linkText}>{action}</Text>
            <Icon name="right" size={20} color={C.primary} stroke={2.6} />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 44 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { fontSize: 18, fontWeight: '800', color: C.primary },
});
