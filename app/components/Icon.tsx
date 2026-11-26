import { CalendarDays, Camera, Check, ChevronDown, ChevronUp, FileText, House, MessageCircle, Mic, Minus, Pencil, Pill, Plus, Settings, Square, SquarePlus, Sun, Sunrise, Sunset, Users, Volume2 } from 'lucide-react-native';

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
  chat: MessageCircle,
  stop: Square,
  minus: Minus,
  plus: Plus,
  edit: Pencil,
  users: Users,
  down: ChevronDown,
  up: ChevronUp,
  sunrise: Sunrise,
  sun: Sun,
  sunset: Sunset,
};
export type IconName = keyof typeof ICONS;

export default function Icon({ name, size = 24, color = '#1F2A3C', stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} strokeWidth={stroke} />;
}
