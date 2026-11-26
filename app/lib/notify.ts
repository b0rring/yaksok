import * as Notifications from 'expo-notifications';
import { Slot, SLOTS, allActiveSlots } from './store';

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

// 시간대 목록으로 알림을 통째로 다시 예약 (중복 알림 방지)
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

// 앱을 열 때마다 호출: 진행 중인 복약 기준으로 알림을 맞춘다. 기간이 끝난 약의 알림은 사라진다.
// 알림 권한을 새로 묻지는 않는다 (이미 허용된 경우에만 다시 예약).
export async function syncNotifications() {
  const slots = await allActiveSlots();
  if (!slots.length) return Notifications.cancelAllScheduledNotificationsAsync();
  if ((await Notifications.getPermissionsAsync()).granted) await scheduleSlots(slots);
}
