import Logo from '@/assets/logo.svg';
import { Colors, Fonts } from '@/constants/theme';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, Text, View } from 'react-native';

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

function BenefitRow({ text, delay }: { text: string; delay: number }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(-16)).current;

    useEffect(() => {
        const t = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }),
            ]).start();
        }, delay);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View style={[styles.benefitRow, { opacity, transform: [{ translateX }] }]}>
            <Text style={styles.checkmark}>✦</Text>
            <Text style={styles.benefitText}>{text}</Text>
        </Animated.View>
    );
}

export function WhatYouWillGetStep() {
    const { t } = useTranslation();

    const BENEFITS = [
        t('onboarding.what_you_get.benefit_1'),
        t('onboarding.what_you_get.benefit_2'),
        t('onboarding.what_you_get.benefit_3'),
        t('onboarding.what_you_get.benefit_4'),
        t('onboarding.what_you_get.benefit_5'),
    ];

    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.7)).current;
    const titleAnim = useFadeSlide(200);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.inner}>
                <View style={styles.header}>
                    <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
                        <Logo width={72} height={72} />
                    </Animated.View>
                    <Animated.Text style={[styles.title, titleAnim]}>{t('onboarding.what_you_get.title')}</Animated.Text>
                </View>

                <View style={styles.benefits}>
                    {BENEFITS.map((b, i) => (
                        <BenefitRow key={b} text={b} delay={300 + i * 130} />
                    ))}
                </View>
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
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 44,
    },
    header: {
        alignItems: 'center',
        gap: 18,
    },
    title: {
        fontFamily: Fonts.serifBold,
        fontSize: 30,
        color: Colors.textHeadline,
        textAlign: 'center',
    },
    benefits: {
        width: '100%',
        gap: 22,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
    },
    checkmark: {
        fontSize: 14,
        color: Colors.accent,
    },
    benefitText: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 16,
        color: Colors.text,
        flex: 1,
    },
});
