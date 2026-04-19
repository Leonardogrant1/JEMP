import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/providers/auth-provider';
import { CurrentUserProvider, useCurrentUser } from '@/providers/current-user-provider';


export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <CurrentUserProvider>
          <MainStack />
        </CurrentUserProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}


function MainStack() {
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

  if (!fontsLoaded || isLoading) return null;

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
      </Stack.Protected>
    </Stack>
  )
}
