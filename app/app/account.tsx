import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import Chip from '../components/Chip';
import { ApiError, Role } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C, CARD, S } from '../lib/theme';

export const ROLE_LABEL: Record<Role, string> = { patient: '환자 (약 드시는 분)', guardian: '보호자', doctor: '의사' };

// 내 계정: 로그인·가입. 연결은 연동 계정 관리(links.tsx)에서 한다. 로그인은 선택이다 (안 해도 약 관리는 기기 안에서 된다).
export default function Account() {
  const { user, token, login, signup, logout } = useAuth();
  const router = useRouter();

  // 로그아웃 상태: 로그인 / 가입
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('patient');
  const [pw, setPw] = useState('');
  const [invite, setInvite] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      if (mode === 'login') await login(loginId, pw);
      else await signup({ login_id: loginId, name, role, password: pw, invite });
      setPw('');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '잠시 뒤에 다시 해 주세요');
    } finally {
      setBusy(false);
    }
  };

  if (!user)
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.note}>로그인하면 보호자와 약 기록을 나누고, 커뮤니티에 글을 쓸 수 있어요. 로그인하지 않아도 약 관리는 그대로 돼요.</Text>
          <View style={styles.pair}>
            <View style={{ flex: 1 }}><BigButton label="로그인" variant={mode === 'login' ? 'primary' : 'secondary'} onPress={() => setMode('login')} /></View>
            <View style={{ flex: 1 }}><BigButton label="가입하기" variant={mode === 'signup' ? 'primary' : 'secondary'} onPress={() => setMode('signup')} /></View>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>아이디</Text>
            <TextInput value={loginId} onChangeText={setLoginId} autoCapitalize="none" autoCorrect={false} placeholder="영문·숫자 3자 이상" placeholderTextColor={C.gray} style={styles.input} />
            {mode === 'signup' && (
              <>
                <Text style={styles.label}>이름</Text>
                <TextInput value={name} onChangeText={setName} placeholder="보여질 이름" placeholderTextColor={C.gray} style={styles.input} />
                <Text style={styles.label}>누구세요?</Text>
                {(['patient', 'guardian', 'doctor'] as Role[]).map((r) => (
                  <BigButton key={r} label={ROLE_LABEL[r]} variant={role === r ? 'primary' : 'secondary'} onPress={() => setRole(r)} />
                ))}
                {role === 'doctor' && (
                  <>
                    <Text style={styles.label}>의사 초대 코드</Text>
                    <TextInput value={invite} onChangeText={setInvite} autoCapitalize="characters" placeholder="시연용 초대 코드" placeholderTextColor={C.gray} style={styles.input} />
                  </>
                )}
              </>
            )}
            <Text style={styles.label}>비밀번호</Text>
            <TextInput value={pw} onChangeText={setPw} secureTextEntry placeholder="4자 이상" placeholderTextColor={C.gray} style={styles.input} />
            {!!err && <Text style={styles.err}>{err}</Text>}
          </View>
          <BigButton label={busy ? '잠시만요…' : mode === 'login' ? '로그인' : '가입하기'} onPress={busy ? () => {} : submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>
          <Chip small text={ROLE_LABEL[user.role]} />
          <Text style={styles.sub}>아이디 {user.login_id}</Text>
        </View>

        {(user.role === 'patient' || user.role === 'guardian') && (
          <BigButton label="연동 계정 관리" onPress={() => router.push('/links')} />
        )}

        {user.role === 'doctor' && (
          <View style={styles.card}>
            <Text style={styles.sub}>커뮤니티에서 답변을 달면 "의사" 배지가 붙어요.</Text>
          </View>
        )}

        <BigButton label="로그아웃" variant="secondary" onPress={() => logout()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: S.gap },
  note: { fontSize: 18, lineHeight: 24, color: C.sub },
  pair: { flexDirection: 'row', gap: S.in },
  card: { ...CARD, padding: S.pad, gap: S.in },
  label: { fontSize: 18, fontWeight: '800', color: C.green },
  input: { minHeight: 56, borderRadius: 16, backgroundColor: C.soft, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, fontSize: 18, color: C.text },
  codeInput: { fontSize: 26, letterSpacing: 4, textAlign: 'center', fontWeight: '800' },
  err: { fontSize: 18, color: C.red },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 18, lineHeight: 24, color: C.sub },
  code: { fontSize: 40, fontWeight: '800', letterSpacing: 6, color: C.primary, textAlign: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.in },
  person: { fontSize: 20, fontWeight: '800', color: C.text, flexShrink: 1 },
  patient: { gap: S.in, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.in },
});
