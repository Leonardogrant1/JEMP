import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

const ROW_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
    'shield-checkmark-outline',
    'lock-closed-outline',
    'trending-up-outline',
];

export function TrackingStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        trackerManager.track('onboarding_tracking_step_viewed');
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.tracking_title')}</JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.tracking_subtitle')}
                </JempText>
            </Animated.View>

            <View style={styles.list}>
                {ROW_ICONS.map((icon, i) => (
                    <Animated.View
                        key={i}
                        entering={FadeInDown.delay(360 + i * 120).duration(500).springify()}
                    >
                        <View style={[styles.row, { backgroundColor: theme.surface }]}>
                            <Ionicons name={icon} size={22} color={GradientMid} />
                            <JempText type="body-l" color={theme.text} style={styles.rowText}>
                                {t(`onboarding.tracking_row_${i}` as any)}
                            </JempText>
                        </View>
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
        paddingVertical: 32,
        justifyContent: 'center',
    },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 32 },
    list: { gap: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    rowText: { flex: 1 },
});
