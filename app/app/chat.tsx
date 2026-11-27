import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import FilterRow, { FilterBox } from '../components/FilterRow';
import Icon from '../components/Icon';
import SpeakButton from '../components/SpeakButton';
import { askChat } from '../lib/api';
import { C, CARD, R, S } from '../lib/theme';
import { useTodayMeds } from '../lib/useTodayMeds';

type Msg = { role: 'user' | 'bot'; text: string; sources?: string[]; demo?: boolean; ai?: boolean };
const ASKS = ['이 약은 어디에 쓰나요?', '술을 마셔도 되나요?', '부작용이 있나요?', '같이 먹으면 안 되는 약이 있나요?'];

// AI 표시는 어디서나 보라색: 아바타·말풍선 이름표·보내기 버튼
function Avatar({ size = 36 }: { size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon name="sparkles" size={size * 0.55} color="#fff" />
    </View>
  );
}

// 약 물어보기: 등록한 약을 바탕으로, 식약처 e약은요 공식 정보 안에서만 답한다. 답은 "듣기"로 읽어 준다.
// 위: 소개와 "어떤 약에 대해" 고르기 / 가운데: 대화 / 아래: 자주 묻는 질문 칩과 입력줄.
export default function Chat() {
  const { plans } = useTodayMeds();
  const all = [...new Set(plans.flatMap((p) => p.drugs))];
  const [target, setTarget] = useState('all'); // 'all' 또는 약 이름 하나
  const drugs = target === 'all' ? all : [target];
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);

  const send = async (q: string) => {
    q = q.trim();
    if (!q || busy) return;
    setText('');
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const r = await askChat(q, drugs);
      setMsgs((m) => [...m, { role: 'bot', text: r.answer, sources: r.sources, demo: r.demo, ai: r.ai }]);
    } catch {
      setMsgs((m) => [...m, { role: 'bot', text: '답을 가져오지 못했어요.\n잠시 뒤에 다시 물어봐 주세요.' }]);
    } finally {
      setBusy(false);
    }
  };
  const ready = !!text.trim() && !busy;

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView
        ref={(r) => {
          scroll.current = r;
        }}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <Avatar size={48} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.introTitle}>약 도우미</Text>
            <Text style={styles.introText}>내 약에 대해 궁금한 것을 물어보세요. 식약처 공식 정보로 쉽게 알려 드려요. 진료를 대신하지 않아요.</Text>
          </View>
        </View>

        {all.length > 1 && (
          <FilterBox><FilterRow label="어떤 약에 대해 물어볼까요?" options={[{ id: 'all', label: '내 약 전체' }, ...all.map((d) => ({ id: d, label: d }))]} value={target} onPick={setTarget} /></FilterBox>
        )}
        {!all.length && <Text style={styles.empty}>등록한 약이 없어도 물어볼 수 있어요. 약을 등록하면 그 약 기준으로 답해요.</Text>}

        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <View key={i} style={styles.me}>
              <Text style={styles.meText}>{m.text}</Text>
            </View>
          ) : (
            <View key={i} style={styles.botRow}>
              <Avatar />
              <View style={styles.bot}>
                <Text style={styles.botText}>{m.text}</Text>
                {!!m.sources?.length && <Text style={styles.source}>출처: 식약처 e약은요{m.demo ? ' (시연용 예시)' : ''}</Text>}
                {m.ai && <Text style={styles.aiTag}>식약처 공식 정보가 아니라 AI가 답한 내용이에요. 틀릴 수 있으니 의사나 약사에게 꼭 확인하세요.</Text>}
                <SpeakButton inline text={m.text} />
              </View>
            </View>
          ),
        )}
        {busy && (
          <View style={styles.botRow}>
            <Avatar />
            <View style={[styles.bot, styles.busy]}>
              <ActivityIndicator color={C.ai} />
              <Text style={styles.busyText}>찾고 있어요</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.dock}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.asks} keyboardShouldPersistTaps="handled">
          {ASKS.map((a) => (
            <Pressable key={a} accessibilityRole="button" onPress={() => send(a)} style={({ pressed }) => [styles.ask, pressed && { opacity: 0.7 }]}>
              <Text style={styles.askText}>{a}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.bar}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send(text)}
            placeholder="궁금한 것을 적어 주세요"
            placeholderTextColor={C.gray}
            returnKeyType="send"
            style={styles.input}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="보내기" onPress={() => send(text)} style={[styles.send, !ready && { opacity: 0.4 }]}>
            <Icon name="send" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  list: { padding: S.page, paddingBottom: S.gap, gap: S.gap },
  avatar: { backgroundColor: C.ai, alignItems: 'center', justifyContent: 'center' },
  intro: { flexDirection: 'row', alignItems: 'center', gap: S.in, backgroundColor: C.aiSoft, borderRadius: R.card, padding: S.item },
  introTitle: { fontSize: 22, fontWeight: '800', color: C.ai },
  introText: { fontSize: 16, lineHeight: 24, color: C.text },
  empty: { fontSize: 16, lineHeight: 24, color: C.sub },
  me: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: C.primary, borderRadius: R.card, borderBottomRightRadius: 4, padding: S.item },
  meText: { fontSize: 18, lineHeight: 28, color: '#fff', fontWeight: '700' },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '94%' },
  bot: { ...CARD, flexShrink: 1, borderTopLeftRadius: 4, padding: S.item, gap: S.in },
  botText: { fontSize: 18, lineHeight: 28, color: C.text },
  source: { fontSize: 16, color: C.sub },
  aiTag: { fontSize: 16, lineHeight: 24, fontWeight: '700', color: C.ai, backgroundColor: C.aiSoft, borderRadius: 12, padding: S.in, overflow: 'hidden' },
  busy: { flexDirection: 'row', alignItems: 'center', gap: S.in },
  busyText: { fontSize: 18, color: C.sub },
  dock: { backgroundColor: C.card, paddingTop: S.in, paddingBottom: 16, gap: S.in, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
  asks: { paddingHorizontal: S.page, gap: 8 },
  ask: { minHeight: 44, borderRadius: 22, backgroundColor: C.aiSoft, paddingHorizontal: S.item, justifyContent: 'center' },
  askText: { fontSize: 16, fontWeight: '800', color: C.ai },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: S.page },
  input: { flex: 1, minWidth: 0, minHeight: 56, borderRadius: 28, backgroundColor: C.soft, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 20, fontSize: 18, color: C.text },
  send: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.ai, alignItems: 'center', justifyContent: 'center' },
});
