import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './AppText';
import BigButton from './BigButton';
import Icon, { IconName } from './Icon';
import { C, S } from '../lib/theme';

// 처음 쓰는 사람에게 보여주는 사용법 3장. 설정의 "사용법 다시 보기"로 언제든 다시 연다.
//   const openGuide = useGuide();
const PAGES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'camera', title: '약과 병원 서류를 찍어요', text: '가운데 카메라 버튼으로 약 봉투나 처방전, 의사 소견서를 찍으면 쉬운 말로 정리해서 알림과 진료 기록에 넣어 드려요.' },
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
          <View style={styles.top}>
            <Text style={styles.brand}>약(藥)속</Text>
            {!last && (
              <Pressable accessibilityRole="button" onPress={close} style={styles.skip}>
                <Text style={styles.skipText}>건너뛰기</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.body}>
            <View style={styles.art}>
              <View style={styles.ring} />
              {(page ?? 0) === 0 ? (
                <>
                  <View style={styles.paper}>
                    <Text style={styles.paperTitle}>약 봉투</Text>
                    <View style={styles.line} />
                    <View style={[styles.line, { width: '75%' }]} />
                    <View style={styles.pills}>
                      <Icon name="pill" size={26} color="#E7B9A5" />
                    </View>
                  </View>
                  <View style={styles.cam}>
                    <Icon name="camera" size={34} color="#fff" />
                  </View>
                </>
              ) : (
                <View style={styles.big}>
                  <Icon name={p.icon} size={64} color={C.primary} />
                </View>
              )}
            </View>
            <View style={{ gap: 12, alignItems: 'center' }}>
              <Text style={styles.count}>{(page ?? 0) + 1} / {PAGES.length}</Text>
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.text}>{p.text}</Text>
            </View>
            <View style={styles.dots}>
              {PAGES.map((_, i) => (
                <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
              ))}
            </View>
          </View>
          <View style={styles.bottom}>
            <BigButton label={last ? '시작하기' : '다음'} onPress={() => (last ? close() : setPage((page ?? 0) + 1))} />
          </View>
        </SafeAreaView>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: S.page, marginTop: 16 },
  brand: { fontSize: 22, fontWeight: '900', color: C.primary },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  skipText: { fontSize: 18, fontWeight: '700', color: C.sub },
  body: { flex: 1, padding: S.page, gap: 28, justifyContent: 'center' },
  art: { height: 340, borderRadius: 32, backgroundColor: C.peach, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#FFDCC8' },
  paper: { width: 140, height: 170, borderRadius: 14, backgroundColor: '#fff', paddingVertical: 18, paddingHorizontal: 16, gap: 10, transform: [{ rotate: '-5deg' }], shadowColor: C.orange, shadowOpacity: 0.2, shadowRadius: 28, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  paperTitle: { fontSize: 16, fontWeight: '900', color: C.primary },
  line: { height: 8, borderRadius: 4, backgroundColor: C.fill },
  pills: { marginTop: 'auto', flexDirection: 'row' },
  cam: { position: 'absolute', right: 64, bottom: 56, width: 72, height: 72, borderRadius: 36, backgroundColor: C.primary, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  big: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 18, fontWeight: '800', color: C.orange },
  title: { fontSize: 32, lineHeight: 42, fontWeight: '900', color: C.text, textAlign: 'center' },
  text: { fontSize: 20, lineHeight: 32, color: C.sub, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#B7C6BE' },
  dotOn: { width: 28, backgroundColor: C.primary },
  bottom: { padding: S.page, paddingBottom: 28 },
});
