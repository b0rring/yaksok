import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import ScreenTitle from '../components/ScreenTitle';
import BigButton from '../components/BigButton';
import Chip from '../components/Chip';
import Icon, { IconName } from '../components/Icon';
import Segmented from '../components/Segmented';
import { ApiError, Role } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C, CARD, S } from '../lib/theme';

export const ROLE_LABEL: Record<Role, string> = { patient: '환자 (약 드시는 분)', guardian: '보호자', doctor: '의사' };
const ROLE_ICON: Record<Role, IconName> = { patient: 'pill', guardian: 'users', doctor: 'doctor' };

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
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
<ScreenTitle text="계정" />
          <Text style={styles.note}>로그인하면 보호자와 약 기록을 나누고, 커뮤니티에 글을 쓸 수 있어요. 로그인하지 않아도 약 관리는 그대로 돼요.</Text>
          <Segmented big options={[{ id: 'login', label: '로그인' }, { id: 'signup', label: '가입하기' }] as const} value={mode} onPick={setMode} />
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>아이디</Text>
              <TextInput value={loginId} onChangeText={setLoginId} autoCapitalize="none" autoCorrect={false} placeholder="영문과 숫자 3자 이상" placeholderTextColor={C.gray} style={styles.input} />
            </View>
            {mode === 'signup' && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>이름</Text>
                  <TextInput value={name} onChangeText={setName} placeholder="보여질 이름" placeholderTextColor={C.gray} style={styles.input} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>누구세요?</Text>
                  <View style={{ gap: 8 }}>
                    {(['patient', 'guardian', 'doctor'] as Role[]).map((r) => {
                      const on = role === r;
                      return (
                        <Pressable key={r} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setRole(r)} style={[styles.role, on && styles.roleOn]}>
                          <Icon name={ROLE_ICON[r]} size={24} color={on ? '#fff' : C.primary} />
                          <Text style={[styles.roleText, on && { color: '#fff' }]}>{ROLE_LABEL[r]}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                {role === 'doctor' && (
                  <View style={styles.field}>
                    <Text style={styles.label}>의사 초대 코드</Text>
                    <TextInput value={invite} onChangeText={setInvite} autoCapitalize="characters" placeholder="시연용 초대 코드" placeholderTextColor={C.gray} style={styles.input} />
                  </View>
                )}
              </>
            )}
            <View style={styles.field}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput value={pw} onChangeText={setPw} secureTextEntry placeholder="4자 이상" placeholderTextColor={C.gray} style={styles.input} />
            </View>
            {!!err && <Text style={styles.err}>{err}</Text>}
            <BigButton label={busy ? '잠시만요…' : mode === 'login' ? '로그인' : '가입하기'} onPress={busy ? () => {} : submit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
<ScreenTitle text="계정" />
        <View style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>
          <Chip small text={ROLE_LABEL[user.role]} />
          <Text style={styles.sub}>아이디 {user.login_id}</Text>
        </View>

        {(user.role === 'patient' || user.role === 'guardian') && (
          <BigButton label="연동 계정 관리" icon="users" onPress={() => router.push('/links')} />
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
  wrap: { padding: S.page, paddingBottom: 40, gap: 28 },
  note: { fontSize: 18, lineHeight: 28, color: C.sub, marginTop: -8 },
  card: { ...CARD, padding: S.pad, gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 18, fontWeight: '800', color: C.text },
  input: { minHeight: 56, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, fontSize: 18, color: C.text },
  role: { minHeight: 64, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleOn: { backgroundColor: C.primary, borderColor: C.primary },
  roleText: { fontSize: 18, fontWeight: '800', color: C.text },
  err: { fontSize: 18, color: C.red },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  sub: { fontSize: 18, lineHeight: 24, color: C.sub },
});
