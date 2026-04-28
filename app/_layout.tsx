import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initI18n, loadAndApplyLanguage } from '@/i18n';
import { AuthProvider } from '@/providers/auth-provider';
import { CurrentUserProvider, useCurrentUser } from '@/providers/current-user-provider';
import { PlanProvider } from '@/providers/plan-provider';
import { RevenueCatProvider } from '@/services/purchases/revenuecat/providers/RevenueCatProvider';
import { PurchaseWrapper } from '@/services/purchases/PurchasesWrapper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';

initI18n();

const queryClient = new QueryClient();


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    loadAndApplyLanguage().then(() => setLanguageReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <KeyboardProvider>
          <AuthProvider>
            <CurrentUserProvider>
              <RevenueCatProvider>
                <PurchaseWrapper>
                  <PlanProvider>
                    <MainStack languageReady={languageReady} />
                  </PlanProvider>
                </PurchaseWrapper>
              </RevenueCatProvider>
            </CurrentUserProvider>
          </AuthProvider>
        </KeyboardProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
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
