import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

function TimelineRow({ day, text, delay }: { day: string; text: string; delay: number }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(-16)).current;

    useEffect(() => {
        const t = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 5 }),
            ]).start();
        }, delay);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Animated.View style={[styles.row, { opacity, transform: [{ translateX }] }]}>
            <View style={styles.dot} />
            <View style={styles.rowText}>
                <Text style={styles.rowDay}>{day}</Text>
                <Text style={styles.rowLabel}>{text}</Text>
            </View>
        </Animated.View>
    );
}

export function TrialReminderStep() {
    const { t } = useTranslation();

    const STEPS = [
        { day: t('onboarding.trial_reminder.day_today'), text: t('onboarding.trial_reminder.day_today_desc') },
        { day: t('onboarding.trial_reminder.day_2'), text: t('onboarding.trial_reminder.day_2_desc') },
        { day: t('onboarding.trial_reminder.day_3'), text: t('onboarding.trial_reminder.day_3_desc') },
    ];

    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleY = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(titleY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 5 }),
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.inner}>
                <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}>
                    <Text style={styles.label}>{t('onboarding.trial_reminder.label')}</Text>
                    <Text style={styles.title}>{t('onboarding.trial_reminder.title')}</Text>
                </Animated.View>

                <View style={styles.timeline}>
                    {STEPS.map((s, i) => (
                        <TimelineRow key={s.day} day={s.day} text={s.text} delay={300 + i * 200} />
                    ))}
                </View>

                <Animated.Text
                    style={[styles.note, { opacity: titleOpacity }]}
                >
                    {t('onboarding.trial_reminder.cancel_note')}
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
    },
    timeline: {
        gap: 24,
        paddingLeft: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 18,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.accent,
        marginTop: 5,
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    rowDay: {
        fontFamily: Fonts.sansSemiBold,
        fontSize: 13,
        color: Colors.accent,
    },
    rowLabel: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 15,
        lineHeight: 22,
        color: Colors.textMuted,
    },
    note: {
        fontFamily: Fonts.satoshiRegular,
        fontSize: 12,
        color: Colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
    },
});
