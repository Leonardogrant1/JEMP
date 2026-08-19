import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const TIMELINE: { icon: keyof typeof Ionicons.glyphMap; titleKey: string; bodyKey: string }[] = [
    { icon: 'lock-open', titleKey: 'onboarding.trial_timeline_0_title', bodyKey: 'onboarding.trial_timeline_0_body' },
    { icon: 'notifications', titleKey: 'onboarding.trial_timeline_1_title', bodyKey: 'onboarding.trial_timeline_1_body' },
    { icon: 'star', titleKey: 'onboarding.trial_timeline_2_title', bodyKey: 'onboarding.trial_timeline_2_body' },
];

/**
 * Trial-Timeline vor der Paywall: nimmt die Angst vor dem Abo, indem sie
 * zeigt, was wann passiert — inklusive Erinnerung vor Trial-Ende.
 */
export function TrialOfferStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>
                    {t('onboarding.trial_title')}
                </JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.trial_subtitle')}
                </JempText>
            </Animated.View>

            {/* ── Timeline: Heute → Tag 5 → Tag 7 ── */}
            <View style={styles.timeline}>
                {TIMELINE.map((item, i) => {
                    const isFirst = i === 0;
                    const isLast = i === TIMELINE.length - 1;
                    return (
                        <Animated.View
                            key={item.titleKey}
                            entering={FadeInDown.delay(360 + i * 150).duration(500).springify()}
                            style={styles.tlRow}
                        >
                            <View style={styles.tlLeft}>
                                {isFirst ? (
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.tlCircle}
                                    >
                                        <Ionicons name={item.icon} size={17} color="#fff" />
                                    </LinearGradient>
                                ) : (
                                    <View style={[styles.tlCircle, { backgroundColor: theme.surface }]}>
                                        <Ionicons name={item.icon} size={17} color={GradientMid} />
                                    </View>
                                )}
                                {!isLast && (
                                    <LinearGradient
                                        colors={[GradientMid, `${GradientMid}30`]}
                                        style={styles.tlLine}
                                    />
                                )}
                            </View>
                            <View style={[styles.tlBody, !isLast && styles.tlBodySpacing]}>
                                <JempText type="button" color={theme.text}>{t(item.titleKey as any)}</JempText>
                                <JempText type="body-sm" color={theme.textMuted} style={styles.tlText}>
                                    {t(item.bodyKey as any)}
                                </JempText>
                            </View>
                        </Animated.View>
                    );
                })}
            </View>

            <Animated.View entering={FadeInDown.delay(860).duration(500).springify()} style={[styles.badge, { backgroundColor: theme.surface }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Electric[400]} />
                <JempText type="body-sm" color={theme.textMuted} style={styles.badgeText}>
                    {t('onboarding.trial_badge')}
                </JempText>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingBottom: 24,
    },
    title: { marginBottom: 12 },
    subtitle: { marginBottom: 36 },
    timeline: { marginBottom: 32 },
    tlRow: {
        flexDirection: 'row',
        gap: 16,
    },
    tlLeft: {
        alignItems: 'center',
        width: 38,
    },
    tlCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tlLine: {
        width: 3,
        flex: 1,
        borderRadius: 2,
        marginVertical: 4,
    },
    tlBody: {
        flex: 1,
        gap: 3,
        paddingTop: 2,
    },
    tlBodySpacing: {
        paddingBottom: 28,
    },
    tlText: {
        lineHeight: 20,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    badgeText: { flex: 1 },
});
