import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import ScreenTitle from '../components/ScreenTitle';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import { ApiError, apiAcceptLink, apiAddLink, apiRemoveLink } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C, CARD, S } from '../lib/theme';

const Tag = ({ text, color = C.primary }: { text: string; color?: string }) => (
  <View style={styles.tag}>
    <Text style={[styles.tagText, { color }]}>{text}</Text>
  </View>
);

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
      <View style={[styles.wrap, { flex: 1, backgroundColor: C.page }]}>
        <ScreenTitle text="연동 계정 관리" />
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
  const send = () => Share.share({ message: `약속 앱 연결 코드: ${user.code}` }).catch(() => {});

  const mine = user.code.length === 6 ? `${user.code.slice(0, 3)} ${user.code.slice(3)}` : user.code;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
<ScreenTitle text="연동 계정 관리" />
        <View style={styles.mine}>
          <Text style={styles.mineLabel}>내 연결 코드</Text>
          <Text style={styles.code}>{mine}</Text>
          <Text style={styles.mineHint}>{other}에게 이 코드를 알려 주세요. 상대가 코드를 넣으면 요청이 와요. 코드를 알아도 내가 허락해야만 연결돼요.</Text>
          <View style={styles.pair}>
            <Pressable accessibilityRole="button" onPress={send} style={({ pressed }) => [styles.mineBtn, { backgroundColor: '#fff' }, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.mineBtnText, { color: C.primary }]}>코드 보내기</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={renew} style={({ pressed }) => [styles.mineBtn, { borderWidth: 1.5, borderColor: '#9FC2B5' }, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.mineBtnText, { color: '#fff' }]}>새 코드 받기</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>상대 코드로 연결하기</Text>
            <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))} autoCapitalize="characters" autoCorrect={false} maxLength={6} placeholder="코드 6자리" placeholderTextColor={C.gray} style={styles.input} />
          </View>
          <BigButton label={busy ? '잠시만요…' : '연결 요청 보내기'} variant="secondary" onPress={busy || code.trim().length < 6 ? () => {} : request} />
        </View>

        {links.incoming.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.part}>받은 요청</Text>
            {links.incoming.map((r) => (
              <View key={r.id} style={styles.alert}>
                <View style={styles.who}>
                  <Text style={styles.person}>{r.name}님</Text>
                  <Tag text={r.role === 'guardian' ? '보호자' : '환자'} color={C.orange} />
                </View>
                <Text style={styles.ask}>{isGuardian ? '허락하면 이분의 약을 보고 고칠 수 있어요.' : '허락하면 이분이 내 약을 보고 고칠 수 있어요.'}</Text>
                <View style={styles.pair}>
                  <View style={{ flex: 1 }}><BigButton label="허락" onPress={() => run(() => apiAcceptLink(token!, r.id), '허락하지 못했어요')} /></View>
                  <Pressable accessibilityRole="button" onPress={() => cut(r.id, r.name, '거절')} style={({ pressed }) => [styles.outline, pressed && { opacity: 0.8 }]}>
                    <Text style={styles.outlineText}>거절</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Text style={styles.part}>연결된 사람</Text>
          {!connected.length && <Text style={styles.sub}>아직 없어요</Text>}
          {connected.map((p) => (
            <View key={p.id} style={styles.item}>
              <View style={styles.who}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{p.name.slice(0, 1)}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.person}>{p.name}님</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Tag text={other} />
                    {isGuardian && viewing?.id === p.id && <Tag text="보는 중" />}
                  </View>
                </View>
              </View>
              <View style={styles.pair}>
                {isGuardian && (
                  <View style={{ flex: 1 }}>
                    <BigButton label={viewing?.id === p.id ? '홈으로' : '화면 보기'} onPress={() => open(p)} />
                  </View>
                )}
                <Pressable accessibilityRole="button" onPress={() => cut(p.id, p.name, '끊기')} style={({ pressed }) => [styles.outline, styles.cutBtn, pressed && { opacity: 0.8 }]}>
                  <Text style={[styles.outlineText, { color: C.orange }]}>연결 끊기</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {isGuardian && connected.length > 0 && <Text style={styles.sub}>화면을 바꾸면 약을 추가하고 고치고 체크하는 것이 그분의 약으로 저장돼요.</Text>}
        </View>

        {links.outgoing.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.part}>보낸 요청</Text>
            {links.outgoing.map((r) => (
              <View key={r.id} style={styles.item}>
                <View style={styles.who}>
                  <Text style={styles.person}>{r.name}님</Text>
                  <Tag text="답을 기다려요" />
                </View>
                <BigButton label="요청 취소" variant="secondary" onPress={() => cut(r.id, r.name, '취소')} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: 28 },
  mine: { borderRadius: 24, backgroundColor: C.primary, paddingVertical: 22, paddingHorizontal: 20, gap: 10 },
  mineLabel: { fontSize: 18, fontWeight: '700', color: '#DDEBE4' },
  code: { fontSize: 40, fontWeight: '900', letterSpacing: 6, color: '#fff' },
  mineHint: { fontSize: 16, lineHeight: 24, color: '#DDEBE4' },
  mineBtn: { flex: 1, minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  mineBtnText: { fontSize: 20, fontWeight: '800' },
  card: { ...CARD, padding: S.pad, gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 18, fontWeight: '800', color: C.text },
  input: { minHeight: 56, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, fontSize: 22, letterSpacing: 3, fontWeight: '800', color: C.text },
  part: { fontSize: 18, fontWeight: '800', color: C.sub },
  sub: { fontSize: 16, lineHeight: 24, color: C.sub },
  alert: { borderRadius: 18, backgroundColor: C.peach, padding: 16, gap: 12 },
  ask: { fontSize: 18, lineHeight: 26, color: C.text },
  item: { borderRadius: 16, backgroundColor: C.soft, padding: 16, gap: 12 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '900', color: '#fff' },
  person: { fontSize: 20, fontWeight: '800', color: C.text, flexShrink: 1 },
  tag: { alignSelf: 'flex-start', borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 16, fontWeight: '800' },
  pair: { flexDirection: 'row', gap: 8 },
  outline: { flex: 1, minHeight: 56, borderRadius: 28, borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  outlineText: { fontSize: 20, fontWeight: '800', color: C.primary },
  cutBtn: { borderColor: '#E7B9A5' },
});
