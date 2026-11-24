import * as Notifications from 'expo-notifications';
import { Slot, SLOTS } from './store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const title = '약 드실 시간이에요';
const body = '눌러서 오늘 약을 확인하세요.';

export async function scheduleSlots(slots: Slot[]) {
  const p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const s of SLOTS.filter((s) => slots.includes(s.id))) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body: `${s.label} 약 드실 시간이에요. ${body}` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: s.hour, minute: s.minute },
    });
  }
  return true;
}

export async function testIn5s() {
  const p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
  return true;
}
