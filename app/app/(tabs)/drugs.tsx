import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/AppText';
import TabTitle from '../../components/TabTitle';
import BigButton from '../../components/BigButton';
import PlanList from '../../components/PlanList';
import { C, S } from '../../lib/theme';
import { useTodayMeds } from '../../lib/useTodayMeds';

// 내 약 = 약 정보 탭: 무슨 병 때문에 받은 약인지로 묶어 보고, 약마다 설명을 펼쳐 본다. 복용 체크는 홈에서.
export default function Drugs() {
  const router = useRouter();
  const { all, reload } = useTodayMeds();
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <TabTitle title="내 약" />
        {all.length ? (
          <View style={{ marginTop: -12 }}>
            <PlanList all={all} reload={reload} />
          </View>
        ) : (
          <View style={{ gap: S.gap }}>
            <Text style={styles.empty}>아직 등록한 약이 없어요</Text>
            <BigButton label="약 사진 찍어서 추가" onPress={() => router.navigate('/scan')} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  wrap: { paddingHorizontal: S.page, paddingTop: 16, paddingBottom: 102, gap: S.section },
  empty: { fontSize: 20, color: C.sub, textAlign: 'center', marginTop: 20 },
});
