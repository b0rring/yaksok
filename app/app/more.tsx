import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import BigButton from '../components/BigButton';
import { testIn5s } from '../lib/notify';

export default function More() {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <BigButton label="가족 목소리 녹음" onPress={() => router.push('/record')} />
      <BigButton
        label="알림 시험 (5초 뒤)"
        color="#0D47A1"
        onPress={async () => Alert.alert((await testIn5s()) ? '5초 뒤에 알림이 와요' : '알림을 켜 주세요')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center', gap: 20 },
});
