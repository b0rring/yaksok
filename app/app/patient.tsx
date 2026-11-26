import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import Chip from '../components/Chip';
import Icon from '../components/Icon';
import { ApiError, PatientData, apiPatient } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Plan, SLOTS, didTake, isActive, planTitle, today } from '../lib/store';
import { C, CARD, S } from '../lib/theme';

const ago = (updated: string | null) => {
  if (!updated) return '아직 기록이 올라오지 않았어요';
  const min = Math.max(0, Math.round((Date.now() - new Date(`${updated.replace(' ', 'T')}Z`).getTime()) / 60_000));
  return min < 1 ? '방금 전에 업데이트' : min < 60 ? `${min}분 전에 업데이트` : min < 1440 ? `${Math.floor(min / 60)}시간 전에 업데이트` : `${Math.floor(min / 1440)}일 전에 업데이트`;
};

// 보호자 화면: 연결된 환자의 오늘 복약 체크(읽기 전용)와 진료 기록. 환자 앱이 서버에 올린 기록이라 몇 분 늦을 수 있다.
export default function PatientView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<PatientData | null>(null);
  const [err, setErr] = useState('');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const load = () =>
        apiPatient(token!, Number(id))
          .then((d) => alive && (setData(d), setErr('')))
          .catch((e) => alive && setErr(e instanceof ApiError ? e.message : '불러오지 못했어요'));
      load();
      const iv = setInterval(load, 15_000); // 화면을 보고 있는 동안 15초마다 새로 확인
      return () => {
        alive = false;
        clearInterval(iv);
      };
    }, [token, id]),
  );

  if (err && !data) return <Text style={styles.err}>{err}</Text>;
  if (!data) return null;

  const t = today();
  const plans = (data.plans as Plan[]).filter(isActive);
  const slots = SLOTS.map((s) => ({ ...s, items: plans.filter((p) => p.slots.includes(s.id)).map((p) => ({ p, done: didTake(data.logs, t, s.id, p.id) })) })).filter((s) => s.items.length);
  const visits = [...(data.visits as { id: string; date: string; hospital: string; reason: string }[])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.name}>{data.name}님</Text>
        <Chip small text={ago(data.updated)} />
      </View>

      <Text style={styles.section}>오늘 약</Text>
      {!slots.length && <Text style={styles.sub}>오늘 먹을 약이 없어요</Text>}
      {slots.map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.slot}>{s.label}</Text>
          {s.items.map(({ p, done }) => (
            <View key={p.id} style={styles.row}>
              <View style={[styles.box, done && styles.boxDone]}>{done && <Icon name="check" size={20} color="#fff" stroke={3.5} />}</View>
              <Text style={[styles.item, done && { color: C.sub }]}>{planTitle(p)}</Text>
              <Text style={[styles.state, { color: done ? C.green : C.orange }]}>{done ? '먹었어요' : '아직'}</Text>
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.section}>진료 기록</Text>
      {!visits.length && <Text style={styles.sub}>아직 없어요</Text>}
      {visits.map((v) => (
        <View key={v.id} style={styles.card}>
          <Chip small text={v.date.replace(/^\d+-0?(\d+)-0?(\d+)$/, '$1월 $2일')} />
          <Text style={styles.item}>{v.hospital}</Text>
          <Text style={styles.sub}>{v.reason}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.page, paddingBottom: 40, gap: S.gap },
  err: { fontSize: 18, color: C.red, textAlign: 'center', margin: S.page },
  card: { ...CARD, padding: S.item, gap: S.in },
  name: { fontSize: 22, fontWeight: '800', color: C.text },
  section: { fontSize: 22, fontWeight: '800', color: C.text, marginTop: S.in },
  sub: { fontSize: 18, lineHeight: 24, color: C.sub },
  slot: { fontSize: 20, fontWeight: '800', color: C.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.in },
  box: { width: 32, height: 32, borderRadius: 8, borderWidth: 3, borderColor: C.mist, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  boxDone: { backgroundColor: C.primary, borderColor: C.primary },
  item: { flex: 1, fontSize: 20, fontWeight: '800', color: C.text },
  state: { fontSize: 18, fontWeight: '800' },
});
