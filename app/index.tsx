import { useFonts } from 'expo-font';
import { Redirect } from 'expo-router';

export default function App() {

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
    })

    if (!fontsLoaded) {
        return null
    }

    // // TODO: re-enable onboarding flow
    // const hasCompletedOnboarding = useUserDataStore((s) => s.hasOnboarded);
    // const hasSeenTutorial = useUserDataStore((s) => s.hasSeenTutorial);
    // if (!hasCompletedOnboarding) return <Redirect href="/start" />;
    // if (!hasSeenTutorial) return <Redirect href="/tutorial" />;
    // return <Redirect href="/(tabs)" />;
    return <Redirect href="/start" />;

}

