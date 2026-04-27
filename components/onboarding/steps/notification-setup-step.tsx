import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const ROW_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
    'calendar-outline',
    'flash-outline',
    'trophy-outline',
];

export function NotificationSetupStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.lottieWrapper}>
                <LottieView
                    source={require('@/assets/animations/notifications.json')}
                    autoPlay
                    loop={false}
                    style={styles.lottie}
                />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.notification_title')}</JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(320).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.notification_subtitle')}
                </JempText>
            </Animated.View>

            <View style={styles.rows}>
                {ROW_ICONS.map((icon, i) => (
                    <Animated.View
                        key={i}
                        entering={FadeInDown.delay(440 + i * 120).duration(500).springify()}
                    >
                        <View style={[styles.row, { backgroundColor: theme.surface }]}>
                            <Ionicons name={icon} size={20} color={GradientMid} />
                            <JempText type="body-l" color={theme.text} style={styles.rowText}>
                                {t(`onboarding.notification_row_${i}` as any)}
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
        gap: 16,
    },
    lottieWrapper: {
        alignItems: 'center',
        marginBottom: 8,
    },
    lottie: {
        width: 60,
        height: 60,
    },
    title: { textAlign: 'center' },
    subtitle: { textAlign: 'center', marginBottom: 8 },
    rows: { gap: 10 },
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
