import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../components/AppText';
import ScreenTitle from '../components/ScreenTitle';
import { useDialog } from '../components/Dialog';
import { useGuide } from '../components/Guide';
import Icon, { IconName } from '../components/Icon';
import Segmented from '../components/Segmented';
import SlotIcon from '../components/SlotIcon';
import { useAuth } from '../lib/auth';
import { syncNotifications, testIn5s } from '../lib/notify';
import { RATES, SCALES, useSettings } from '../lib/settings';
import { SLOTS, Slot, addPlan, saveTime, timeText } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

// 시간대마다 고를 수 있는 범위(분). 아침·점심·저녁 순서가 뒤바뀌지 않게 한다.
const RANGE: Record<Slot, [number, number]> = { morning: [300, 660], noon: [690, 990], evening: [1020, 1380] };
const STEP = 30;
const ROLE = { patient: '환자', guardian: '보호자', doctor: '의사' } as const;
const CLOCK_OPTIONS = [
  { id: 24, label: '13:05' },
  { id: 12, label: '오후 1:05' },
] as const;

// 설정: 계정, 연동 계정, 보기(글씨 크기·시각 표기), 약 드시는 시간, 소리와 알림, 도움, 시연용.
export default function Settings() {
  const ask = useDialog();
  const router = useRouter();
  const { user, links } = useAuth();
  const openGuide = useGuide();
  const { scale, rate, clock, alarm, set } = useSettings();
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

  const linked = links.patients.length + links.guardians.length;
  const canLink = user?.role === 'patient' || user?.role === 'guardian';

  return (
    <ScrollView style={{ backgroundColor: C.page }} contentContainerStyle={styles.wrap}>
<ScreenTitle text="설정" />
      <Pressable accessibilityRole="button" onPress={() => router.push('/account')} style={({ pressed }) => [styles.card, styles.me, pressed && { opacity: 0.85 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user ? user.name.slice(0, 1) : '?'}</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.name}>{user ? `${user.name}님` : '로그인 또는 가입'}</Text>
          <View style={styles.role}>
            <Text style={styles.roleText}>{user ? ROLE[user.role] : '로그인하면 보호자와 기록을 나눌 수 있어요'}</Text>
          </View>
        </View>
        <Icon name="right" size={24} color={C.primary} stroke={2.6} />
      </Pressable>

      {canLink && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/links')} style={({ pressed }) => [styles.card, styles.row, pressed && { opacity: 0.85 }]}>
          <View style={styles.round}>
            <Icon name="users" size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>연동 계정 관리</Text>
            <Text style={styles.sub}>{user?.role === 'guardian' ? '환자와 약 기록을 나눠요' : '보호자와 약 기록을 나눠요'}</Text>
          </View>
          {linked > 0 && (
            <View style={styles.count}>
              <Text style={styles.countText}>{linked}명</Text>
            </View>
          )}
          <Icon name="right" size={24} color={C.primary} stroke={2.6} />
        </Pressable>
      )}

      <Part title="보기">
        <View style={styles.field}>
          <Text style={styles.title}>글씨 크기</Text>
          <Segmented big options={SCALES} value={scale as 1 | 1.15 | 1.3} onPick={(v) => set({ scale: v })} />
          <View style={styles.sample}>
            <Text style={styles.sampleText}>이 크기로 보여요</Text>
          </View>
        </View>
        <View style={[styles.field, styles.sep]}>
          <Text style={styles.title}>시각 표기</Text>
          <Segmented big options={CLOCK_OPTIONS} value={clock as 12 | 24} onPick={(v) => set({ clock: v })} />
        </View>
      </Part>

      <Part title="약 드시는 시간" note="바꾸면 알림 시간도 함께 바뀌어요.">
        <View>
        {SLOTS.map((s, i) => (
          <View key={s.id} style={[styles.timeRow, i > 0 && styles.line]}>
            <View style={styles.slotIcon}>
              <SlotIcon slot={s.id} size={28} />
            </View>
            <Text style={styles.slotName}>{s.label}</Text>
            <Step icon="minus" label={`${s.label} 30분 일찍`} onPress={() => move(s.id, -STEP)} />
            <Text style={styles.time}>{timeText(s)}</Text>
            <Step icon="plus" label={`${s.label} 30분 늦게`} onPress={() => move(s.id, STEP)} />
          </View>
        ))}
        </View>
      </Part>

      <Part title="소리와 알림">
        <View style={styles.field}>
          <Text style={styles.title}>읽어주기 속도</Text>
          <Segmented big options={RATES} value={rate as 0.85 | 1} onPick={(v) => set({ rate: v })} />
        </View>
        <View style={[styles.switchRow, styles.sep]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>복약 알림</Text>
            <Text style={styles.sub}>약 드실 시간에 알려 드려요</Text>
          </View>
          <Switch
            value={alarm}
            onValueChange={(v) => {
              set({ alarm: v });
              setTimeout(() => syncNotifications().catch(() => {}), 200);
            }}
            trackColor={{ false: '#B7C6BE', true: C.primary }}
            thumbColor="#fff"
            accessibilityLabel="복약 알림"
          />
        </View>
      </Part>

      <Part title="도움">
        <View>
          <Link icon="info" title="사용법 다시 보기" onPress={openGuide} />
          <View style={styles.line}>
            <Link icon="clock" title="알림 시험하기" sub="5초 뒤에 알림이 와요" onPress={async () => ask({ title: (await testIn5s()) ? '5초 뒤에 알림이 와요' : '알림을 켜 주세요' })} />
          </View>
        </View>
      </Part>

      <Part title="시연용">
        <View style={styles.demo}>
          <Text style={styles.sub}>화면 확인용 가짜 약을 넣어요. 내 약에서 지울 수 있어요.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              // 화면 확인용 더미: 아침·점심·저녁 3일. 시간이 지난 시간대는 "지금 먹을 약" 카드로 보인다. 내 약에서 지우면 된다.
              const info = ['시험약 가', '시험약 나'].map((name) => ({ name, effect: '화면 확인용 가짜 약이에요.', how: '시험용', caution: '시험용', avoid: '시험용', by: 'user' as const }));
              await addPlan({ drugs: info.map((d) => d.name), slots: ['morning', 'noon', 'evening'], days: 3, condition: '시험', info });
              syncNotifications().catch(() => {});
              ask({ title: '시험용 약을 넣었어요', message: '오늘 화면에서 확인하고,\n내 약에서 지울 수 있어요.' });
            }}
            style={({ pressed }) => [styles.demoBtn, pressed && { opacity: 0.8 }]}
          >
            <Icon name="plus" size={24} color={C.primary} stroke={2.6} />
            <Text style={styles.demoText}>시험용 약 넣기</Text>
          </Pressable>
        </View>
      </Part>
    </ScrollView>
  );
}

