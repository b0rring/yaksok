import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './AppText';
import BigButton from './BigButton';
import Icon, { IconName } from './Icon';
import { C, CARD, S } from '../lib/theme';

// 처음 쓰는 사람에게 보여주는 사용법 3장. 설정의 "사용법 다시 보기"로 언제든 다시 연다.
//   const openGuide = useGuide();
const PAGES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'camera', title: '약 봉투를 찍어요', text: '가운데 카메라 버튼을 누르고 약 봉투를 찍으면, 쉬운 말로 알려 드리고 알림도 맞춰 드려요.' },
  { icon: 'check', title: '먹으면 눌러요', text: '약 드실 시간에 알림이 와요. 드시고 나서 "지금 먹었어요"를 눌러 주세요.' },
  { icon: 'mic', title: '진료는 녹음해요', text: '병원에서 "기록" 탭을 눌러 녹음하면, 의사 선생님 말씀을 글로 정리해 캘린더에 남겨요.' },
];
const SEEN = 'guideSeen';

const Ctx = createContext<() => void>(() => {});
export const useGuide = () => useContext(Ctx);

export function GuideProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<number | null>(null);
  const open = useCallback(() => setPage(0), []);

  // 처음 켰을 때 한 번 (시작 화면이 사라진 뒤에)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    AsyncStorage.getItem(SEEN)
      .then((v) => {
        if (!v) t = setTimeout(open, 2000);
      })
      .catch(() => {});
    return () => clearTimeout(t);
  }, [open]);

  const close = () => {
    setPage(null);
    AsyncStorage.setItem(SEEN, '1').catch(() => {});
  };

  const last = page === PAGES.length - 1;
  const p = PAGES[page ?? 0];

  return (
    <Ctx.Provider value={open}>
      {children}
      <Modal visible={page !== null} animationType="fade" onRequestClose={close}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.body}>
            <View style={styles.circle}>
              <Icon name={p.icon} size={54} color={C.primary} />
            </View>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.text}>{p.text}</Text>
            <View style={styles.dots}>
              {PAGES.map((_, i) => (
                <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
              ))}
            </View>
          </View>
          <View style={styles.bottom}>
            <BigButton label={last ? '시작하기' : '다음'} onPress={() => (last ? close() : setPage((page ?? 0) + 1))} />
            {!last && (
              <Pressable accessibilityRole="button" onPress={close} style={styles.skip}>
                <Text style={styles.skipText}>건너뛰기</Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.page + 4, gap: S.gap },
  circle: { ...CARD, width: 136, height: 136, borderRadius: 58, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  title: { fontSize: 27, fontWeight: '800', color: C.text, textAlign: 'center' },
  text: { fontSize: 20, lineHeight: 31, color: C.sub, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 5, backgroundColor: C.mist },
  dotOn: { width: 24, backgroundColor: C.primary },
  bottom: { padding: S.page, gap: 7 },
  skip: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 19, fontWeight: '800', color: C.sub },
});
