import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import ScreenTitle from '../components/ScreenTitle';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import Icon from '../components/Icon';
import { ApiError, apiAddPost } from '../lib/api';
import { useAuth } from '../lib/auth';
import { KINDS, Kind, setPostKind } from '../lib/community';
import { C, CARD, S } from '../lib/theme';

// 커뮤니티 글쓰기 (로그인 필요). 글 종류는 아직 서버에 없어서 이 기기에만 저장한다.
export default function Write() {
  const router = useRouter();
  const ask = useDialog();
  const { token } = useAuth();
  const [kind, setKind] = useState<Kind>('질문');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!token) return router.replace('/account');
    setBusy(true);
    try {
      const { id } = await apiAddPost(token, title, body);
      await setPostKind(id, kind);
      router.replace({ pathname: '/post', params: { id: String(id) } });
    } catch (e) {
      ask({ title: '글을 올리지 못했어요', message: e instanceof ApiError ? e.message : '다시 해 주세요.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
<ScreenTitle text="글쓰기" />
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>글 종류</Text>
            <View style={styles.kinds}>
              {KINDS.map((k) => (
                <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: kind === k }} onPress={() => setKind(k)} style={[styles.kind, kind === k && styles.kindOn]}>
                  <Text style={[styles.kindText, kind === k && { color: '#fff' }]}>{k}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>제목</Text>
            <TextInput value={title} onChangeText={setTitle} maxLength={80} placeholder="궁금한 것을 한 줄로" placeholderTextColor={C.gray} style={styles.input} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>내용</Text>
            <TextInput value={body} onChangeText={setBody} multiline placeholder="자세히 적어 주세요" placeholderTextColor={C.gray} style={[styles.input, styles.multi]} />
          </View>
        </View>
        <View style={styles.warn}>
          <Icon name="alert" size={22} color="#8A3217" />
          <Text style={styles.warnText}>이름, 전화번호, 주소 같은 개인 정보는 적지 마세요.</Text>
        </View>
        <BigButton label={busy ? '올리는 중…' : '올리기'} onPress={busy ? () => {} : save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: 28 },
  card: { ...CARD, padding: S.pad, gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 18, fontWeight: '800', color: C.text },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kind: { minHeight: 44, borderRadius: 22, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 16, justifyContent: 'center' },
  kindOn: { backgroundColor: C.primary, borderColor: C.primary },
  kindText: { fontSize: 18, fontWeight: '800', color: C.primary },
  input: { minHeight: 56, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, color: C.text },
  multi: { minHeight: 200, lineHeight: 28, textAlignVertical: 'top' },
  warn: { borderRadius: 16, backgroundColor: C.warn, padding: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 10 },
  warnText: { flex: 1, fontSize: 16, lineHeight: 24, color: '#8A3217' },
});
