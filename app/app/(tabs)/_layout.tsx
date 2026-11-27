import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon, { IconName } from '../../components/Icon';
import { C } from '../../lib/theme';

// 아래쪽 탭: 홈 / 캘린더 / 내 약 / (가운데 카메라 = 약 찍기) / 병원 / 기록(진료 녹음·기록 목록)
// 모든 탭의 제목은 화면 안의 TabTitle(왼쪽 정렬, 탭 이름) 하나로 통일한다. 시스템 제목줄은 쓰지 않는다.
const TABS: { name: string; label: string; icon: IconName; header?: string }[] = [
  { name: 'index', label: '홈', icon: 'home' },
  { name: 'calendar', label: '캘린더', icon: 'calendar' },
  { name: 'drugs', label: '내 약', icon: 'pill' },
  { name: 'scan', label: '약 찍기', icon: 'camera' },
  { name: 'hospital', label: '병원', icon: 'hospital' },
  { name: 'record', label: '기록', icon: 'note' },
  { name: 'community', label: '커뮤니티', icon: 'users' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: C.page },
        animation: 'fade', // 탭을 옮길 때 화면이 살짝 부드럽게 바뀐다
        headerTitleStyle: { fontSize: 20, fontWeight: '800', color: C.text },
        headerStyle: { backgroundColor: C.page },
        headerShadowVisible: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: {
          height: 92,
          paddingTop: 10,
          paddingHorizontal: 2,
          backgroundColor: C.card,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderColor: C.line,
          shadowOpacity: 0,
          elevation: 0,
          zIndex: 2, // 지도·내용에 가려지지 않게
        },
        tabBarItemStyle: { paddingHorizontal: 0 },
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
            // 지금 보는 탭: 아이콘 뒤에 48×32 둥근 연초록 바탕 + 굵은 아이콘·글자
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconWrap, focused && styles.iconOn]}>
                <Icon name={t.icon} size={24} color={String(color)} stroke={focused ? 2.6 : 2} />
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <Text style={[styles.label, { color: String(color) }, focused && styles.labelOn]}>
                {t.label}
              </Text>
            ),
            // 가운데 카메라 버튼: 탭 줄 위로 솟은 둥근 남색 버튼
            ...(t.name === 'scan' && {
              tabBarButton: (p) => (
                <View style={styles.fabSlot}>
                  <Pressable accessibilityRole="button" accessibilityLabel="약 찍기" onPress={p.onPress} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}>
                    <Icon name="camera" size={28} color="#fff" />
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
  iconWrap: { width: 48, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: C.fill },
  label: { width: 64, marginHorizontal: -4, fontSize: 14, fontWeight: '600', letterSpacing: -0.3, textAlign: 'center' }, // 칸(390÷7=55)보다 글이 넓어도 잘리지 않게
  labelOn: { fontWeight: '900' },
  fabSlot: { flex: 1, alignItems: 'center', zIndex: 1 },
  fab: {
    marginTop: -28,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: C.bg,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 1,
  },
});
