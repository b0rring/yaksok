import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BigButton from '../components/BigButton';
import { getHealth } from '../lib/api';
import { C } from '../lib/theme';

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
        <BigButton label="📷  약 찍기" onPress={() => router.push('/scan')} color={C.green} />
        <BigButton label="🎙️  진료 녹음" onPress={() => router.push('/record')} color={C.red} />
        <BigButton label="💊  오늘 약" onPress={() => router.push('/today')} color={C.blue} />
        <BigButton label="📅  캘린더" onPress={() => router.push('/calendar')} color={C.orange} />
      </View>
      <Pressable onPress={() => router.push('/more')} style={styles.more}>
        <Text style={styles.moreText}>더보기</Text>
      </Pressable>
      {online === false && <Text style={styles.offline}>서버에 연결되지 않았어요</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center' },
  title: { fontSize: 44, fontWeight: '900', textAlign: 'center', marginBottom: 24, color: C.green },
  buttons: { gap: 16 },
  more: { alignSelf: 'center', marginTop: 16, padding: 12 },
  moreText: { fontSize: 20, color: C.sub, textDecorationLine: 'underline' },
  offline: { fontSize: 18, textAlign: 'center', color: C.red, marginTop: 4 },
});
