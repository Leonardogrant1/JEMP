import { ComponentType, useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, Fonts } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

interface EmotionSlideConfig {
    label: string;
    headline: string;
    subtext?: string;
}

export function makeEmotionSlide(config: EmotionSlideConfig): ComponentType {
    function EmotionSlide() {
        const { nextStep } = useOnboardingControl();
        const { t } = useTranslation();

        const labelOpacity = useRef(new Animated.Value(0)).current;
        const labelY = useRef(new Animated.Value(12)).current;
        const headlineOpacity = useRef(new Animated.Value(0)).current;
        const headlineY = useRef(new Animated.Value(16)).current;
        const subtextOpacity = useRef(new Animated.Value(0)).current;
        const subtextY = useRef(new Animated.Value(16)).current;
        const hintOpacity = useRef(new Animated.Value(0)).current;
        const hintY = useRef(new Animated.Value(16)).current;

        useEffect(() => {
            Animated.stagger(160, [
                Animated.parallel([
                    Animated.timing(labelOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(labelY, { toValue: 0, duration: 500, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(headlineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                    Animated.timing(headlineY, { toValue: 0, duration: 600, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(subtextOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                    Animated.timing(subtextY, { toValue: 0, duration: 600, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(hintOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(hintY, { toValue: 0, duration: 500, useNativeDriver: true }),
                ]),
            ]).start();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        return (
            <TouchableOpacity style={styles.container} activeOpacity={1} onPress={nextStep}>
                <View style={styles.inner}>
                    <Animated.Text style={[styles.label, { opacity: labelOpacity, transform: [{ translateY: labelY }] }]}>
                        {config.label}
                    </Animated.Text>

                    <Animated.Text style={[styles.headline, { opacity: headlineOpacity, transform: [{ translateY: headlineY }] }]}>
                        {config.headline}
                    </Animated.Text>

                    {config.subtext && (
                        <Animated.Text style={[styles.subtext, { opacity: subtextOpacity, transform: [{ translateY: subtextY }] }]}>
                            {config.subtext}
                        </Animated.Text>
                    )}

                    <Animated.Text style={[styles.hint, { opacity: hintOpacity, transform: [{ translateY: hintY }] }]}>
                        {t('tutorial.tap_to_continue')}
                    </Animated.Text>
                </View>
            </TouchableOpacity>
        );
    }

    EmotionSlide.displayName = `EmotionSlide(${config.label})`;
    return EmotionSlide;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 36,
        gap: 20,
    },
    label: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 11,
        letterSpacing: 2.5,
        color: Colors.accent,
        textAlign: 'center',
    },
    headline: {
        fontFamily: Fonts.serifBold,
        fontSize: 38,
        lineHeight: 50,
        color: Colors.textHeadline,
        textAlign: 'center',
    },
    subtext: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 16,
        lineHeight: 25,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    hint: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 13,
        color: Colors.textMuted,
        opacity: 0.5,
        textAlign: 'center',
        marginTop: 16,
    },
});
