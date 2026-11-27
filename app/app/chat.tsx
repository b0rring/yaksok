import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../components/AppText';
import ScreenTitle from '../components/ScreenTitle';
import Icon from '../components/Icon';
import SpeakButton from '../components/SpeakButton';
import { askChat } from '../lib/api';
import { C, S } from '../lib/theme';
import { useTodayMeds } from '../lib/useTodayMeds';

type Msg = { role: 'user' | 'bot'; text: string; sources?: string[]; demo?: boolean; ai?: boolean };
const ASKS = ['이 약은 어디에 쓰나요?', '술을 마셔도 되나요?', '부작용이 있나요?', '같이 먹으면 안 되는 약이 있나요?'];

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
        <ScreenTitle text="약 도우미" />
        <View style={styles.intro}>
          <Icon name="sparkles" size={24} color={C.ai} />
          <Text style={styles.introText}>내 약에 대해 궁금한 것을 물어보세요. 식약처 공식 정보로 쉽게 알려 드려요. 진료를 대신하지 않아요.</Text>
        </View>

        {all.length > 1 && (
          <View style={{ gap: 8 }}>
            <Text style={styles.label}>어떤 약에 대해 물어볼까요?</Text>
            <View style={styles.chips}>
              {[{ id: 'all', label: '내 약 전체' }, ...all.map((d) => ({ id: d, label: d }))].map((o) => (
                <Pressable key={o.id} accessibilityRole="button" accessibilityState={{ selected: target === o.id }} onPress={() => setTarget(o.id)} style={[styles.chip, target === o.id && styles.chipOn]}>
                  <Text style={[styles.chipText, target === o.id && { color: '#fff' }]}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {!all.length && <Text style={styles.empty}>등록한 약이 없어도 물어볼 수 있어요. 약을 등록하면 그 약 기준으로 답해요.</Text>}

        {msgs.length > 0 && (
          <View style={styles.talk}>
            {msgs.map((m, i) =>
              m.role === 'user' ? (
                <View key={i} style={styles.me}>
                  <Text style={styles.meText}>{m.text}</Text>
                </View>
              ) : (
                <View key={i} style={styles.botBox}>
                  <View style={styles.botName}>
                    <Icon name="sparkles" size={16} color={C.ai} />
                    <Text style={styles.botNameText}>약 도우미</Text>
                  </View>
                  <View style={styles.bot}>
                    <Text style={styles.botText}>{m.text}</Text>
                  </View>
                  {!!m.sources?.length && <Text style={styles.small}>출처: 식약처 e약은요{m.demo ? ' (시연용 예시)' : ''}</Text>}
                  <Text style={styles.small}>{m.ai ? '식약처 공식 정보가 아니라 AI가 답한 내용이에요. 틀릴 수 있으니 의사나 약사에게 꼭 확인하세요.' : 'AI 답이라 틀릴 수 있어요. 의사나 약사에게 꼭 확인하세요.'}</Text>
                  <SpeakButton ai text={m.text} />
                </View>
              ),
            )}
            {busy && (
              <View style={styles.botBox}>
                <View style={styles.botName}>
                  <Icon name="sparkles" size={16} color={C.ai} />
                  <Text style={styles.botNameText}>약 도우미</Text>
                </View>
                <View style={[styles.bot, styles.busy]}>
                  <ActivityIndicator color={C.ai} />
                  <Text style={styles.busyText}>찾고 있어요</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Text style={styles.sub}>이런 것도 물어보세요</Text>
          {ASKS.map((a) => (
            <Pressable key={a} accessibilityRole="button" onPress={() => send(a)} style={({ pressed }) => [styles.ask, pressed && { opacity: 0.7 }]}>
              <Text style={styles.askText}>{a}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.dock}>
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
  wrap: { flex: 1, backgroundColor: C.page },
  list: { padding: S.page, paddingBottom: 24, gap: 28 },
  intro: { flexDirection: 'row', gap: 10, backgroundColor: C.aiSoft, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  introText: { flex: 1, fontSize: 16, lineHeight: 24, color: C.aiText },
  label: { fontSize: 18, fontWeight: '800', color: C.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, borderRadius: 22, borderWidth: 1.5, borderColor: C.aiBorder, backgroundColor: '#fff', paddingHorizontal: 16, justifyContent: 'center' },
  chipOn: { backgroundColor: C.ai, borderColor: C.ai },
  chipText: { fontSize: 18, fontWeight: '800', color: C.ai },
  empty: { fontSize: 16, lineHeight: 24, color: C.sub },
  talk: { gap: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.line },
  me: { alignSelf: 'flex-end', maxWidth: '78%', backgroundColor: C.primary, borderRadius: 20, borderBottomRightRadius: 6, paddingVertical: 14, paddingHorizontal: 16 },
  meText: { fontSize: 18, lineHeight: 27, color: '#fff', fontWeight: '600' },
  botBox: { alignSelf: 'flex-start', maxWidth: '88%', gap: 6 },
  botName: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  botNameText: { fontSize: 16, fontWeight: '800', color: C.ai },
  bot: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 20, borderTopLeftRadius: 6, paddingVertical: 14, paddingHorizontal: 16 },
  botText: { fontSize: 18, lineHeight: 28, color: C.text },
  small: { fontSize: 14, lineHeight: 20, color: C.sub },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  busyText: { fontSize: 18, color: C.sub },
  sub: { fontSize: 16, fontWeight: '700', color: C.sub },
  ask: { minHeight: 52, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, paddingHorizontal: 16, justifyContent: 'center' },
  askText: { fontSize: 18, fontWeight: '700', color: C.text },
  dock: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, paddingBottom: 16 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: S.page },
  input: { flex: 1, minWidth: 0, minHeight: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 20, fontSize: 18, color: C.text },
  send: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.ai, alignItems: 'center', justifyContent: 'center' },
});
