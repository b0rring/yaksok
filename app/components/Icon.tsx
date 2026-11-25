import { CalendarDays, Camera, House, Mic, Pill } from 'lucide-react-native';

// 앱 전체에서 쓰는 선(flat) 아이콘. 이모지 대신 이것만 쓴다.
const ICONS = { home: House, pill: Pill, camera: Camera, mic: Mic, calendar: CalendarDays };
export type IconName = keyof typeof ICONS;

export default function Icon({ name, size = 28, color = '#1F1F1F' }: { name: IconName; size?: number; color?: string }) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} strokeWidth={2} />;
}
