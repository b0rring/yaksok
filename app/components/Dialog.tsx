import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { C, CARD, R } from '../lib/theme';

// 앱 전용 확인 창. 기본 알림 창(Alert) 대신 이것만 쓴다.
//   const ask = useDialog();
//   ask({ title: '...', message: '...', actions: [{ label: '추가', onPress }, { label: '안 할래요', kind: 'secondary' }] });
// actions를 생략하면 "확인" 버튼 하나. 첫 번째 버튼이 으뜸(채운) 버튼이다.
export type DialogAction = { label: string; kind?: 'primary' | 'secondary' | 'danger'; onPress?: () => void };
export type DialogSpec = { title: string; message?: string; actions?: DialogAction[] };

const Ctx = createContext<(spec: DialogSpec) => void>(() => {});
export const useDialog = () => useContext(Ctx);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<DialogSpec | null>(null);
  const show = useCallback((s: DialogSpec) => setSpec(s), []);
  const actions = spec?.actions?.length ? spec.actions : [{ label: '확인' }];

  const press = (a: DialogAction) => {
    setSpec(null);
    a.onPress?.();
  };

  return (
    <Ctx.Provider value={show}>
      {children}
      <Modal visible={!!spec} transparent animationType="fade" onRequestClose={() => setSpec(null)} statusBarTranslucent>
        <View style={styles.backdrop}>
          <View style={styles.box}>
            <Text style={styles.title}>{spec?.title}</Text>
            {!!spec?.message && <Text style={styles.message}>{spec.message}</Text>}
            <View style={styles.actions}>
              {actions.map((a, i) => {
                const kind = a.kind ?? (i === 0 ? 'primary' : 'secondary');
                return (
                  <Pressable
                    key={a.label}
                    accessibilityRole="button"
                    onPress={() => press(a)}
                    style={({ pressed }) => [
                      styles.btn,
                      kind === 'primary' && { backgroundColor: C.primary },
                      kind === 'danger' && { backgroundColor: C.red },
                      kind === 'secondary' && styles.secondary,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.btnText, kind === 'secondary' && { color: C.primary }]}>{a.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,31,31,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box: { ...CARD, width: '100%', maxWidth: 380, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: C.text, lineHeight: 28 },
  message: { fontSize: 18, lineHeight: 28, color: C.sub },
  actions: { gap: 12, marginTop: 12 },
  btn: { minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondary: { backgroundColor: C.fill },
  btnText: { fontSize: 20, fontWeight: '800', color: '#fff' },
});
