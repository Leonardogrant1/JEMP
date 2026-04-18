import { JempText } from '@/components/jemp-text';
import { AuthModal } from '@/components/modals/auth-modal';
import { SlideToStart } from '@/components/slide-to-start';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { detectLanguage, initI18n } from '@/i18n';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

const FLAG: Record<string, string> = {
    de: '🇩🇪',
    en: '🇬🇧',
};

const HERO = require('@/assets/images/splash-icon.png');

export default function StartScreen() {
    const router = useRouter();
    const lang = detectLanguage();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    useEffect(() => {
        initI18n(lang);
    }, []);

    function handleComplete() {
        router.replace('/(tabs)');
    }

    const [authVisible, setAuthVisible] = useState(false);

    function handleSignIn() {
        setAuthVisible(true);
    }

    return (

        <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.background }]}>

            {/* ── Hero photo ── */}
            <Image
                source={HERO}
                style={styles.hero}
                contentFit="cover"
                contentPosition="top center"
            />

            {/* ── Gradient overlay: transparent → background color ── */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)', theme.background]}
                locations={[0.3, 0.6, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* ── Language badge (top-right) ── */}
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <View style={styles.topBar}>
                    <View style={styles.langBadge}>
                        <JempText type="caption" style={styles.langFlag}>{FLAG[lang] ?? '🌐'}</JempText>
                        <JempText type="caption" color={theme.text}>
                            {lang.toUpperCase()}
                        </JempText>
                    </View>
                </View>

                {/* ── Bottom content ── */}
                <View style={styles.bottom}>
                    <JempText type="hero" style={styles.headline}>
                        {'Become a next level\nAthlete. Today.'}
                    </JempText>

                    <JempText type="body-l" color={theme.textMuted} style={styles.sub}>
                        Start your training and see results
                    </JempText>

                    <View style={styles.ctaWrapper}>
                        <SlideToStart onComplete={handleComplete} label="Get started" />
                    </View>

                    <Pressable onPress={handleSignIn} style={styles.signInRow}>
                        <JempText type="body-sm" color={theme.textSubtle}>
                            You already have an account?{' '}
                            <JempText type="body-sm" color={theme.text} style={{ fontFamily: Fonts.satoshiBold }}>
                                Sign In
                            </JempText>
                        </JempText>
                    </Pressable>
                </View>
            </SafeAreaView>
            <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    hero: {
        ...StyleSheet.absoluteFillObject,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },

    // ── Top bar ──
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    langBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    langFlag: {
        fontSize: 14,
    },

    // ── Bottom section ──
    bottom: {
        paddingHorizontal: 24,
        paddingBottom: 8,
        gap: 16,
    },
    headline: {
        marginBottom: -4,
    },
    sub: {
        marginTop: -4,
    },
    ctaWrapper: {
        marginTop: 8,
    },

    // ── Sign-in ──
    signInRow: {
        alignItems: 'center',
        paddingVertical: 8,
    },
});
