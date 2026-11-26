import { CalendarDays, Camera, Check, FileText, House, Mic, Minus, Pill, Plus, Settings, Square, SquarePlus, Volume2 } from 'lucide-react-native';

// 앱 전체에서 쓰는 선(flat) 아이콘. 이모지 대신 이것만 쓴다.
const ICONS = {
  home: House,
  pill: Pill,
  camera: Camera,
  mic: Mic,
  calendar: CalendarDays,
  settings: Settings,
  hospital: SquarePlus,
  note: FileText,
  check: Check,
  speaker: Volume2,
  stop: Square,
  minus: Minus,
  plus: Plus,
};
export type IconName = keyof typeof ICONS;

export default function Icon({ name, size = 28, color = '#1F2A3C', stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} strokeWidth={stroke} />;
}
