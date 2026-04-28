import { JempText } from '@/components/jemp-text';
import { AuthModal } from '@/components/modals/auth-modal';
import { LanguageModal } from '@/components/modals/language-modal';
import { SlideToStart } from '@/components/slide-to-start';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

const FLAG: Record<string, string> = {
    de: '🇩🇪',
    en: '🇬🇧',
};

export default function StartScreen() {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { t } = useTranslation();

    const player = useVideoPlayer(require('@/assets/videos/start-screen.mp4'), p => {
        p.loop = true;
        p.muted = true;
        p.play();
    });

    const [authVisible, setAuthVisible] = useState(false);
    const [langVisible, setLangVisible] = useState(false);

    function handleComplete() {
        setAuthVisible(true);
    }

    function handleSignIn() {
        setAuthVisible(true);
    }

    return (

        <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.background }]}>

            {/* ── Background video ── */}
            <VideoView
                player={player}
                style={styles.hero}
                contentFit="cover"
                nativeControls={false}
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
                    <Pressable style={styles.langBadge} onPress={() => setLangVisible(true)}>
                        <JempText type="caption" style={styles.langFlag}>{FLAG[lang] ?? '🌐'}</JempText>
                        <JempText type="caption" color={theme.text}>
                            {lang.toUpperCase()}
                        </JempText>
                    </Pressable>
                </View>

                {/* ── Bottom content ── */}
                <View style={styles.bottom}>
                    <JempText type="hero" style={styles.headline}>
                        {t('start.headline')}
                    </JempText>

                    <JempText type="body-l" color={theme.textMuted} style={styles.sub}>
                        {t('start.subtitle')}
                    </JempText>

                    <View style={styles.ctaWrapper}>
                        <SlideToStart onComplete={handleComplete} label={t('start.cta')} />
                    </View>

                    <Pressable onPress={handleSignIn} style={styles.signInRow}>
                        <JempText type="body-sm" color={theme.textSubtle}>
                            {t('start.sign_in')}{' '}
                            <JempText type="body-sm" color={theme.text} style={{ fontFamily: Fonts.satoshiBold }}>
                                {t('start.sign_in_link')}
                            </JempText>
                        </JempText>
                    </Pressable>
                </View>
            </SafeAreaView>
            <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
            <LanguageModal visible={langVisible} onClose={() => setLangVisible(false)} />
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
