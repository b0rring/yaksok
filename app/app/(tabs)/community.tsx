import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/AppText';
import Icon from '../../components/Icon';
import { DISCLAIMER, Post, apiPosts } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { KINDS, useCommunityMeta } from '../../lib/community';
import { C, CARD, S } from '../../lib/theme';

const md = (d: string) => d.replace(/^\d+-0?(\d+)-0?(\d+).*$/, '$1월 $2일');
const POPULAR = ['혈압약', '감기약 같이 먹기', '부작용'];
const PAGE = 10;

const Tag = ({ text, bg, color, icon }: { text: string; bg: string; color: string; icon?: 'doctor' | 'verified' }) => (
  <View style={[styles.tag, { backgroundColor: bg }]}>
    {!!icon && <Icon name={icon} size={16} color={color} stroke={2.4} />}
    <Text style={[styles.tagText, { color }]}>{text}</Text>
  </View>
);

// 커뮤니티: 환자·보호자·의사가 글과 댓글로 이야기한다. 읽기는 누구나, 글·댓글은 로그인해야 한다.
// 공감·저장·글 종류는 서버에 아직 없어서 이 기기에만 저장한다(meta).
export default function Community() {
  const router = useRouter();
  const { user } = useAuth();
  const { meta, toggle } = useCommunityMeta();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<string>('전체');
  const [recent, setRecent] = useState(true); // 최신순 / 댓글 많은 순
  const [doctorOnly, setDoctorOnly] = useState(false);
  const [mode, setMode] = useState<'all' | 'mine' | 'saved'>('all');
  const [more, setMore] = useState(PAGE);

  useFocusEffect(
    useCallback(() => {
      apiPosts()
        .then((p) => (setPosts(p), setErr(false)))
        .catch(() => setErr(true));
    }, []),
  );

  const term = q.trim();
  const list = (posts ?? [])
    .filter((p) => !term || (p.title + p.body).includes(term))
    .filter((p) => kind === '전체' || meta.kinds[p.id] === kind)
    .filter((p) => !doctorOnly || p.role === 'doctor')
    .filter((p) => mode === 'all' || (mode === 'mine' ? !!user && p.name === user.name : meta.saved.includes(p.id)))
    .sort((a, b) => (recent ? b.id - a.id : b.comments - a.comments || b.id - a.id));

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <Text style={styles.title}>커뮤니티</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push(user ? '/write' : '/account')} style={({ pressed }) => [styles.write, pressed && { opacity: 0.85 }]}>
            <Icon name="pen" size={22} color="#fff" />
            <Text style={styles.writeText}>글쓰기</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <View style={styles.search}>
            <Icon name="search" size={22} color={C.sub} />
            <TextInput value={q} onChangeText={(t) => (setQ(t), setMore(PAGE))} placeholder="궁금한 내용을 찾아보세요" placeholderTextColor={C.gray} returnKeyType="search" style={styles.searchInput} />
            {!!q && (
              <Pressable accessibilityRole="button" accessibilityLabel="지우기" onPress={() => setQ('')} style={styles.clear}>
                <Icon name="close" size={18} color={C.sub} />
              </Pressable>
            )}
          </View>
          <View style={styles.popular}>
            <Text style={styles.popularLabel}>많이 찾는 말</Text>
            {POPULAR.map((w) => (
              <Pressable key={w} accessibilityRole="button" onPress={() => setQ(w)} hitSlop={{ top: 8, bottom: 8 }} style={styles.word}>
                <Text style={styles.wordText}>{w}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kinds} style={styles.kindScroll}>
          {['전체', ...KINDS].map((k) => (
            <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: kind === k }} onPress={() => (setKind(k), setMore(PAGE))} style={[styles.kind, kind === k && styles.kindOn]}>
              <Text style={[styles.kindText, kind === k && { color: '#fff' }]}>{k}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.filters}>
          <View style={styles.filterRow}>
            <Pressable accessibilityRole="button" onPress={() => setRecent((r) => !r)} style={styles.opt}>
              <Text style={styles.optText}>{recent ? '최신순' : '댓글 많은 순'}</Text>
              <Icon name="down" size={20} color={C.primary} />
            </Pressable>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: doctorOnly }} onPress={() => setDoctorOnly((d) => !d)} style={styles.opt}>
              <View style={[styles.box, doctorOnly && styles.boxOn]}>{doctorOnly && <Icon name="check" size={16} color="#fff" stroke={3.5} />}</View>
              <Text style={styles.optText}>의사가 쓴 글만</Text>
            </Pressable>
          </View>
          <View style={styles.modes}>
            {([['mine', '내가 쓴 글'], ['saved', '저장한 글']] as const).map(([m, label]) => (
              <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected: mode === m }} onPress={() => (setMode(mode === m ? 'all' : m), setMore(PAGE))} style={[styles.mode, mode === m && { backgroundColor: C.primary }]}>
                <Icon name={m === 'mine' ? 'note' : 'bookmark'} size={22} color={mode === m ? '#fff' : C.primary} />
                <Text style={[styles.modeText, mode === m && { color: '#fff' }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.notice}>
          <View style={styles.noticeIcon}>
            <Icon name="megaphone" size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.noticeLabel}>공지</Text>
            <Text style={styles.noticeText}>{DISCLAIMER}</Text>
          </View>
        </View>

        <View style={styles.listBox}>
          {!user && <Text style={styles.count}>글을 쓰려면 로그인해 주세요.</Text>}
          {err && <Text style={styles.err}>글을 불러오지 못했어요</Text>}
          {posts && <Text style={styles.count}>{list.length ? `글 ${list.length}개` : '조건에 맞는 글이 없어요'}</Text>}
          {list.slice(0, more).map((p) => {
            const liked = meta.likes.includes(p.id);
            const saved = meta.saved.includes(p.id);
            const k = meta.kinds[p.id];
            const open = () => router.push({ pathname: '/post', params: { id: String(p.id) } });
            return (
              <View key={p.id} style={styles.card}>
                {!!k && (
                  <View style={styles.tags}>
                    <Tag text={k} bg={C.soft} color={C.sub} />
                  </View>
                )}
                <Pressable accessibilityRole="button" onPress={open} style={{ gap: 6 }}>
                  <Text style={styles.postTitle}>{p.title}</Text>
                  <Text style={styles.body} numberOfLines={2}>{p.body}</Text>
                </Pressable>
                <View style={styles.meta}>
                  <View style={styles.author}>
                    <Text style={styles.authorName}>{p.name}</Text>
                    {p.role === 'doctor' && <Tag text="의사" bg={C.primary} color="#fff" icon="doctor" />}
                  </View>
                  <Text style={styles.date}>{md(p.created)}</Text>
                </View>
                <View style={styles.react}>
                  <Pressable accessibilityRole="button" accessibilityState={{ selected: liked }} accessibilityLabel={liked ? '공감 취소' : '공감'} onPress={() => toggle('likes', p.id)} style={styles.rbtn}>
                    <Icon name="heart" size={22} color={liked ? C.orange : C.sub} fill={liked ? C.orange : undefined} />
                    <Text style={[styles.rtext, { color: liked ? C.orange : C.sub }]}>공감{liked ? ' 1' : ''}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={open} style={styles.rbtn}>
                    <Icon name="chat" size={22} color={C.primary} />
                    <Text style={[styles.rtext, { color: C.primary }]}>댓글 {p.comments}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityState={{ selected: saved }} accessibilityLabel={saved ? '저장 취소' : '글 저장'} onPress={() => toggle('saved', p.id)} style={[styles.save, saved && { backgroundColor: C.fill }]}>
                    <Icon name="bookmark" size={22} color={saved ? C.primary : C.sub} fill={saved ? C.primary : undefined} />
                  </Pressable>
                </View>
              </View>
            );
          })}
          {list.length > more && (
            <Pressable accessibilityRole="button" onPress={() => setMore((m) => m + PAGE)} style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.8 }]}>
              <Icon name="down" size={24} color={C.primary} />
              <Text style={styles.moreText}>글 더 보기</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  wrap: { paddingHorizontal: S.page, paddingTop: 16, paddingBottom: 100, gap: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: C.text },
  write: { minHeight: 48, borderRadius: 24, backgroundColor: C.primary, paddingLeft: 14, paddingRight: 18, flexDirection: 'row', alignItems: 'center', gap: 6 },
  writeText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  searchBox: { gap: 12, marginTop: -12 },
  search: { minHeight: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 8 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 52, fontSize: 18, color: C.text },
  clear: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  popular: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  popularLabel: { fontSize: 16, fontWeight: '700', color: C.sub },
  word: { borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 3 },
  wordText: { fontSize: 16, fontWeight: '800', color: C.primary },
  kindScroll: { marginHorizontal: -S.page, flexGrow: 0 },
  kinds: { flexDirection: 'row', gap: 8, paddingHorizontal: S.page },
  kind: { minHeight: 44, borderRadius: 22, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 16, justifyContent: 'center' },
  kindOn: { backgroundColor: C.primary, borderColor: C.primary },
  kindText: { fontSize: 18, fontWeight: '800', color: C.primary },
  filters: { gap: 12, marginTop: -8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { minHeight: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  optText: { fontSize: 16, fontWeight: '800', color: C.primary },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2.5, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.primary, borderColor: C.primary },
  modes: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, minHeight: 56, borderRadius: 28, backgroundColor: C.fill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  modeText: { fontSize: 20, fontWeight: '800', color: C.primary },
  notice: { borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  noticeLabel: { fontSize: 16, fontWeight: '800', color: C.primary },
  noticeText: { fontSize: 18, fontWeight: '700', color: C.text },
  listBox: { gap: 12 },
  count: { fontSize: 18, fontWeight: '700', color: C.sub },
  err: { fontSize: 18, color: C.red },
  card: { ...CARD, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 10, gap: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 16, fontWeight: '800' },
  postTitle: { fontSize: 20, lineHeight: 28, fontWeight: '800', color: C.text },
  body: { fontSize: 18, lineHeight: 26, color: C.sub },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  authorName: { fontSize: 18, fontWeight: '700', color: C.text },
  date: { fontSize: 16, color: C.sub },
  react: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.line },
  rbtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 10, paddingLeft: 4 },
  rtext: { fontSize: 18, fontWeight: '800' },
  save: { marginLeft: 'auto', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  moreBtn: { minHeight: 56, borderRadius: 28, backgroundColor: C.fill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  moreText: { fontSize: 20, fontWeight: '800', color: C.primary },
});
