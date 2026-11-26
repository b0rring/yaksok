import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Drug } from './api';

export type Slot = 'morning' | 'noon' | 'evening';
export const SLOTS: { id: Slot; label: string; hour: number; minute: number }[] = [
  { id: 'morning', label: '아침', hour: 8, minute: 0 },
  { id: 'noon', label: '점심', hour: 12, minute: 30 },
  { id: 'evening', label: '저녁', hour: 18, minute: 30 },
];
// ponytail: 약 먹는 시간은 앱 곳곳에서 SLOTS를 읽으므로, 설정에서 바꾸면 이 값을 직접 고친다 (시작할 때 loadTimes로 불러옴).
export const timeText = (s: { hour: number; minute: number }) =>
  `${s.hour < 12 ? '오전' : '오후'} ${s.hour % 12 || 12}:${String(s.minute).padStart(2, '0')}`;
export const slotLabel = (s: string) => SLOTS.find((x) => x.id === s)?.label ?? s;

async function read<T>(key: string, fallback: T): Promise<T> {
  const v = await AsyncStorage.getItem(key);
  return v ? JSON.parse(v) : fallback;
}
// 저장할 때마다 알림을 보낸다: 로그인한 환자 계정이 서버에 동기화하는 신호 (lib/auth.tsx)
let onWrite: (() => void) | null = null;
export const setOnWrite = (f: (() => void) | null) => {
  onWrite = f;
};
const write = async (key: string, v: unknown) => {
  await AsyncStorage.setItem(key, JSON.stringify(v));
  onWrite?.();
};

// 기기 로컬 날짜 (YYYY-MM-DD). 한국 시간 아침 8시 알림이 어제로 계산되지 않게 로컬 기준.
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => fmt(new Date());
export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

// ── 복약 계획: 약 봉투 한 장 = 계획 하나 ──
// stopped: 복용을 중지한 날짜. 중지한 날부터는 먹을 날이 아니다 (이전 기록은 남는다)
// condition: 무슨 병·증상 때문에 처방받은 약인지 (봉투 한 장 = 한 묶음). guess: 봉투에 없어서 AI가 약으로 추정한 것
// info: 약마다 쉬운 설명·식약처 공식 설명 (내 약 탭에서 보여 준다)
export type Plan = {
  id: string;
  drugs: string[];
  slots: Slot[];
  start: string;
  days: number;
  stopped?: string;
  condition?: string;
  guess?: boolean;
  info?: Drug[];
  // 처방 정보: 봉투에서 읽은(또는 직접 적은) 처방 병원, 조제 약국, 조제일. 짐작하지 않고 없으면 비워 둔다. metaAi = AI가 읽은 값
  hospital?: string;
  pharmacy?: string;
  prescribedOn?: string;
  metaAi?: boolean;
};
export const planTitle = (p: Plan) => (p.condition ? `${p.condition} 약` : '처방받은 약');
export const planEnd = (p: Plan) => (p.stopped ? addDays(p.stopped, -1) : addDays(p.start, p.days - 1));

export const getPlans = () => read<Plan[]>('plans', []);
export const isActive = (p: Plan) => !p.stopped && planEnd(p) >= today();
export const activePlans = async () => (await getPlans()).filter(isActive);
export const plansOn = async (date: string) =>
  (await getPlans()).filter((p) => p.start <= date && date <= planEnd(p));

const key = (drugs: string[]) => [...drugs].sort().join('|');
export const hasDuplicate = async (drugs: string[]) =>
  (await activePlans()).some((p) => key(p.drugs) === key(drugs));

export async function addPlan(p: Omit<Plan, 'id' | 'start' | 'stopped'>) {
  await write('plans', [...(await getPlans()), { ...p, id: String(Date.now()), start: today() }]);
}
// 복용 중지(기록은 남김) / 삭제 / 같은 약으로 다시 등록
export const stopPlan = async (id: string) =>
  write('plans', (await getPlans()).map((p) => (p.id === id ? { ...p, stopped: today() } : p)));
export const updatePlan = async (id: string, patch: Partial<Plan>) =>
  write('plans', (await getPlans()).map((p) => (p.id === id ? { ...p, ...patch } : p)));
export const deletePlan = async (id: string) => write('plans', (await getPlans()).filter((p) => p.id !== id));

// 알림은 진행 중인 계획의 시간대를 모두 합쳐서 예약
export const allActiveSlots = async () => [...new Set((await activePlans()).flatMap((p) => p.slots))];

// ── 복용 기록 ──
// 기록 하나 = 그 날·시간대에 이 계획(약 묶음)을 먹었다. plan이 없는 옛 기록은 그 시간대 전체로 본다.
export type Log = { date: string; slot: Slot; plan?: string };
export const getLogs = () => read<Log[]>('logs', []);
export const didTake = (logs: Log[], date: string, slot: string, plan: string) =>
  logs.some((l) => l.date === date && l.slot === slot && (!l.plan || l.plan === plan));
export const addLogs = async (slot: Slot, plans: string[]) =>
  write('logs', [...(await getLogs()), ...plans.map((plan) => ({ date: today(), slot, plan }))]);
// 오늘 그 시간대에서 이 묶음의 먹은 기록을 지운다 ("먹었어요" 취소)
export const removeLog = async (slot: Slot, plan: string) =>
  write('logs', (await getLogs()).filter((l) => !(l.date === today() && l.slot === slot && (!l.plan || l.plan === plan))));

// ── 진료 기록 ──
export type Visit = {
  id: string;
  date: string;
  hospital: string;
  reason: string;
  summary: string;
  transcript?: string;
};
export const getVisits = () => read<Visit[]>('visits', []);
export async function addVisit(v: Omit<Visit, 'id' | 'date'> & { date?: string }) {
  const visit = { ...v, id: String(Date.now()), date: v.date || today() };
  await write('visits', [...(await getVisits()), visit]);
  return visit;
}
// 진료 기록 관리: 고치기·지우기
export const updateVisit = async (id: string, patch: Partial<Visit>) =>
  write('visits', (await getVisits()).map((v) => (v.id === id ? { ...v, ...patch } : v)));
export const deleteVisit = async (id: string) => write('visits', (await getVisits()).filter((v) => v.id !== id));

// ── 약 먹는 시간 (설정에서 바꿈) ──
type Times = Partial<Record<Slot, { hour: number; minute: number }>>;
const applyTimes = (t: Times) => {
  for (const s of SLOTS) {
    const v = t[s.id];
    if (v) [s.hour, s.minute] = [v.hour, v.minute];
  }
};
export async function loadTimes() {
  applyTimes(await read<Times>('times', {}));
}
export async function saveTime(id: Slot, hour: number, minute: number) {
  const t = await read<Times>('times', {});
  t[id] = { hour, minute };
  await write('times', t);
  applyTimes(t);
}
