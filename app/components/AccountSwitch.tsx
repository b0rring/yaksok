import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Icon from './Icon';
import { useDialog } from './Dialog';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C, CARD, S } from '../lib/theme';

// 홈 맨 위 계정 전환 칩: 보호자가 "내 화면 / 연결된 환자 화면"을 바꾼다. 받은 연결 요청이 있으면 알려 주는 카드도 여기서 보인다.
export default function AccountSwitch() {
  const { user, links, viewing, switchTo } = useAuth();
  const router = useRouter();
  const ask = useDialog();
  if (!user) return null;

  const go = (p: { id: number; name: string } | null) =>
    switchTo(p).catch((e) => ask({ title: '바꾸지 못했어요', message: e instanceof ApiError ? e.message : '다시 해 주세요.' }));
  const chips = user.role === 'guardian' && links.patients.length ? [{ id: 0, name: '내 화면', me: true }, ...links.patients.map((p) => ({ ...p, me: false }))] : [];

  return (
    <View style={styles.wrap}>
      {chips.length > 0 && (
        <View style={styles.chips}>
          {chips.map((c) => {
            const on = c.me ? !viewing : viewing?.id === c.id;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => go(c.me ? null : { id: c.id, name: c.name })}
                style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{c.me ? c.name : `${c.name}님`}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {links.incoming.length > 0 && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/links')} style={({ pressed }) => [styles.notice, pressed && { opacity: 0.8 }]}>
          <Text style={styles.noticeText}>
            {links.incoming.length === 1 ? `${links.incoming[0].name}님이 연결을 요청했어요` : `연결 요청이 ${links.incoming.length}건 왔어요`}
          </Text>
          <Text style={styles.noticeGo}>확인하기</Text>
          <Icon name="right" size={22} color={C.orange} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.in },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 18, fontWeight: '800', color: C.primary },
  notice: { ...CARD, backgroundColor: C.peach, borderColor: C.peach, padding: S.item, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.in },
  noticeText: { flex: 1, fontSize: 18, fontWeight: '800', color: C.text },
  noticeGo: { fontSize: 18, fontWeight: '800', color: C.orange },
});