function Part({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.part}>{title}</Text>
      {title === '시연용' ? children : <View style={styles.card}>{children}</View>}
      {!!note && <Text style={styles.sub}>{note}</Text>}
    </View>
  );
}

function Link({ icon, title, sub, onPress }: { icon: IconName; title: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, { minHeight: 64 }, pressed && { opacity: 0.7 }]}>
      <View style={styles.round}>
        <Icon name={icon} size={22} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      <Icon name="right" size={24} color={C.primary} stroke={2.6} />
    </Pressable>
  );
}

function Step({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.step, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={22} color={C.primary} stroke={3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: 28 },
  card: { ...CARD, padding: S.pad, gap: 16 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  name: { fontSize: 24, fontWeight: '800', color: C.text },
  role: { alignSelf: 'stretch', borderRadius: 14, backgroundColor: C.fill, paddingHorizontal: 12, paddingVertical: 3 },
  roleText: { fontSize: 16, fontWeight: '800', color: C.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  sub: { fontSize: 16, lineHeight: 24, color: C.sub },
  count: { borderRadius: 14, backgroundColor: C.fill, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 16, fontWeight: '800', color: C.primary },
  part: { fontSize: 18, fontWeight: '800', color: C.sub },
  field: { gap: 12 },
  line: { borderTopWidth: 1, borderTopColor: C.line },
  sep: { paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line },
  title: { fontSize: 20, fontWeight: '800', color: C.text },
  sample: { borderRadius: 14, backgroundColor: C.soft, paddingVertical: 14, paddingHorizontal: 16 },
  sampleText: { fontSize: 20, fontWeight: '800', color: C.text },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64 },
  slotIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  slotName: { width: 44, fontSize: 20, fontWeight: '800', color: C.text },
  time: { flex: 1, fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'center' },
  step: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  demo: { borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border, padding: 16, gap: 12 },
  demoBtn: { minHeight: 56, borderRadius: 28, backgroundColor: C.fill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  demoText: { fontSize: 20, fontWeight: '800', color: C.primary },
});
