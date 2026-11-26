import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon, { IconName } from '../../components/Icon';
import { C } from '../../lib/theme';

// 아래쪽 탭: 오늘 / 캘린더 / (가운데 카메라 = 약 찍기) / 병원 / 기록(진료 녹음)
// header: 탭 자체 제목 줄을 보일 화면. 나머지는 화면 안에 제목이 있다.
const TABS: { name: string; label: string; icon: IconName; header?: string }[] = [
  { name: 'index', label: '오늘', icon: 'home' },
  { name: 'calendar', label: '캘린더', icon: 'calendar' },
  { name: 'scan', label: '약 찍기', icon: 'camera', header: '약 찍기' },
  { name: 'hospital', label: '병원', icon: 'hospital' },
  { name: 'record', label: '기록', icon: 'note', header: '진료 녹음' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { fontSize: 24, fontWeight: '800', color: C.text },
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: {
          height: 88,
          paddingTop: 8,
          backgroundColor: C.card,
          borderTopWidth: 0,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          shadowColor: C.text,
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 15, fontWeight: '800' },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            headerTitle: t.header,
            headerShown: !!t.header,
            tabBarIcon: ({ color }) => <Icon name={t.icon} size={26} color={String(color)} />,
            // 가운데 카메라 버튼: 탭 줄 위로 솟은 둥근 남색 버튼
            ...(t.name === 'scan' && {
              tabBarButton: (p) => (
                <View style={styles.fabSlot}>
                  <Pressable accessibilityRole="button" accessibilityLabel="약 찍기" onPress={p.onPress} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}>
                    <Icon name="camera" size={32} color="#fff" />
                  </Pressable>
                </View>
              ),
            }),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabSlot: { flex: 1, alignItems: 'center' },
  fab: {
    marginTop: -28,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: C.bg,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
