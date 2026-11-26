import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import { ApiError, DISCLAIMER, apiAddPost } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C, CARD, S } from '../lib/theme';

// 커뮤니티 글쓰기 (로그인 필요)
export default function Write() {
  const router = useRouter();
  const ask = useDialog();
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!token) return router.replace('/account');
    setBusy(true);
    try {
      const { id } = await apiAddPost(token, title, body);
      router.replace({ pathname: '/post', params: { id: String(id) } });
    } catch (e) {
      ask({ title: '글을 올리지 못했어요', message: e instanceof ApiError ? e.message : '다시 해 주세요.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>제목</Text>
          <TextInput value={title} onChangeText={setTitle} maxLength={80} placeholder="궁금한 것을 한 줄로" placeholderTextColor={C.gray} style={styles.input} />
          <Text style={styles.label}>내용</Text>
          <TextInput value={body} onChangeText={setBody} multiline placeholder="자세히 적어 주세요" placeholderTextColor={C.gray} style={[styles.input, styles.multi]} />
          <Text style={styles.note}>{DISCLAIMER}</Text>
        </View>
        <BigButton label={busy ? '올리는 중…' : '올리기'} onPress={busy ? () => {} : save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: S.gap },
  card: { ...CARD, padding: S.pad, gap: S.in },
  label: { fontSize: 18, fontWeight: '800', color: C.green },
  input: { minHeight: 56, borderRadius: 16, backgroundColor: C.soft, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, color: C.text },
  multi: { minHeight: 160, textAlignVertical: 'top' },
  note: { fontSize: 16, color: C.sub },
});
