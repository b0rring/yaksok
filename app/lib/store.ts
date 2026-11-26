import AsyncStorage from '@react-native-async-storage/async-storage';

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
// stopped: 복용을 중지한 날짜. 중지한 날부터는 먹을 날이 아니다 (이전 기록은 남는다)
export type Plan = { id: string; drugs: string[]; slots: Slot[]; start: string; days: number; stopped?: string };
export const planEnd = (p: Plan) => (p.stopped ? addDays(p.stopped, -1) : addDays(p.start, p.days - 1));

export const getPlans = () => read<Plan[]>('plans', []);
export const isActive = (p: Plan) => !p.stopped && planEnd(p) >= today();
export const activePlans = async () => (await getPlans()).filter(isActive);
export const plansOn = async (date: string) =>
  (await getPlans()).filter((p) => p.start <= date && date <= planEnd(p));

const key = (drugs: string[]) => [...drugs].sort().join('|');
export const hasDuplicate = async (drugs: string[]) =>
  (await activePlans()).some((p) => key(p.drugs) === key(drugs));

export async function addPlan(p: { drugs: string[]; slots: Slot[]; days: number }) {
  await write('plans', [...(await getPlans()), { ...p, id: String(Date.now()), start: today() }]);
}
// 복용 중지(기록은 남김) / 삭제 / 같은 약으로 다시 등록
export const stopPlan = async (id: string) =>
  write('plans', (await getPlans()).map((p) => (p.id === id ? { ...p, stopped: today() } : p)));
export const deletePlan = async (id: string) => write('plans', (await getPlans()).filter((p) => p.id !== id));

// 알림은 진행 중인 계획의 시간대를 모두 합쳐서 예약
export const allActiveSlots = async () => [...new Set((await activePlans()).flatMap((p) => p.slots))];

// ── 복용 기록 ──
type Log = { date: string; slot: Slot };
export const getLogs = () => read<Log[]>('logs', []);
export const isTaken = async (slot: Slot) => (await getLogs()).some((l) => l.date === today() && l.slot === slot);
export const addLog = async (slot: Slot) => write('logs', [...(await getLogs()), { date: today(), slot }]);
// 오늘 그 시간대의 먹은 기록을 모두 지운다 ("먹었어요" 취소)
export const removeLog = async (slot: Slot) => write('logs', (await getLogs()).filter((l) => !(l.date === today() && l.slot === slot)));

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
