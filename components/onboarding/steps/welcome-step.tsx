import Logo from '@/assets/icons/logo.svg';
import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

const DELAY_LOGO = 100;
const DELAY_EYEBROW = 260;
const DELAY_TITLE = 380;
const DELAY_SUBTITLE = 500;
const DELAY_BUTTON = 660;

export function WelcomeStep() {
    const { t } = useTranslation();
    const { nextStep } = useOnboardingControl();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.container}>
            <View style={styles.inner}>
                <Animated.View entering={FadeInDown.delay(DELAY_LOGO).duration(500).springify()} style={styles.logoWrapper}>
                    <Logo width={72} height={72} />
                </Animated.View>

                <View style={styles.textBlock}>
                    <Animated.View entering={FadeInDown.delay(DELAY_EYEBROW).duration(500).springify()}>
                        <JempText type="caption" color={Cyan[400]} style={styles.eyebrow}>
                            {t('onboarding.welcome_eyebrow')}
                        </JempText>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(DELAY_TITLE).duration(500).springify()}>
                        <JempText type="h1" style={styles.title}>
                            {t('onboarding.welcome_title')}
                        </JempText>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(DELAY_SUBTITLE).duration(500).springify()}>
                        <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                            {t('onboarding.welcome_subtitle')}
                        </JempText>
                    </Animated.View>
                </View>

                <Animated.View entering={FadeInDown.delay(DELAY_BUTTON).duration(500).springify()} style={styles.buttonWrapper}>
                    <TouchableOpacity
                        onPress={nextStep}
                        activeOpacity={0.85}
                        style={styles.button}
                    >
                        <LinearGradient
                            colors={GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.buttonGradient}
                        >
                            <JempText type="button" color="#fff">{t('onboarding.welcome_cta')}</JempText>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        gap: 28,
    },
    logoWrapper: {
        alignItems: 'center',
    },
    textBlock: { alignItems: 'center', gap: 12 },
    eyebrow: {
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    title: {
        textAlign: 'center',
        fontSize: 38,
        lineHeight: 48,
    },
    subtitle: {
        textAlign: 'center',
        lineHeight: 24,
    },
    buttonWrapper: { width: '100%' },
    button: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    buttonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
