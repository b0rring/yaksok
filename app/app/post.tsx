import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import ScreenTitle from '../components/ScreenTitle';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import Icon from '../components/Icon';
import { ApiError, Comment, DISCLAIMER, Post, apiAddComment, apiPost } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCommunityMeta } from '../lib/community';
import { C, CARD, S } from '../lib/theme';

type Full = Omit<Post, 'comments'> & { comments: Comment[] };
const md = (d: string) => d.replace(/^\d+-0?(\d+)-0?(\d+).*$/, '$1월 $2일');

const Doctor = () => (
  <View style={styles.doctorTag}>
    <Icon name="doctor" size={16} color="#fff" stroke={2.4} />
    <Text style={styles.doctorTagText}>의사</Text>
  </View>
);

// 글 보기 + 댓글. 의사 댓글은 초록 테두리로 강조하고 "진료를 대신하지 않아요" 안내를 붙인다. 댓글 입력줄은 아래에 고정.
export default function PostView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const ask = useDialog();
  const { user, token } = useAuth();
  const { meta, toggle } = useCommunityMeta();
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

  if (missing)
    return (
      <View style={{ flex: 1, backgroundColor: C.page, padding: S.page, gap: 28 }}>
        <ScreenTitle text="글 보기" />
        <Text style={styles.err}>글을 찾지 못했어요</Text>
      </View>
    );
  if (!post) return null;

  const pid = Number(id);
  const liked = meta.likes.includes(pid);
  const saved = meta.saved.includes(pid);
  const kind = meta.kinds[pid];
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
<ScreenTitle text="글 보기" />
        <View style={styles.card}>
          {!!kind && (
            <View style={styles.tags}>
              <View style={styles.kind}>
                <Text style={styles.kindText}>{kind}</Text>
              </View>
            </View>
          )}
          <Text style={styles.title}>{post.title}</Text>
          <View style={styles.meta}>
            <View style={styles.author}>
              <Text style={styles.authorName}>{post.name}</Text>
              {post.role === 'doctor' && <Doctor />}
            </View>
            <Text style={styles.date}>{md(post.created)}</Text>
          </View>
          <Text style={styles.body}>{post.body}</Text>
          <View style={styles.react}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: liked }} onPress={() => toggle('likes', pid)} style={styles.rbtn}>
              <Icon name="heart" size={22} color={liked ? C.orange : C.sub} fill={liked ? C.orange : undefined} />
              <Text style={[styles.rtext, { color: liked ? C.orange : C.sub }]}>공감{liked ? ' 1' : ''}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={saved ? '저장 취소' : '글 저장'} accessibilityState={{ selected: saved }} onPress={() => toggle('saved', pid)} style={[styles.save, saved && { backgroundColor: C.fill }]}>
              <Icon name="bookmark" size={22} color={saved ? C.primary : C.sub} fill={saved ? C.primary : undefined} />
            </Pressable>
          </View>
        </View>

        <View style={styles.part}>
          <View style={styles.partHead}>
            <Icon name="chat" size={24} color={C.primary} />
            <Text style={styles.partTitle}>댓글 {post.comments.length}</Text>
          </View>
          {post.comments.map((c) => (
            <View key={c.id} style={[styles.comment, c.role === 'doctor' && styles.doctor]}>
              <View style={styles.author}>
                <Text style={styles.authorName}>{c.name}</Text>
                {c.role === 'doctor' && <Doctor />}
                <Text style={[styles.date, { marginLeft: 'auto' }]}>{md(c.created)}</Text>
              </View>
              <Text style={styles.commentBody}>{c.body}</Text>
              {c.role === 'doctor' && <Text style={styles.disclaimer}>{DISCLAIMER}</Text>}
            </View>
          ))}
          {!post.comments.length && <Text style={styles.date}>아직 댓글이 없어요</Text>}
        </View>
      </ScrollView>

      <View style={styles.dock}>
        {user ? (
          <View style={styles.dockRow}>
            <TextInput value={text} onChangeText={setText} multiline placeholder="댓글을 적어 주세요" placeholderTextColor={C.gray} style={styles.input} />
            <Pressable accessibilityRole="button" accessibilityLabel="댓글 달기" onPress={send} style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}>
              <Icon name="send" size={24} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <BigButton label="로그인하고 댓글 달기" variant="secondary" onPress={() => router.push('/account')} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 24, gap: 28 },
  err: { fontSize: 18, color: C.red, textAlign: 'center', margin: S.page },
  card: { ...CARD, padding: S.pad, gap: 12 },
  tags: { flexDirection: 'row', gap: 8 },
  kind: { borderRadius: 14, backgroundColor: C.soft, paddingHorizontal: 10, paddingVertical: 3 },
  kindText: { fontSize: 16, fontWeight: '800', color: C.sub },
  title: { fontSize: 24, lineHeight: 34, fontWeight: '900', color: C.text },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { fontSize: 18, fontWeight: '800', color: C.text },
  date: { fontSize: 16, color: C.sub },
  body: { fontSize: 20, lineHeight: 32, color: C.text },
  react: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.line },
  rbtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10, paddingLeft: 4 },
  rtext: { fontSize: 18, fontWeight: '800' },
  save: { marginLeft: 'auto', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  part: { gap: 10 },
  partHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  partTitle: { fontSize: 22, fontWeight: '800', color: C.text },
  comment: { borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, padding: 16, gap: 8 },
  doctor: { backgroundColor: '#EAF3EE', borderWidth: 2, borderColor: C.primary },
  doctorTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, backgroundColor: C.primary, paddingHorizontal: 10, paddingVertical: 3 },
  doctorTagText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  commentBody: { fontSize: 18, lineHeight: 28, color: C.text },
  disclaimer: { fontSize: 16, color: C.orange },
  dock: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: S.page, paddingTop: 10, paddingBottom: 16 },
  dockRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 56, maxHeight: 120, borderRadius: 28, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, fontSize: 18, color: C.text, textAlignVertical: 'top' },
  sendBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});
