import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import Chip from '../components/Chip';
import { useDialog } from '../components/Dialog';
import { ApiError, apiAcceptLink, apiAddLink, apiRemoveLink } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C, CARD, S } from '../lib/theme';

// 연동 계정 관리: 내 코드, 연결 요청 보내기·받기, 연결된 계정. 연결은 한쪽이 요청하고 상대가 허락해야 이어진다.
// 보호자는 연결된 환자를 눌러 그 사람의 화면으로 전환해(홈의 계정 칩과 같다) 약을 보고 고친다.
export default function Links() {
  const { user, token, links, refreshLinks, viewing, switchTo, newCode } = useAuth();
  const ask = useDialog();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => void refreshLinks(), [refreshLinks]));

  const fail = (title: string) => (e: unknown) => ask({ title, message: e instanceof ApiError ? e.message : '다시 해 주세요.' });
  const run = (f: () => Promise<unknown>, title: string) => f().then(refreshLinks).catch(fail(title));

  if (!user || (user.role !== 'patient' && user.role !== 'guardian'))
    return (
      <View style={styles.wrap}>
        <Text style={styles.sub}>{user ? '환자와 보호자 계정만 연결할 수 있어요.' : '로그인하면 보호자와 환자가 서로 연결할 수 있어요.'}</Text>
        {!user && <BigButton label="로그인 또는 가입" onPress={() => router.replace('/account')} />}
      </View>
    );

  const isGuardian = user.role === 'guardian';
  const other = isGuardian ? '환자' : '보호자';
  const connected = isGuardian ? links.patients : links.guardians;

  const request = async () => {
    setBusy(true);
    try {
      const r = await apiAddLink(token!, code);
      setCode('');
      await refreshLinks();
      ask(r.status === 'active' ? { title: '연결했어요', message: `${r.name}님과 연결됐어요.` } : { title: '요청을 보냈어요', message: `${r.name}님이 허락하면 연결돼요.` });
    } catch (e) {
      fail('요청하지 못했어요')(e);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: number) => {
    if (viewing?.id === id) await switchTo(null); // 보고 있던 화면이면 내 화면으로 먼저 돌아온다
    await apiRemoveLink(token!, id);
  };
  const cut = (id: number, who: string, what: '끊기' | '거절' | '취소') =>
    ask({
      title: what === '끊기' ? '연결을 끊을까요?' : what === '거절' ? '요청을 거절할까요?' : '요청을 취소할까요?',
      message: what === '끊기' ? `${who}님과의 연결을 끊어요. 다시 연결하려면 새로 요청해야 해요.` : `${who}님과의 연결 요청을 없애요.`,
      actions: [
        { label: what, kind: 'danger', onPress: () => void run(() => remove(id), '처리하지 못했어요') },
        { label: '그대로 두기', kind: 'secondary' },
      ],
    });
  const open = (p: { id: number; name: string }) =>
    switchTo(p)
      .then(() => router.navigate('/'))
      .catch(fail('바꾸지 못했어요'));
  const renew = () =>
    ask({
      title: '새 코드를 받을까요?',
      message: '지금 코드는 쓸 수 없게 돼요. 이미 연결된 사람은 그대로예요.',
      actions: [
        { label: '새 코드 받기', onPress: () => void newCode().catch(fail('바꾸지 못했어요')) },
        { label: '그대로 두기', kind: 'secondary' },
      ],
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        {links.incoming.length > 0 && (
          <View style={[styles.card, styles.alert]}>
            <Text style={styles.label}>받은 요청</Text>
            {links.incoming.map((r) => (
              <View key={r.id} style={styles.item}>
                <View style={styles.who}>
                  <Text style={styles.person}>{r.name}님</Text>
                  <Chip small text={r.role === 'guardian' ? '보호자' : '환자'} />
                </View>
                <Text style={styles.sub}>
                  {isGuardian ? '허락하면 이분의 약을 보고 고칠 수 있어요.' : '허락하면 이분이 내 약을 보고 고칠 수 있어요.'}
                </Text>
                <View style={styles.pair}>
                  <View style={{ flex: 1 }}><BigButton label="허락" onPress={() => run(() => apiAcceptLink(token!, r.id), '허락하지 못했어요')} /></View>
                  <View style={{ flex: 1 }}><BigButton label="거절" variant="secondary" onPress={() => cut(r.id, r.name, '거절')} /></View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>연결된 {other}</Text>
          {!connected.length && <Text style={styles.sub}>아직 없어요</Text>}
          {connected.map((p) => (
            <View key={p.id} style={styles.item}>
              <View style={styles.who}>
                <Text style={styles.person}>{p.name}님</Text>
                {isGuardian && viewing?.id === p.id && <Chip small text="보는 중" />}
              </View>
              <View style={styles.pair}>
                {isGuardian && (
                  <View style={{ flex: 1 }}>
                    <BigButton label={viewing?.id === p.id ? '홈으로' : '화면 보기'} onPress={() => open(p)} />
                  </View>
                )}
                <View style={{ flex: 1 }}><BigButton label="연결 끊기" variant="secondary" onPress={() => cut(p.id, p.name, '끊기')} /></View>
              </View>
            </View>
          ))}
          {isGuardian && connected.length > 0 && <Text style={styles.sub}>화면을 바꾸면 약을 추가하고 고치고 체크하는 것이 그분의 약으로 저장돼요.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{other}에게 연결 요청하기</Text>
          <Text style={styles.sub}>{other}의 연동 계정 관리에 있는 6자리 코드를 넣어 주세요. 상대가 허락하면 연결돼요.</Text>
          <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))} autoCapitalize="characters" autoCorrect={false} maxLength={6} placeholder="6자리 코드" placeholderTextColor={C.gray} style={styles.codeInput} />
          <BigButton label={busy ? '잠시만요…' : '연결 요청 보내기'} onPress={busy || code.trim().length < 6 ? () => {} : request} />
        </View>

        {links.outgoing.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>보낸 요청</Text>
            {links.outgoing.map((r) => (
              <View key={r.id} style={styles.item}>
                <View style={styles.who}>
                  <Text style={styles.person}>{r.name}님</Text>
                  <Chip small text="답을 기다려요" />
                </View>
                <BigButton label="요청 취소" variant="secondary" onPress={() => cut(r.id, r.name, '취소')} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>내 고유 코드</Text>
          <Text style={styles.code}>{user.code}</Text>
          <Text style={styles.sub}>{other}가 연결을 요청할 때 이 코드를 알려 주세요. 코드를 알아도 내가 허락해야만 연결돼요.</Text>
          <BigButton label="새 코드 받기" variant="secondary" onPress={renew} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: S.gap },
  card: { ...CARD, padding: S.pad, gap: S.in },
  alert: { backgroundColor: C.peach, borderColor: C.peach },
  label: { fontSize: 20, fontWeight: '800', color: C.primary },
  sub: { fontSize: 18, lineHeight: 24, color: C.sub },
  item: { gap: S.in, backgroundColor: C.soft, borderRadius: 12, padding: S.item },
  who: { flexDirection: 'row', alignItems: 'center', gap: S.in, flexWrap: 'wrap' },
  person: { fontSize: 20, fontWeight: '800', color: C.text, flexShrink: 1 },
  pair: { flexDirection: 'row', gap: S.in },
  code: { fontSize: 40, fontWeight: '800', letterSpacing: 6, color: C.primary, textAlign: 'center' },
  codeInput: { minHeight: 56, borderRadius: 16, backgroundColor: C.soft, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, fontSize: 26, letterSpacing: 4, textAlign: 'center', fontWeight: '800', color: C.text },
});
