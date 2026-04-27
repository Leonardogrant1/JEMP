import { JempText } from '@/components/jemp-text';
import { Colors, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export function TrialOfferStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="caption" gradient style={styles.eyebrow}>
                    {t('onboarding.trial_eyebrow')}
                </JempText>
                <JempText type="h1" style={styles.title}>
                    {t('onboarding.trial_title')}
                </JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.trial_subtitle')}
                </JempText>
            </Animated.View>

            <View style={styles.list}>
                {([0, 1, 2, 3] as const).map((i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()} style={styles.row}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={GradientMid} />
                        <JempText type="body-l" color={theme.text}>{t(`onboarding.trial_include_${i}` as any)}</JempText>
                    </Animated.View>
                ))}
            </View>

            <Animated.View entering={FadeInDown.delay(720).duration(500).springify()} style={[styles.badge, { backgroundColor: theme.surface }]}>
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
        paddingTop: 32,
    },
    eyebrow: {
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    title: { marginBottom: 12 },
    subtitle: { marginBottom: 32 },
    list: { gap: 14, marginBottom: 28 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
