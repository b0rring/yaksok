import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { useDialog } from './Dialog';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C, S } from '../lib/theme';

// 모든 탭 맨 위의 제목: 왼쪽 정렬, 탭 이름과 같은 글, 오른쪽에는 필요할 때만 버튼. 첫 구역과는 가깝게(wrap의 구역 간격을 되돌림).
// 보호자가 연결된 환자의 화면으로 전환해 있으면 제목 아래에 "누구 화면인지"와 돌아가는 버튼을 항상 보여 준다.
export default function TabTitle({ title, right, below }: { title: string; right?: ReactNode; below?: ReactNode }) {
  const { viewing, switchTo } = useAuth();
  const ask = useDialog();
  return (
    <View style={{ marginBottom: -S.gap }}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {right}
      </View>
      {below}
      {!!viewing && (
        <View style={styles.band}>
          <Text style={styles.bandText}>{viewing.name}님 화면이에요</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => switchTo(null).catch((e) => ask({ title: '돌아가지 못했어요', message: e instanceof ApiError ? e.message : '다시 해 주세요.' }))}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backText}>내 화면으로</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  title: { fontSize: 30, fontWeight: '800', color: C.text },
  band: { marginTop: S.in, minHeight: 56, borderRadius: 16, backgroundColor: C.primary, paddingLeft: S.item, paddingRight: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.in },
  bandText: { flexShrink: 1, fontSize: 18, fontWeight: '800', color: '#fff' },
  back: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 16, fontWeight: '800', color: C.primary },
});
