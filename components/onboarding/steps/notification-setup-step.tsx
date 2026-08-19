import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, GRADIENT } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

/**
 * Mock-iOS-Dialog als Vor-Prompt: erst der Tap auf „Erlauben" löst den echten
 * System-Prompt aus — „Nicht erlauben" überspringt ihn (und verbrennt die
 * einmalige iOS-Permission-Abfrage nicht). Danach geht es automatisch weiter.
 */
export function NotificationSetupStep() {
    const { t } = useTranslation();
    const { nextStep } = useOnboardingControl();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const busyRef = useRef(false);

    async function handleAllow() {
        if (busyRef.current) return;
        busyRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            const result = await Notifications.requestPermissionsAsync();
            const status = result.granted ? 'granted' : 'denied';
            trackerManager.track('notification_permission', {
                status,
                $set: { notification_status: status },
            });
        } finally {
            busyRef.current = false;
            nextStep();
        }
    }

    // Endlos-Bounce des Zeigefingers — Start über onLayout statt useEffect
    // (react-hooks/immutability verbietet Shared-Value-Mutation im Effect)
    const fingerY = useSharedValue(0);
    const fingerStarted = useRef(false);
    function handleFingerLayout() {
        if (fingerStarted.current) return;
        fingerStarted.current = true;
        fingerY.value = withRepeat(
            withSequence(
                withTiming(-9, { duration: 500, easing: Easing.inOut(Easing.quad) }),
                withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }),
            ),
            -1,
        );
    }
    const fingerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: fingerY.value }] }));

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.notification_title')}</JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.notification_subtitle')}
                </JempText>
            </Animated.View>

            {/* ── Mock-System-Dialog ── */}
            <Animated.View
                entering={FadeInDown.delay(400).duration(500).springify()}
                style={[styles.dialog, { backgroundColor: theme.surface }]}
            >
                <View style={styles.dialogBody}>
                    <JempText type="body-l" color={theme.text} style={styles.dialogText}>
                        {t('onboarding.notification_dialog_body')}
                    </JempText>
                </View>
                <View style={[styles.dialogButtons, { borderTopColor: theme.borderDivider }]}>
                    {/* Bewusst NICHT tappbar — der Weg führt nur über „Erlauben" */}
                    <View style={styles.dialogBtn}>
                        <JempText type="body-l" color={theme.textMuted}>
                            {t('onboarding.notification_dont_allow')}
                        </JempText>
                    </View>
                    <Pressable
                        style={({ pressed }) => [styles.allowBtn, pressed && { opacity: 0.85 }]}
                        onPress={handleAllow}
                    >
                        <LinearGradient
                            colors={GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.allowGradient}
                        >
                            <JempText type="button" color="#fff">
                                {t('onboarding.notification_allow')}
                            </JempText>
                        </LinearGradient>
                    </Pressable>
                </View>
            </Animated.View>

            {/* Zeigefinger unter dem Erlauben-Button, sanft auf und ab */}
            <Animated.View entering={FadeInDown.delay(600).duration(500).springify()} style={styles.fingerWrap}>
                <Animated.View onLayout={handleFingerLayout} style={fingerStyle}>
                    <JempText type="h1" style={styles.finger}>👆</JempText>
                </Animated.View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        justifyContent: 'center',
        paddingBottom: 60,
    },
    title: {
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 36,
    },
    // Kein overflow:hidden — das clippte die Button-Reihe an der unteren
    // Rundung; der Gradient-Button clippt sich über seinen eigenen Radius
    dialog: {
        borderRadius: 16,
        alignSelf: 'stretch',
    },
    dialogBody: {
        paddingHorizontal: 24,
        paddingVertical: 22,
    },
    dialogText: {
        textAlign: 'center',
        lineHeight: 24,
    },
    dialogButtons: {
        flexDirection: 'row',
        borderTopWidth: StyleSheet.hairlineWidth,
        padding: 8,
        gap: 8,
    },
    dialogBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    allowBtn: {
        flex: 1,
    },
    // Radius direkt auf dem Gradient statt Clipping über den Wrapper —
    // das overflow-hidden-Clipping fraß die untere Rundung
    allowGradient: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    fingerWrap: {
        alignItems: 'center',
        // Unter der rechten Dialog-Hälfte (Erlauben-Button)
        alignSelf: 'flex-end',
        width: '50%',
        marginTop: 10,
    },
    finger: {
        fontSize: 30,
        lineHeight: 36,
    },
});
