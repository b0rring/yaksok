import Svg, { Circle, G, Line, Path } from 'react-native-svg';

// 시간대 그림: 채운 모양이라 작아도 또렷하다. 아침 = 지평선 위로 뜨는 해, 점심 = 쨍쨍한 해, 저녁 = 달과 별.
export const SLOT_COLOR = { morning: '#F28B2E', noon: '#F5B400', evening: '#5B6CCF' } as const;

const rays = (cx: number, cy: number, r1: number, r2: number, angles: number[], color: string) =>
  angles.map((a) => {
    const t = (a * Math.PI) / 180;
    return <Line key={a} x1={cx + r1 * Math.cos(t)} y1={cy - r1 * Math.sin(t)} x2={cx + r2 * Math.cos(t)} y2={cy - r2 * Math.sin(t)} stroke={color} strokeWidth={3.5} strokeLinecap="round" />;
  });

export default function SlotIcon({ slot, size = 28 }: { slot: 'morning' | 'noon' | 'evening'; size?: number }) {
  const c = SLOT_COLOR[slot];
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {slot === 'morning' && (
        <G>
          <Path d="M12 32a12 12 0 0 1 24 0Z" fill={c} />
          {rays(24, 32, 16, 21, [90, 45, 135, 15, 165], c)}
          <Line x1={5} y1={37} x2={43} y2={37} stroke={c} strokeWidth={3.5} strokeLinecap="round" />
        </G>
      )}
      {slot === 'noon' && (
        <G>
          <Circle cx={24} cy={24} r={9} fill={c} />
          {rays(24, 24, 14, 20, [0, 45, 90, 135, 180, 225, 270, 315], c)}
        </G>
      )}
      {slot === 'evening' && (
        <G>
          <Path d="M30 8a16 16 0 1 0 10 27A13 13 0 0 1 30 8Z" fill={c} />
          <Path d="M36 10l1.6 3.8 3.8 1.6-3.8 1.6L36 20.8l-1.6-3.8-3.8-1.6 3.8-1.6Z" fill={c} />
        </G>
      )}
    </Svg>
  );
}
