// 색 기준: 흰색 바탕 + 짙은 초록 포인트(시작 화면 초록) + 산호색(주의·진료·지금 먹을 약). 옅은 초록빛 회색으로 칸을 나눈다.
export const C = {
  bg: '#FFFFFF',
  page: '#F3F6F4', // 탭 화면 바탕: 흰 카드가 떠 보인다
  done: '#E6F2EA', // 다 먹은 시간대, 성공 표시 바탕
  mint: '#4FA889', // 알약 게이지에서 먹은 알약의 오른쪽 반
  recBg: '#FBE4E1', // 녹음 중 마이크 바깥 원
  recMid: '#F6C9C3', // 녹음 중 마이크 가운데 원
  frame: '#23463E', // 약 찍기 화면의 찍는 틀 바탕
  laterPill: '#9C8579', // 알약 게이지의 "남음" 알약 테두리 (산호 바탕에서 3:1)
  card: '#FFFFFF',
  text: '#1E2A25',
  sub: '#5F6B65',
  primary: '#1F5E52',
  green: '#1F5E52',
  red: '#B3261E',
  blue: '#2B5CB0',
  orange: '#B8401F',
  gray: '#64706A',
  line: '#DCE6E0',
  soft: '#F1F6F2',
  fill: '#E3ECE6', // 칩·날짜 칸처럼 "테두리 대신 바탕색으로" 구분하는 작은 칸의 바탕
  mist: '#D2E1D7',
  border: '#6F8E7F', // 입력칸·체크칸·보조 버튼의 경계: 흰 바탕과 3:1 이상
  peach: '#FFE9DD',
  warn: '#FFEBE3',
  ai: '#6A4FD6', // AI 관련 버튼·표시 전용 색 (흰 글자와 5.9:1)
  aiSoft: '#EFEAFE',
  aiText: '#4B36A8', // 보라 안내 글자
  aiBorder: '#9B88E6', // 안 고른 보라 칩의 테두리
};

// 모서리: 카드 20, 버튼·작은 조각 14 (한 가지 기준만 쓴다)
export const R = { card: 20, ctl: 12 };

// 여백 기준 (이 값만 쓴다): 화면 가장자리 page 20 / 카드 사이 gap 16 / 큰 카드 안쪽 pad 20 / 목록 카드 안쪽 item 16
// / 카드 안 덩어리 사이 in 12 / 붙어 있는 글 사이 tight 4 / 덩어리(구역) 사이 section 32 (구역 = 제목 + 카드들, 안은 gap 16)
export const S = { page: 16, gap: 16, pad: 20, item: 16, in: 12, tight: 4, section: 28 };

// 카드(바깥 칸): 안쪽 칸(연초록 바탕)보다 분리가 더 강해야 해서 한 단계 진한 테두리와 짙은 그림자
export const CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: R.card,
  borderWidth: 1,
  borderColor: C.line,
  shadowColor: '#1E3A2F',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;
