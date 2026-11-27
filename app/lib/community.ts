import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// 커뮤니티의 공감·저장·글 종류는 아직 서버에 없어서 이 기기에만 저장한다 (시연용, 다른 사람에게는 보이지 않는다).
export const KINDS = ['질문', '정보 나눔', '복약 후기', '병원 이야기'] as const;
export type Kind = (typeof KINDS)[number];
type Meta = { likes: number[]; saved: number[]; kinds: Record<string, Kind> };
const KEY = 'communityMeta';
const EMPTY: Meta = { likes: [], saved: [], kinds: {} };

const load = async (): Promise<Meta> => {
  try {
    return { ...EMPTY, ...JSON.parse((await AsyncStorage.getItem(KEY)) || '{}') };
  } catch {
    return EMPTY;
  }
};
const save = (m: Meta) => AsyncStorage.setItem(KEY, JSON.stringify(m)).catch(() => {});

export async function setPostKind(id: number, kind: Kind) {
  const m = await load();
  await save({ ...m, kinds: { ...m.kinds, [id]: kind } });
}

export function useCommunityMeta() {
  const [m, setM] = useState<Meta>(EMPTY);
  useEffect(() => {
    load().then(setM);
  }, []);
  const toggle = useCallback((field: 'likes' | 'saved', id: number) => {
    setM((cur) => {
      const list = cur[field].includes(id) ? cur[field].filter((x) => x !== id) : [...cur[field], id];
      const next = { ...cur, [field]: list };
      save(next);
      return next;
    });
  }, []);
  return { meta: m, toggle };
}
