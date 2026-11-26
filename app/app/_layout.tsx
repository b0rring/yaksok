import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { DialogProvider } from '../components/Dialog';
import { GuideProvider } from '../components/Guide';
import HeaderLeft from '../components/HeaderLeft';
import Intro from '../components/Intro';
import JobBanner from '../components/JobBanner';
import { JobsProvider } from '../lib/jobs';
import { syncNotifications } from '../lib/notify';
import { SettingsProvider } from '../lib/settings';
import { C } from '../lib/theme';

// 탭 화면은 (tabs) 안에, 나머지(결과·시간 고르기·보여주기·설정)는 여기서 뒤로 가기가 있는 화면으로 연다.
const TITLES: Record<string, string> = {
  chat: '약 물어보기',
  result: '약 알아보기',
  plan: '복약 시간',
  show: '의사에게 보여주기',
  edit: '약 고치기',
  more: '설정',
};

// 설정(약 먹는 시간)을 다 불러온 뒤에 한 번: 알림 맞추기, 알림을 눌러 앱이 열렸으면 오늘 약으로 이동.
function Boot() {
  const router = useRouter();
  // 웹에는 알림 기능이 없어서 이 훅이 오류를 낸다 (플랫폼은 실행 중 바뀌지 않으므로 훅 순서는 안전)
  const last = Platform.OS === 'web' ? null : Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (Platform.OS !== 'web') syncNotifications().catch(() => {});
  }, []);
  useEffect(() => {
    if (last) router.navigate('/');
  }, [last?.notification.request.identifier]);
  return null;
}

export default function Layout() {
  return (
    <SettingsProvider>
      <DialogProvider>
        <GuideProvider>
          <JobsProvider>
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerLeft: ({ canGoBack }) => <HeaderLeft canGoBack={canGoBack} />,
                headerTitleStyle: { fontSize: 20, fontWeight: '800', color: C.primary },
                headerStyle: { backgroundColor: C.bg },
                headerShadowVisible: false,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              {Object.entries(TITLES).map(([name, title]) => (
                <Stack.Screen key={name} name={name} options={{ title }} />
              ))}
            </Stack>
            <JobBanner />
            <Intro />
            <Boot />
          </View>
          </JobsProvider>
        </GuideProvider>
      </DialogProvider>
    </SettingsProvider>
  );
}
