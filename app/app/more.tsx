import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import { useGuide } from '../components/Guide';
import Icon from '../components/Icon';
import { syncNotifications, testIn5s } from '../lib/notify';
import { RATES, SCALES, useSettings } from '../lib/settings';
import { SLOTS, Slot, saveTime, timeText } from '../lib/store';
import { C, CARD, R, S } from '../lib/theme';

// 시간대마다 고를 수 있는 범위(분). 아침·점심·저녁 순서가 뒤바뀌지 않게 한다.
const RANGE: Record<Slot, [number, number]> = { morning: [300, 660], noon: [690, 990], evening: [1020, 1380] };
const STEP = 30;

// 설정: 글씨 크기, 약 드시는 시간, 읽는 속도, 사용법, 알림 시험.
export default function Settings() {
  const ask = useDialog();
  const openGuide = useGuide();
  const { scale, rate, set } = useSettings();
  const [, bump] = useState(0); // 시간이 바뀌면 화면을 다시 그린다 (SLOTS 값이 바뀜)

  const move = async (id: Slot, delta: number) => {
    const s = SLOTS.find((x) => x.id === id)!;
    const [lo, hi] = RANGE[id];
    const m = Math.min(hi, Math.max(lo, s.hour * 60 + s.minute + delta));
    if (m === s.hour * 60 + s.minute) return;
    await saveTime(id, Math.floor(m / 60), m % 60);
    syncNotifications().catch(() => {});
    bump((n) => n + 1);
  };

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.wrap}>
      <Section title="글씨 크기">
        <Choice options={SCALES} value={scale} onPick={(v) => set({ scale: v })} />
        <Text style={styles.sample}>이 크기로 보여요</Text>
      </Section>

      <Section title="약 드시는 시간">
        {SLOTS.map((s) => (
          <View key={s.id} style={styles.timeRow}>
            <Text style={styles.slot}>{s.label}</Text>
            <Step icon="minus" label={`${s.label} 30분 일찍`} onPress={() => move(s.id, -STEP)} />
            <Text style={styles.time}>{timeText(s)}</Text>
            <Step icon="plus" label={`${s.label} 30분 늦게`} onPress={() => move(s.id, STEP)} />
          </View>
        ))}
      </Section>

      <Section title="소리로 읽어주기 속도">
        <Choice options={RATES} value={rate} onPick={(v) => set({ rate: v })} />
      </Section>

      <BigButton label="사용법 다시 보기" variant="secondary" small onPress={openGuide} />
      <BigButton
        label="알림 시험 (5초 뒤)"
        variant="secondary"
        small
        onPress={async () => ask({ title: (await testIn5s()) ? '5초 뒤에 알림이 와요' : '알림을 켜 주세요' })}
      />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

// 보기 중 하나를 고르는 큰 버튼 줄
function Choice<T extends number>({ options, value, onPick }: { options: readonly { id: T; label: string }[]; value: number; onPick: (v: T) => void }) {
  return (
    <View style={styles.choice}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} accessibilityRole="button" onPress={() => onPick(o.id)} style={[styles.opt, on && styles.optOn]}>
            <Text style={[styles.optText, on && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Step({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.step, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={28} color={C.primary} stroke={3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: S.gap },
  card: { ...CARD, padding: S.pad, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', color: C.text },
  sample: { fontSize: 20, color: C.sub, textAlign: 'center' },
  choice: { flexDirection: 'row', gap: 8 },
  opt: { flex: 1, minHeight: 60, borderRadius: R.ctl, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  optOn: { backgroundColor: C.primary },
  optText: { fontSize: 22, fontWeight: '800', color: C.text },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slot: { width: 48, fontSize: 24, fontWeight: '800', color: C.text },
  time: { flex: 1, fontSize: 24, fontWeight: '800', color: C.text, textAlign: 'center' },
  step: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
});
