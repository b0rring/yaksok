import { Alert, StyleSheet, View } from 'react-native';
import BigButton from '../components/BigButton';
import { testIn5s } from '../lib/notify';
import { C } from '../lib/theme';

export default function More() {
  return (
    <View style={styles.wrap}>
      <BigButton
        label="알림 시험 (5초 뒤)"
        color={C.blue}
        onPress={async () => Alert.alert((await testIn5s()) ? '5초 뒤에 알림이 와요' : '알림을 켜 주세요')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center', gap: 20 },
});
