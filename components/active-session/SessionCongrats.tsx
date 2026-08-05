import { Confetti } from '@/components/confetti';
import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, { Easing, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Konfetti in JEMP-Farbwelt statt Regenbogen
const JEMP_CONFETTI = [Cyan[400], Cyan[500], Electric[400], Electric[500], GradientMid, '#FFFFFF'];

/**
 * Finish-Screen nach einer Session: Trophy + gestaffelte Texte + Konfetti
 * direkt auf dem Background — auch vom DEV-Menü aus voranschaubar.
 */
export function SessionCongrats({ sessionName, buttonLabel, onPress }: {
    sessionName: string;
    buttonLabel: string;
    onPress: () => void;
}) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    // useSafeAreaInsets statt SafeAreaView: die misst nativ-asynchron und lässt
    // den Button im Modal (DEV-Preview) nach dem ersten Frame springen
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.root, { backgroundColor: theme.background }]}>
            <Confetti colors={JEMP_CONFETTI} />
            <View style={styles.content}>
                <Reanimated.View entering={ZoomIn.delay(150).duration(450).springify().damping(12)}>
                    <LottieView
                        source={require('@/assets/animations/throphy.json')}
                        autoPlay
                        loop={false}
                        style={styles.trophy}
                    />
                </Reanimated.View>
                <Reanimated.View entering={FadeInUp.delay(650).duration(400).easing(Easing.out(Easing.cubic))}>
                    <JempText type="hero" style={styles.centerText}>
                        {t('ui.congrats_title')}
                    </JempText>
                </Reanimated.View>
                <Reanimated.View entering={FadeInUp.delay(850).duration(400).easing(Easing.out(Easing.cubic))}>
                    <JempText type="body-l" color={theme.textMuted} style={styles.centerText}>
                        {sessionName}
                    </JempText>
                </Reanimated.View>
            </View>
            <Reanimated.View
                entering={FadeInUp.delay(1200).duration(400).easing(Easing.out(Easing.cubic))}
                style={[styles.btnWrap, { paddingBottom: insets.bottom + 16 }]}
            >
                <Pressable onPress={onPress} style={styles.btn}>
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.btnGradient}
                    >
                        <JempText type="button" color="#fff">{buttonLabel}</JempText>
                    </LinearGradient>
                </Pressable>
            </Reanimated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 32,
    },
    trophy: {
        width: 180,
        height: 180,
        marginBottom: 8,
    },
    centerText: {
        textAlign: 'center',
    },
    btnWrap: {
        paddingHorizontal: 24,
    },
    btn: {
        borderRadius: 100,
        overflow: 'hidden',
        width: '100%',
    },
    btnGradient: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
