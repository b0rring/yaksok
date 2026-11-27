import { Hospital as HospitalIcon, Package, User, ClipboardPlus, Image as ImageIcon, Bookmark, Heart, Megaphone, PenLine, Stethoscope, BadgeCheck, Ban, Info, LocateFixed, Navigation, Phone, ChevronLeft, ChevronRight, CheckCheck, Search, Sparkles, X, CalendarDays, Camera, Check, ChevronDown, ChevronUp, Clock, FileText, House, MessageCircle, MapPin, Mic, Minus, SendHorizontal, Pencil, Pill, Plus, Settings, Square, Sun, Sunrise, Sunset, TriangleAlert, Users, Volume2 } from 'lucide-react-native';

// 앱 전체에서 쓰는 선(flat) 아이콘. 이모지 대신 이것만 쓴다.
const ICONS = {
  home: House,
  pill: Pill,
  camera: Camera,
  mic: Mic,
  calendar: CalendarDays,
  settings: Settings,
  send: SendHorizontal,
  hospital: HospitalIcon, // 병원 탭·병원 찾기: 병원 건물 모양 (시안)
  note: FileText,
  check: Check,
  speaker: Volume2,
  chat: MessageCircle,
  stop: Square,
  minus: Minus,
  plus: Plus,
  edit: Pencil,
  users: Users,
  clock: Clock,
  alert: TriangleAlert,
  ban: Ban,
  checks: CheckCheck,
  search: Search,
  sparkles: Sparkles,
  close: X,
  info: Info,
  box: Package,
  person: User,
  record: ClipboardPlus,
  image: ImageIcon,
  heart: Heart,
  bookmark: Bookmark,
  pen: PenLine,
  megaphone: Megaphone,
  doctor: Stethoscope,
  verified: BadgeCheck,
  phone: Phone,
  map: Navigation,
  locate: LocateFixed,
  left: ChevronLeft,
  right: ChevronRight,
  down: ChevronDown,
  up: ChevronUp,
  sunrise: Sunrise,
  sun: Sun,
  sunset: Sunset,
};
export type IconName = keyof typeof ICONS;

export default function Icon({ name, size = 24, color = '#1E2A25', stroke = 2, fill }: { name: IconName; size?: number; color?: string; stroke?: number; fill?: string }) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} strokeWidth={stroke} fill={fill ?? 'none'} />;
}
