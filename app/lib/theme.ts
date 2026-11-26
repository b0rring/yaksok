// 색 기준: 연한 푸른 회색 배경 + 흰 카드 + 남색 포인트 + 녹슨 주황(주의·진료) (남색 레퍼런스 시안)
export const C = {
  bg: '#F2F5FA',
  card: '#FFFFFF',
  text: '#1F2A3C',
  sub: '#5B6577',
  primary: '#2D5A7E',
  green: '#2D5A7E',
  red: '#B91C1C',
  blue: '#1D4ED8',
  orange: '#A5482B',
  gray: '#9AA5B5',
  line: '#E1E8F2',
  soft: '#E1E8F2',
  mist: '#BDD1E6',
};

// 모서리: 카드 20, 버튼·작은 조각 14 (한 가지 기준만 쓴다)
export const R = { card: 20, ctl: 14 };

// 여백 기준: 화면 가장자리 20, 카드 사이 16, 카드 안쪽 20
export const S = { page: 20, gap: 16, pad: 20 };

// 카드: 얇은 선 대신 아주 옅은 그림자
export const CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: R.card,
  shadowColor: '#1F2A3C',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
