import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import '../lib/notify';
import { C } from '../lib/theme';

const titles: Record<string, string> = {
  index: '약속',
  scan: '약 찍기',
  result: '약 알아보기',
  plan: '복약 시간',
  today: '오늘 약',
  record: '진료 녹음',
  show: '의사에게 보여주기',
  calendar: '캘린더',
  more: '더보기',
};

export default function Layout() {
  const router = useRouter();
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (last) router.push('/today');
  }, [last?.notification.request.identifier]);

  return (
    <Stack
      screenOptions={({ route }) => ({
        title: titles[route.name] ?? '',
        headerBackTitle: '뒤로',
        headerTitleStyle: { fontSize: 24, fontWeight: '800' },
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        headerShown: route.name !== 'index',
      })}
    />
  );
}
