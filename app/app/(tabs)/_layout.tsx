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
        animation: 'fade', // 탭을 옮길 때 화면이 살짝 부드럽게 바뀐다
        headerTitleStyle: { fontSize: 20, fontWeight: '800', color: C.text },
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: {
          height: 84,
          paddingTop: 8,
          backgroundColor: C.card,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderWidth: 1.5,
          borderBottomWidth: 0,
          borderColor: C.mist,
          shadowOpacity: 0, // 그림자가 모서리에서 회색으로 보여서 쓰지 않는다
          elevation: 0,
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
            // 지금 보는 탭: 라벨 아래 작은 점(캘린더의 점처럼), 아이콘은 굵게, 글자는 굵은 글씨 (색만 바꾸면 눈에 안 띈다)
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconWrap}>
                <Icon name={t.icon} size={25} color={String(color)} stroke={focused ? 2.6 : 1.9} />
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <View style={styles.labelBox}>
                <Text numberOfLines={1} style={[styles.label, { color: String(color) }, focused && styles.labelOn]}>
                  {t.label}
                </Text>
                <View style={[styles.dot, focused && styles.dotOn]} />
              </View>
            ),
            // 가운데 카메라 버튼: 탭 줄 위로 솟은 둥근 남색 버튼
            ...(t.name === 'scan' && {
              tabBarButton: (p) => (
                <View style={styles.fabSlot}>
                  <Pressable accessibilityRole="button" accessibilityLabel="약 찍기" onPress={p.onPress} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}>
                    <Icon name="camera" size={30} color="#fff" />
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
  iconWrap: { width: 48, height: 32, alignItems: 'center', justifyContent: 'center' },
  labelBox: { alignItems: 'center', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 3, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: C.primary },
  label: { fontSize: 14, fontWeight: '600', flexShrink: 0, minWidth: 64, textAlign: 'center' },
  labelOn: { fontWeight: '900' },
  fabSlot: { flex: 1, alignItems: 'center' },
  fab: {
    marginTop: -26,
    width: 64,
    height: 64,
    borderRadius: 32,
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
