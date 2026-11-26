import { StyleSheet, View } from 'react-native';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import { testIn5s } from '../lib/notify';
import { C, S } from '../lib/theme';

// 설정 화면. 지금은 알림 시험만 있고, 나중에 글자 크기·알림 시간·사용법 같은 설정을 여기에 모은다.
export default function Settings() {
  const ask = useDialog();
  return (
    <View style={styles.wrap}>
      <BigButton
        label="알림 시험 (5초 뒤)"
        onPress={async () => ask({ title: (await testIn5s()) ? '5초 뒤에 알림이 와요' : '알림을 켜 주세요' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: S.page, justifyContent: 'center', gap: S.gap },
});
