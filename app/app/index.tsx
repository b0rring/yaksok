import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import BigButton from '../components/BigButton';
import { getHealth } from '../lib/api';

export default function Home() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    getHealth().then(setOnline);
  }, []);

  const soon = () => Alert.alert('준비 중이에요');

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>약속</Text>
      <View style={styles.buttons}>
        <BigButton label="약 찍기" onPress={soon} />
        <BigButton label="오늘 약" onPress={soon} color="#0D47A1" />
        <BigButton label="캘린더" onPress={soon} color="#E65100" />
      </View>
      <Text style={styles.status}>
        {online === null ? '서버 확인 중…' : online ? '서버 연결됨' : '서버에 연결되지 않았어요'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  title: { fontSize: 40, fontWeight: '800', textAlign: 'center', marginBottom: 32 },
  buttons: { gap: 20 },
  status: { fontSize: 20, textAlign: 'center', marginTop: 32, color: '#333' },
});
