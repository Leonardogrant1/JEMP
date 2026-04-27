import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as StoreReview from 'expo-store-review';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export function RatingStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        (async () => {
            if (await StoreReview.isAvailableAsync()) {
                await StoreReview.requestReview();
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.iconWrapper}>
                <LottieView
                    source={require('@/assets/animations/rating.json')}
                    autoPlay
                    loop={false}
                    style={styles.lottie}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>
                    {t('onboarding.rating_title')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.rating_subtitle')}
                </JempText>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        paddingVertical: 32,
        justifyContent: 'center',
        gap: 16,
    },
    title: { textAlign: 'center' },
    subtitle: { textAlign: 'center' },
    iconWrapper: {
        alignItems: 'center',
        marginBottom: 8,
    },
    lottie: {
        width: 220,
        height: 70,
    },
});
