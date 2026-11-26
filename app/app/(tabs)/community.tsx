import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/AppText';
import TabTitle from '../../components/TabTitle';
import BigButton from '../../components/BigButton';
import Chip from '../../components/Chip';
import { DISCLAIMER, Post, apiPosts } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { C, CARD, S } from '../../lib/theme';

const md = (d: string) => d.replace(/^\d+-0?(\d+)-0?(\d+).*$/, '$1월 $2일');

// 커뮤니티: 환자·보호자·의사가 글과 댓글로 이야기한다. 읽기는 누구나, 글·댓글은 로그인해야 한다. 의사 계정에는 "의사" 배지.
export default function Community() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [err, setErr] = useState(false);

  useFocusEffect(
    useCallback(() => {
      apiPosts()
        .then((p) => (setPosts(p), setErr(false)))
        .catch(() => setErr(true));
    }, []),
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <TabTitle title="커뮤니티" />
        <View style={styles.group}>
        <Text style={styles.note}>{DISCLAIMER}</Text>
        <BigButton label="글쓰기" onPress={() => router.push(user ? '/write' : '/account')} />
        {!user && <Text style={styles.note}>글을 쓰려면 로그인해 주세요.</Text>}

        {err && <Text style={styles.err}>글을 불러오지 못했어요</Text>}
        {posts && !posts.length && <Text style={styles.note}>아직 글이 없어요. 첫 글을 남겨 보세요.</Text>}
        {posts?.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/post', params: { id: String(p.id) } })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
            <View style={styles.meta}>
              <Chip small text={md(p.created)} />
              <Text style={styles.author}>{p.name}</Text>
              {p.role === 'doctor' && <Chip small solid={C.primary} text="의사" />}
            </View>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{p.body}</Text>
            <Text style={styles.count}>댓글 {p.comments}</Text>
          </Pressable>
        ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  wrap: { paddingHorizontal: S.page, paddingTop: 8, paddingBottom: 100, gap: S.section },
  group: { gap: S.gap },
  note: { fontSize: 18, lineHeight: 24, color: C.sub },
  err: { fontSize: 18, color: C.red },
  card: { ...CARD, padding: S.item, gap: S.tight + 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  author: { fontSize: 18, fontWeight: '700', color: C.sub },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  body: { fontSize: 18, lineHeight: 24, color: C.sub },
  count: { fontSize: 18, fontWeight: '800', color: C.primary },
});
