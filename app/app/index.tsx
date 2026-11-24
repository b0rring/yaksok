import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import BigButton from '../components/BigButton';
import { getHealth } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    getHealth().then(setOnline);
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>약속</Text>
      <View style={styles.buttons}>
        <BigButton label="약 찍기" onPress={() => router.push('/scan')} />
        <BigButton label="오늘 약" onPress={() => router.push('/today')} color="#0D47A1" />
        <BigButton label="캘린더" onPress={() => router.push('/calendar')} color="#E65100" />
      </View>
      <Pressable onPress={() => router.push('/more')} style={styles.more}>
        <Text style={styles.moreText}>더보기</Text>
      </Pressable>
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
  more: { alignSelf: 'center', marginTop: 24, padding: 12 },
  moreText: { fontSize: 20, color: '#555', textDecorationLine: 'underline' },
  status: { fontSize: 20, textAlign: 'center', marginTop: 32, color: '#333' },
});
