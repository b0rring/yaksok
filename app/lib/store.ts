import AsyncStorage from '@react-native-async-storage/async-storage';

export type Slot = 'morning' | 'noon' | 'evening';
export const SLOTS: { id: Slot; label: string; hour: number; minute: number }[] = [
  { id: 'morning', label: '아침', hour: 8, minute: 0 },
  { id: 'noon', label: '점심', hour: 12, minute: 30 },
  { id: 'evening', label: '저녁', hour: 18, minute: 30 },
];
export const slotLabel = (s: string) => SLOTS.find((x) => x.id === s)?.label ?? s;

async function read<T>(key: string, fallback: T): Promise<T> {
  const v = await AsyncStorage.getItem(key);
  return v ? JSON.parse(v) : fallback;
}
const write = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v));

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
export type Plan = { id: string; drugs: string[]; slots: Slot[]; start: string; days: number };
const planEnd = (p: Plan) => addDays(p.start, p.days - 1);

export const getPlans = () => read<Plan[]>('plans', []);
export const activePlans = async () => (await getPlans()).filter((p) => planEnd(p) >= today());
export const plansOn = async (date: string) =>
  (await getPlans()).filter((p) => p.start <= date && date <= planEnd(p));

const key = (drugs: string[]) => [...drugs].sort().join('|');
export const hasDuplicate = async (drugs: string[]) =>
  (await activePlans()).some((p) => key(p.drugs) === key(drugs));

export async function addPlan(p: { drugs: string[]; slots: Slot[]; days: number }) {
  await write('plans', [...(await getPlans()), { ...p, id: String(Date.now()), start: today() }]);
}
// 알림은 진행 중인 계획의 시간대를 모두 합쳐서 예약
export const allActiveSlots = async () => [...new Set((await activePlans()).flatMap((p) => p.slots))];

// ── 복용 기록 ──
type Log = { date: string; slot: Slot };
export const getLogs = () => read<Log[]>('logs', []);
export const isTaken = async (slot: Slot) => (await getLogs()).some((l) => l.date === today() && l.slot === slot);
export const addLog = async (slot: Slot) => write('logs', [...(await getLogs()), { date: today(), slot }]);

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
export async function addVisit(v: Omit<Visit, 'id' | 'date'>) {
  const visit = { ...v, id: String(Date.now()), date: today() };
  await write('visits', [...(await getVisits()), visit]);
  return visit;
}
