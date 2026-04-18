import { Colors, Fonts } from '@/constants/theme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, Text, View } from 'react-native';

function PrivacyRow({ text, delay }: { text: string; delay: number }) {
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
        <Animated.View style={[styles.row, { opacity, transform: [{ translateX }] }]}>
            <Text style={styles.checkmark}>✦</Text>
            <Text style={styles.rowText}>{text}</Text>
        </Animated.View>
    );
}

export function TrackingStep() {
    const { t } = useTranslation();

    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleY = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        trackerManager.track('onboarding_tracking_step_viewed');

        Animated.parallel([
            Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(titleY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 5 }),
        ]).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const ROWS = [
        t('onboarding.tracking.badge_no_data'),
        t('onboarding.tracking.badge_no_selling'),
        t('onboarding.tracking.badge_insights'),
    ];

    return (
        <View style={styles.container}>
            <View style={styles.inner}>
                <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}>
                    <Text style={styles.label}>{t('onboarding.tracking.label')}</Text>
                    <Text style={styles.title}>{t('onboarding.tracking.headline')}</Text>
                    <Text style={styles.subtitle}>{t('onboarding.tracking.subtitle')}</Text>
                </Animated.View>

                <View style={styles.rows}>
                    {ROWS.map((text, i) => (
                        <PrivacyRow key={text} text={text} delay={300 + i * 150} />
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
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 36,
    },
    label: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 11,
        letterSpacing: 2.5,
        color: Colors.accent,
        marginBottom: 12,
    },
    title: {
        fontFamily: Fonts.serifBold,
        fontSize: 36,
        lineHeight: 46,
        color: Colors.textHeadline,
        marginBottom: 14,
    },
    subtitle: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 15,
        lineHeight: 24,
        color: Colors.textMuted,
    },
    rows: {
        gap: 22,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
    },
    checkmark: {
        fontSize: 14,
        color: Colors.accent,
    },
    rowText: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 16,
        color: Colors.text,
        flex: 1,
    },
});
