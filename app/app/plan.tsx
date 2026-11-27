import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import ScreenTitle from '../components/ScreenTitle';
import BigButton from '../components/BigButton';
import { useDialog } from '../components/Dialog';
import Icon from '../components/Icon';
import SlotIcon from '../components/SlotIcon';
import type { ScanResult } from '../lib/api';
import { scheduleSlots } from '../lib/notify';
import { SLOTS, Slot, addDays, addPlan, allActiveSlots, timeText, today } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const md = (d: string) => d.replace(/^\d+-0?(\d+)-0?(\d+)$/, '$1월 $2일');

// 보조 기능: 자동으로 정해진 시간이 아닌 다른 시간에 먹을 때 직접 고른다.
export default function Plan() {
  const router = useRouter();
  const ask = useDialog();
  const { data } = useLocalSearchParams<{ data: string }>();
  const [picked, setPicked] = useState<Slot[]>([]);
  const [days, setDays] = useState(7);

  let cond = '';
  try {
    cond = (JSON.parse(data) as ScanResult).condition ?? '';
  } catch {}

  const toggle = (s: Slot) => setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const save = async () => {
    if (!picked.length) return ask({ title: '시간을 골라 주세요' });
    const r: ScanResult = JSON.parse(data);
    await addPlan({ drugs: r.drugs.map((d) => d.name), slots: picked, days, condition: r.condition, guess: r.guess, info: r.drugs, hospital: r.hospital || undefined, pharmacy: r.pharmacy || undefined, prescribedOn: r.date || undefined, metaAi: !!(r.hospital || r.pharmacy || r.date) });
    if (!(await scheduleSlots(await allActiveSlots()))) ask({ title: '알림을 켜 주세요', message: '설정에서 알림을 허용해 주세요.' });
    router.navigate('/');
  };

  return (
    <ScrollView style={{ backgroundColor: C.page }} contentContainerStyle={styles.wrap}>
<ScreenTitle text="먹는 시간 정하기" />
      <Text style={styles.ask}>{cond ? `${cond} 약을\n언제 드세요?` : '언제 드세요?'}</Text>
      <View style={styles.card}>
        <View style={styles.slots}>
          {SLOTS.map((s) => {
            const on = picked.includes(s.id);
            return (
              <Pressable key={s.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(s.id)} style={[styles.slot, on && styles.slotOn]}>
                <View style={[styles.slotIcon, !on && styles.slotIconOff]}>
                  <SlotIcon slot={s.id} size={30} />
                </View>
                <Text style={[styles.slotName, on && { color: '#fff' }]}>{s.label}</Text>
                <Text style={[styles.slotTime, on && { color: '#DDEBE4' }]}>{timeText(s)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>여러 개를 고를 수 있어요. 시간은 설정에서 바꿔요.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>며칠 동안 드세요?</Text>
        <View style={styles.stepper}>
          <Pressable accessibilityRole="button" accessibilityLabel="하루 줄이기" onPress={() => setDays((d) => Math.max(1, d - 1))} style={styles.stepBtn}>
            <Icon name="minus" size={28} color={C.primary} stroke={2.6} />
          </Pressable>
          <Text style={styles.days}>{days}일</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="하루 늘리기" onPress={() => setDays((d) => Math.min(90, d + 1))} style={styles.stepBtn}>
            <Icon name="plus" size={28} color={C.primary} stroke={2.6} />
          </Pressable>
        </View>
        <Text style={styles.hint}>오늘부터 {md(addDays(today(), days - 1))}까지</Text>
      </View>
      <BigButton label="저장" icon="check" onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: 28 },
  ask: { fontSize: 20, lineHeight: 30, fontWeight: '700', color: C.text },
  card: { ...CARD, padding: S.pad, gap: 16 },
  slots: { flexDirection: 'row', gap: 8 },
  slot: { flex: 1, minHeight: 112, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 4 },
  slotOn: { backgroundColor: C.primary, borderColor: C.primary },
  slotIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  slotIconOff: { borderWidth: 1, borderColor: C.line },
  slotName: { fontSize: 20, fontWeight: '800', color: C.text },
  slotTime: { fontSize: 14, fontWeight: '600', color: C.sub },
  hint: { fontSize: 16, color: C.sub, textAlign: 'center' },
  label: { fontSize: 18, fontWeight: '800', color: C.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  days: { flex: 1, textAlign: 'center', fontSize: 26, fontWeight: '900', color: C.text },
});
