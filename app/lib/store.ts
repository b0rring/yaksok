import AsyncStorage from '@react-native-async-storage/async-storage';

export type Slot = 'morning' | 'noon' | 'evening';
export const SLOTS: { id: Slot; label: string; hour: number; minute: number }[] = [
  { id: 'morning', label: '아침', hour: 8, minute: 0 },
  { id: 'noon', label: '점심', hour: 12, minute: 30 },
  { id: 'evening', label: '저녁', hour: 18, minute: 30 },
];

export type Plan = { drugs: string[]; slots: Slot[] };
type Log = { date: string; slot: Slot };

async function read<T>(key: string, fallback: T): Promise<T> {
  const v = await AsyncStorage.getItem(key);
  return v ? JSON.parse(v) : fallback;
}
const write = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v));

// ponytail: UTC 날짜라 한국 시간 자정~9시에 하루가 어긋남. 필요하면 로컬 날짜로.
export const today = () => new Date().toISOString().slice(0, 10);

export const getPlan = () => read<Plan | null>('plan', null);
export const savePlan = (p: Plan) => write('plan', p);

export const getLogs = () => read<Log[]>('logs', []);
export const isTaken = async (slot: Slot) => (await getLogs()).some((l) => l.date === today() && l.slot === slot);
export const addLog = async (slot: Slot) => write('logs', [...(await getLogs()), { date: today(), slot }]);

export const getVoice = () => read<string | null>('voice', null);
export const saveVoice = (uri: string) => write('voice', uri);
