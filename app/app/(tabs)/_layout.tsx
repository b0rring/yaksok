import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon, { IconName } from '../../components/Icon';
import { C } from '../../lib/theme';

// 아래쪽 탭: 오늘 / 캘린더 / 내 약 / (가운데 카메라 = 약 찍기) / 병원 / 기록(진료 녹음·기록 목록)
// header: 탭 자체 제목 줄을 보일 화면. 나머지는 화면 안에 제목이 있다.
const TABS: { name: string; label: string; icon: IconName; header?: string }[] = [
  { name: 'index', label: '오늘', icon: 'home' },
  { name: 'calendar', label: '캘린더', icon: 'calendar' },
  { name: 'drugs', label: '내 약', icon: 'pill' },
  { name: 'scan', label: '약 찍기', icon: 'camera', header: '약 찍기' },
  { name: 'hospital', label: '병원', icon: 'hospital' },
  { name: 'record', label: '기록', icon: 'note', header: '기록' },
  { name: 'community', label: '커뮤니티', icon: 'users' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { fontSize: 20, fontWeight: '800', color: C.text },
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: {
          height: 82,
          paddingTop: 7,
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
            // 지금 보는 탭: 탭 줄 맨 위에 남색 짧은 막대, 아이콘은 굵게, 글자는 굵은 남색 (색만 바꾸면 눈에 안 띈다)
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconWrap}>
                {focused && <View style={styles.bar} />}
                <Icon name={t.icon} size={25} color={String(color)} stroke={focused ? 2.6 : 1.9} />
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <Text numberOfLines={1} style={[styles.label, { color: String(color) }, focused && styles.labelOn]}>
                {t.label}
              </Text>
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
  iconWrap: { width: 46, height: 30, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', top: -11, width: 30, height: 4, borderRadius: 2, backgroundColor: C.primary },
  label: { fontSize: 13, fontWeight: '600', flexShrink: 0, minWidth: 64, textAlign: 'center' },
  labelOn: { fontWeight: '900' },
  fabSlot: { flex: 1, alignItems: 'center' },
  fab: {
    marginTop: -26,
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
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
