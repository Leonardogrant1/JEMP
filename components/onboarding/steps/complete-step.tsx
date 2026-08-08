import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

const RING_SIZE = 190;
const RING_WIDTH = 14;

/**
 * Abschluss der Config-Strecke: Gradient-Ring mit OK-Geste, „Alles bereit"-
 * Badge und dem Zeit-für-deinen-Plan-Payoff — der „Plan erstellen"-Button
 * des Wrappers führt weiter.
 */
export function CompleteStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.container}>
            {/* ── Gradient-Ring mit OK-Geste ── */}
            <Animated.View entering={ZoomIn.delay(100).duration(500).springify()} style={styles.ringWrap}>
                <LinearGradient
                    colors={[Cyan[500], Electric[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ring}
                >
                    <View style={[styles.ringInner, { backgroundColor: theme.background }]}>
                        <LottieView
                            source={require('@/assets/animations/ok.json')}
                            autoPlay
                            loop
                            style={styles.lottie}
                        />
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* ── „Alles bereit"-Badge ── */}
            <Animated.View entering={FadeInDown.delay(340).duration(500).springify()} style={styles.badge}>
                <Ionicons name="checkmark-circle" size={18} color={GradientMid} />
                <JempText type="body-sm" color={theme.textMuted} style={styles.badgeText}>
                    {t('onboarding.complete_badge')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(460).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.complete_title')}</JempText>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 40,
        gap: 18,
    },
    ringWrap: {
        marginBottom: 14,
    },
    ring: {
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: RING_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringInner: {
        width: RING_SIZE - RING_WIDTH * 2,
        height: RING_SIZE - RING_WIDTH * 2,
        borderRadius: (RING_SIZE - RING_WIDTH * 2) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    lottie: {
        width: 118,
        height: 118,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badgeText: {
        fontWeight: '600',
    },
    title: {
        textAlign: 'center',
        fontSize: 28,
        lineHeight: 36,
    },
});
