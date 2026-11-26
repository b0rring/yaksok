import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import Chip from '../components/Chip';
import { useDialog } from '../components/Dialog';
import { ApiError, Comment, DISCLAIMER, Post, apiAddComment, apiPost } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C, CARD, S } from '../lib/theme';

type Full = Omit<Post, 'comments'> & { comments: Comment[] };
const md = (d: string) => d.replace(/^\d+-0?(\d+)-0?(\d+).*$/, '$1월 $2일');

// 글 보기 + 댓글. 의사 댓글에는 "의사" 배지와 "진료를 대신하지 않아요" 안내가 붙는다.
export default function PostView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ask = useDialog();
  const { user, token } = useAuth();
  const [post, setPost] = useState<Full | null>(null);
  const [text, setText] = useState('');
  const [missing, setMissing] = useState(false);

  const load = useCallback(() => apiPost(Number(id)).then(setPost).catch(() => setMissing(true)), [id]);
  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (!text.trim()) return;
    try {
      await apiAddComment(token!, Number(id), text);
      setText('');
      load();
    } catch (e) {
      ask({ title: '댓글을 달지 못했어요', message: e instanceof ApiError ? e.message : '다시 해 주세요.' });
    }
  };

  if (missing) return <Text style={styles.err}>글을 찾지 못했어요</Text>;
  if (!post) return null;

  const badge = (role: string) => role === 'doctor' && <Chip small solid={C.primary} text="의사" />;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.meta}>
            <Chip small text={md(post.created)} />
            <Text style={styles.author}>{post.name}</Text>
            {badge(post.role)}
          </View>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.body}>{post.body}</Text>
        </View>

        <Text style={styles.section}>댓글 {post.comments.length}</Text>
        {post.comments.map((c) => (
          <View key={c.id} style={[styles.card, c.role === 'doctor' && styles.doctor]}>
            <View style={styles.meta}>
              <Text style={styles.author}>{c.name}</Text>
              {badge(c.role)}
            </View>
            <Text style={styles.body}>{c.body}</Text>
            {c.role === 'doctor' && <Text style={styles.disclaimer}>{DISCLAIMER}</Text>}
          </View>
        ))}

        {user ? (
          <View style={styles.card}>
            <TextInput value={text} onChangeText={setText} multiline placeholder="댓글을 적어 주세요" placeholderTextColor={C.gray} style={styles.input} />
            <BigButton label="댓글 달기" onPress={send} />
          </View>
        ) : (
          <BigButton label="로그인하고 댓글 달기" variant="secondary" onPress={() => router.push('/account')} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: S.gap },
  err: { fontSize: 18, color: C.red, textAlign: 'center', margin: S.page },
  card: { ...CARD, padding: S.item, gap: S.in },
  doctor: { backgroundColor: '#EEF5F0' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  author: { fontSize: 18, fontWeight: '700', color: C.sub },
  title: { fontSize: 22, fontWeight: '800', color: C.text },
  body: { fontSize: 18, lineHeight: 28, color: C.text },
  section: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: S.in },
  disclaimer: { fontSize: 16, color: C.orange },
  input: { minHeight: 80, borderRadius: 16, backgroundColor: C.soft, borderWidth: 1.5, borderColor: C.border, padding: 16, fontSize: 18, color: C.text, textAlignVertical: 'top' },
});
