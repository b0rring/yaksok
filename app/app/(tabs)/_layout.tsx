import { Tabs } from 'expo-router';
import Icon, { IconName } from '../../components/Icon';
import { C } from '../../lib/theme';

// 화면 이동 바: 아래쪽 탭 (홈 / 오늘 약 / 약 찍기 / 진료 녹음 / 캘린더)
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: '홈', icon: 'home' },
  { name: 'today', title: '오늘 약', icon: 'pill' },
  { name: 'scan', title: '약 찍기', icon: 'camera' },
  { name: 'record', title: '진료 녹음', icon: 'mic' },
  { name: 'calendar', title: '캘린더', icon: 'calendar' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { fontSize: 24, fontWeight: '800', color: C.primary },
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: { height: 84, paddingTop: 6, backgroundColor: C.card, borderTopColor: C.line },
        tabBarLabelStyle: { fontSize: 14, fontWeight: '800' },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, headerShown: t.name !== 'index', tabBarIcon: ({ color }) => <Icon name={t.icon} size={26} color={String(color)} /> }}
        />
      ))}
    </Tabs>
  );
}
