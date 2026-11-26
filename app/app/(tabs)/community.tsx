import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/AppText';
import Icon from '../../components/Icon';
import { C, CARD, S } from '../../lib/theme';

// 커뮤니티 탭 자리 (6단계 환자·의사 커뮤니티는 아직 만들지 않았다. 로그인·서버가 먼저 필요하다).
export default function Community() {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.wrap}>
        <View style={styles.circle}>
          <Icon name="users" size={41} color={C.primary} />
        </View>
        <Text style={styles.title}>커뮤니티</Text>
        <Text style={styles.sub}>지금은 준비 중이에요.{'\n'}곧 만나요.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flex: 1, padding: S.page, alignItems: 'center', justifyContent: 'center', gap: S.gap },
  circle: { ...CARD, width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  sub: { fontSize: 19, lineHeight: 27, color: C.sub, textAlign: 'center' },
});
