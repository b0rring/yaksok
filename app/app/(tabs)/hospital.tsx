import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { C, CARD, S } from '../../lib/theme';

// 병원 탭 자리 (5단계 맞춤 병원 안내는 아직 만들지 않았다).
export default function Hospital() {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.wrap}>
        <View style={styles.circle}>
          <Icon name="hospital" size={48} color={C.primary} />
        </View>
        <Text style={styles.title}>가까운 병원·약국</Text>
        <Text style={styles.sub}>지금은 준비 중이에요.{'\n'}곧 알려 드릴게요.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { flex: 1, padding: S.page, alignItems: 'center', justifyContent: 'center', gap: S.gap },
  circle: { ...CARD, width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: C.text },
  sub: { fontSize: 22, lineHeight: 32, color: C.sub, textAlign: 'center' },
});
