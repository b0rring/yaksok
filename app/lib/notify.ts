import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Plan, Slot, SLOTS, allActiveSlots, localActivePlans, planTitle } from './store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 알림 내용: 제목은 "아침 약 드실 시간이에요", 아래 줄에 어떤 병 약인지, 본문에 약 이름과 간단한 먹는 법.
// (iOS 알림은 접힌 상태에서는 앞쪽 몇 줄만 보인다. 길게 눌러 펼치면 전부 보인다.)
function content(label: string, plans: Plan[]) {
  const names = plans.map(planTitle);
  const lines = plans.map((p) => `${planTitle(p)}: ${p.drugs.join(', ')}`);
  const how = plans.length === 1 ? plans[0].info?.find((d) => d.how)?.how : undefined; // 처방이 하나일 때만 먹는 법을 덧붙인다
  return {
    title: `${label} 약 드실 시간이에요`,
    subtitle: names.join(', ') || undefined,
    body: [...lines, how, '눌러서 먹었다고 체크하세요.'].filter(Boolean).join('\n'),
    data: { url: '/' },
  };
}

// 설정에서 "복약 알림"을 껐는지 (저장된 설정을 직접 읽는다)
const alarmOn = async () => {
  try {
    return JSON.parse((await AsyncStorage.getItem('settings')) || '{}').alarm !== false;
  } catch {
    return true;
  }
};

// 시간대 목록으로 알림을 통째로 다시 예약 (중복 알림 방지). "복약 알림"이 꺼져 있으면 예약하지 않는다.
export async function scheduleSlots(slots: Slot[]) {
  const p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await alarmOn())) return true;
  const plans = await localActivePlans();
  for (const s of SLOTS.filter((s) => slots.includes(s.id))) {
    await Notifications.scheduleNotificationAsync({
      content: content(s.label, plans.filter((pl) => pl.slots.includes(s.id))),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: s.hour, minute: s.minute },
    });
  }
  return true;
}

// 설정의 "알림 시험": 지금 등록된 첫 시간대의 실제 알림 모양을 5초 뒤에 보여 준다 (등록된 약이 없으면 안내 문구)
export async function testIn5s() {
  const p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return false;
  const plans = await localActivePlans();
  const slot = SLOTS.find((s) => plans.some((pl) => pl.slots.includes(s.id)));
  await Notifications.scheduleNotificationAsync({
    content: slot ? content(slot.label, plans.filter((pl) => pl.slots.includes(slot.id))) : { title: '약 드실 시간이에요', body: '눌러서 오늘 약을 확인하세요.' },
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
