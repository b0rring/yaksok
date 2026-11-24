import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import '../lib/notify';

export default function Layout() {
  const router = useRouter();
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (last) router.push('/today');
  }, [last?.notification.request.identifier]);

  return <Stack screenOptions={{ headerTitleStyle: { fontSize: 24 } }} />;
}
