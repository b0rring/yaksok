import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarView from '../../components/CalendarView';
import TabTitle from '../../components/TabTitle';
import { C, S } from '../../lib/theme';

// 캘린더 탭: 한 달 달력에서 날짜를 고르면 그날의 약·진료가 아래에 나온다 (주간 보기는 홈 아래에 있다).
export default function CalendarScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <TabTitle title="캘린더" />
        <CalendarView mode="month" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  wrap: { paddingHorizontal: S.page, paddingTop: 16, paddingBottom: 102, gap: S.section },
});
