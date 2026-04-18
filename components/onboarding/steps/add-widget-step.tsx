import LottieView from 'lottie-react-native';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

function useFadeSlide(delay: number) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        const t = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 5 }),
            ]).start();
        }, delay);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { opacity, transform: [{ translateY }] } as const;
}

export function AddWidgetStep() {
    const { t } = useTranslation();
    const titleAnim = useFadeSlide(200);
    const subtitleAnim = useFadeSlide(450);
    const lottieAnim = useFadeSlide(700);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Animated.Text style={[styles.title, titleAnim]}>
                    {t('onboarding.widget.title')}
                </Animated.Text>

                <Animated.Text style={[styles.subtitle, subtitleAnim]}>
                    {t('onboarding.widget.subtitle')}
                </Animated.Text>

                <Animated.View style={[styles.lottieWrapper, lottieAnim]}>
                    <LottieView
                        source={require('@/assets/animations/widget.json')}
                        autoPlay
                        loop={false}
                        style={styles.lottie}
                    />
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        gap: 20,
    },
    title: {
        fontFamily: Fonts.serifBold,
        fontSize: 32,
        lineHeight: 42,
        color: Colors.textHeadline,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 15,
        lineHeight: 23,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    lottieWrapper: {
        width: '100%',
        aspectRatio: 0.75,
        marginTop: 8,
    },
    lottie: {
        flex: 1,
    },
});
