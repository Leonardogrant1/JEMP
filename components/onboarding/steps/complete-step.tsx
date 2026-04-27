import { JempText } from '@/components/jemp-text';
import { Colors, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

const FEATURE_ICONS = [
    'barbell-outline' as const,
    'trending-up-outline' as const,
    'flash-outline' as const,
    'calendar-outline' as const,
];

export function CompleteStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="caption" gradient style={styles.eyebrow}>
                    {t('onboarding.complete_eyebrow')}
                </JempText>
                <JempText type="h1" style={styles.title}>
                    {t('onboarding.complete_title')}
                </JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.complete_subtitle')}
                </JempText>
            </Animated.View>

            <View style={styles.features}>
                {FEATURE_ICONS.map((icon, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(Math.min(360 + i * 120, 720)).duration(500).springify()} style={[styles.featureRow, { backgroundColor: theme.surface }]}>
                        <Ionicons name={icon} size={20} color={Electric[400]} />
                        <JempText type="body-l" color={theme.text} style={styles.featureText}>
                            {t(`onboarding.complete_feature_${i}` as any)}
                        </JempText>
                    </Animated.View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 32,
        justifyContent: 'center',
    },
    eyebrow: {
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    title: { marginBottom: 12 },
    subtitle: { marginBottom: 36 },
    features: { gap: 10 },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    featureText: { flex: 1 },
});
