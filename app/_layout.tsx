import { useColorScheme } from '@/hooks/use-color-scheme';
import { initI18n, loadAndApplyLanguage } from '@/i18n';
import { trackerManager } from '@/lib/tracking/tracker-manager';
// import { AppsFlyerTracker } from '@/lib/tracking/trackers/appsflyer-tracker';
import { PostHogTracker } from '@/lib/tracking/trackers/posthog-tracker';
import { AuthProvider } from '@/providers/auth-provider';
import { CurrentUserProvider, useCurrentUser } from '@/providers/current-user-provider';
import { NotificationProvider } from '@/providers/notification-provider';
import { PlanProvider } from '@/providers/plan-provider';
import { initPosthog } from '@/services/posthog/init';
import { PurchaseWrapper } from '@/services/purchases/PurchasesWrapper';
import { RevenueCatProvider } from '@/services/purchases/revenuecat/providers/RevenueCatProvider';
import { devLog } from '@/utils/dev-log';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider, PostHogSurveyProvider } from 'posthog-react-native';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

initI18n();

trackerManager.register(new PostHogTracker());
// trackerManager.register(new AppsFlyerTracker());
trackerManager.init();

const queryClient = new QueryClient();


Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    devLog('🔔 handleNotification triggered:', JSON.stringify(notification))
    return {
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }
  },
  handleSuccess: (id) => devLog('✅ handleSuccess:', id),
  handleError: (id, error) => devLog('❌ handleError:', id, error),
})


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [languageReady, setLanguageReady] = useState(false);



  useEffect(() => {
    const notificationSub = Notifications.addNotificationResponseReceivedListener(() => {
      trackerManager.track('notification_opened');
    });
    loadAndApplyLanguage().then(() => setLanguageReady(true));

    return () => {
      notificationSub.remove();

    }
  }, []);

  const posthog = initPosthog();

  return (
    <PostHogProvider client={posthog}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PostHogSurveyProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <KeyboardProvider>
                <AuthProvider>
                  <CurrentUserProvider>
                    <NotificationProvider>
                      <RevenueCatProvider>
                        <PurchaseWrapper>
                          <PlanProvider>
                            <MainStack languageReady={languageReady} />
                          </PlanProvider>
                        </PurchaseWrapper>
                      </RevenueCatProvider>
                    </NotificationProvider>
                  </CurrentUserProvider>
                </AuthProvider>
              </KeyboardProvider>
              <StatusBar style="auto" />
            </ThemeProvider>
          </QueryClientProvider>
        </PostHogSurveyProvider>
      </GestureHandlerRootView>
    </PostHogProvider>
  );
}


function MainStack({ languageReady }: { languageReady: boolean }) {
  const { profile, isLoading } = useCurrentUser();
  const [fontsLoaded] = useFonts({
    SatoshiBlack: require('@/assets/fonts/Satoshi-Black.otf'),
    SatoshiBlackItalic: require('@/assets/fonts/Satoshi-BlackItalic.otf'),
    SatoshiBold: require('@/assets/fonts/Satoshi-Bold.otf'),
    SatoshiBoldItalic: require('@/assets/fonts/Satoshi-BoldItalic.otf'),
    SatoshiItalic: require('@/assets/fonts/Satoshi-Italic.otf'),
    SatoshiLight: require('@/assets/fonts/Satoshi-Light.otf'),
    SatoshiLightItalic: require('@/assets/fonts/Satoshi-LightItalic.otf'),
    SatoshiMedium: require('@/assets/fonts/Satoshi-Medium.otf'),
    SatoshiMediumItalic: require('@/assets/fonts/Satoshi-MediumItalic.otf'),
    SatoshiRegular: require('@/assets/fonts/Satoshi-Regular.otf'),
  });

  useEffect(() => {
    if (fontsLoaded && !isLoading && languageReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading, languageReady]);

  if (!fontsLoaded || isLoading || !languageReady) return null;

  return (
    <Stack>
      <Stack.Protected guard={!profile}>
        <Stack.Screen name="start" options={{ animation: 'fade', headerShown: false }} />
        <Stack.Screen name="magic-link" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!!profile && !profile.has_onboarded}>
        <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right', headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!profile?.has_onboarded}>
        <Stack.Screen name="tutorial" options={{ animation: 'fade', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'slide_from_right', headerShown: false }} />
        <Stack.Screen name="session/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="exercise/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="active-session/[id]" options={{ animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="session-summary/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="assessment/[id]" options={{ animation: 'slide_from_right', headerShown: false }} />
      </Stack.Protected>
    </Stack>
  )
}
