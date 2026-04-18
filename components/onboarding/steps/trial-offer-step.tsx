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

export function TrialOfferStep() {
    const { t } = useTranslation();
    const labelAnim = useFadeSlide(100);
    const titleAnim = useFadeSlide(300);
    const subtitleAnim = useFadeSlide(550);

    return (
        <View style={styles.container}>
            <View style={styles.inner}>
                <Animated.Text style={[styles.label, labelAnim]}>{t('onboarding.trial_offer.label')}</Animated.Text>
                <Animated.Text style={[styles.title, titleAnim]}>
                    {t('onboarding.trial_offer.title')}
                </Animated.Text>
                <Animated.Text style={[styles.subtitle, subtitleAnim]}>
                    {t('onboarding.trial_offer.subtitle')}
                </Animated.Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 20,
    },
    label: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 11,
        letterSpacing: 2.5,
        color: Colors.accent,
    },
    title: {
        fontFamily: Fonts.serifBold,
        fontSize: 40,
        lineHeight: 52,
        color: Colors.textHeadline,
    },
    subtitle: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 16,
        lineHeight: 25,
        color: Colors.textMuted,
    },
});
