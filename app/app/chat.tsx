import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import SpeakButton from '../components/SpeakButton';
import { askChat } from '../lib/api';
import { C, CARD, R, S } from '../lib/theme';
import { useTodayMeds } from '../lib/useTodayMeds';

type Msg = { role: 'user' | 'bot'; text: string; sources?: string[]; demo?: boolean; ai?: boolean };
const HELLO: Msg = { role: 'bot', text: '약에 대해 궁금한 것을 물어보세요.\n식약처 공식 정보로 쉽게 알려 드려요.\n공식 정보에 없으면 AI 답이라고 표시해요.' };
const ASKS = ['이 약은 어디에 쓰나요?', '술을 마셔도 되나요?', '부작용이 있나요?', '같이 먹으면 안 되는 약이 있나요?'];

// 약 물어보기: 등록한 약을 바탕으로, 식약처 e약은요 공식 정보 안에서만 답한다. 답은 "듣기"로 읽어 준다.
export default function Chat() {
  const { plans } = useTodayMeds();
  const drugs = [...new Set(plans.flatMap((p) => p.drugs))];
  const [msgs, setMsgs] = useState<Msg[]>([HELLO]);
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

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView
        ref={(r) => {
          scroll.current = r;
        }}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        <Text style={styles.note}>AI가 식약처 공식 정보를 쉽게 풀어 쓴 답이에요. 진료를 대신하지 않아요.</Text>
        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <View key={i} style={styles.me}>
              <Text style={styles.meText}>{m.text}</Text>
            </View>
          ) : (
            <View key={i} style={styles.bot}>
              <Text style={styles.botText}>{m.text}</Text>
              {!!m.sources?.length && (
                <Text style={styles.source}>출처: 식약처 e약은요{m.demo ? ' (시연용 예시)' : ''}</Text>
              )}
              {m.ai && <Text style={styles.aiTag}>식약처 공식 정보가 아니라 AI가 답한 내용이에요. 틀릴 수 있으니 의사·약사에게 꼭 확인하세요.</Text>}
              {i > 0 && <SpeakButton inline text={m.text} />}
            </View>
          ),
        )}
        {busy && <Text style={styles.busy}>찾고 있어요…</Text>}
        {msgs.length === 1 && (
          <View style={styles.asks}>
            {ASKS.map((a) => (
              <Pressable key={a} accessibilityRole="button" onPress={() => send(a)} style={({ pressed }) => [styles.ask, pressed && { opacity: 0.7 }]}>
                <Text style={styles.askText}>{a}</Text>
              </Pressable>
            ))}
          </View>
        )}
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
        <View style={{ width: 110 }}>
          <BigButton label="보내기" small onPress={() => send(text)} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  list: { padding: S.page, paddingBottom: 20, gap: S.gap },
  note: { fontSize: 16, lineHeight: 24, color: C.sub, textAlign: 'center' },
  me: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: C.primary, borderRadius: R.card, padding: 16 },
  meText: { fontSize: 18, lineHeight: 28, color: '#fff', fontWeight: '700' },
  bot: { ...CARD, alignSelf: 'flex-start', maxWidth: '92%', padding: S.item, gap: S.in },
  botText: { fontSize: 18, lineHeight: 28, color: C.text },
  source: { fontSize: 16, color: C.sub },
  aiTag: { fontSize: 16, lineHeight: 24, fontWeight: '700', color: C.orange },
  busy: { fontSize: 18, color: C.sub },
  asks: { gap: 8, marginTop: 4 },
  ask: { minHeight: 52, borderRadius: R.ctl, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, justifyContent: 'center', paddingHorizontal: 16 },
  askText: { fontSize: 18, fontWeight: '800', color: C.primary },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 16, backgroundColor: C.card },
  input: { flex: 1, minWidth: 0, minHeight: 56, borderRadius: 28, backgroundColor: C.soft, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, fontSize: 18, color: C.text },
});
