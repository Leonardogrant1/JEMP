import Logo from '@/assets/icons/logo.svg';
import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { LayoutChangeEvent, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

const GRADIENT: [string, string] = [Cyan[500], Electric[500]];

// Trainings-Collage: 3 Spalten Stock-Fotos, die mittlere versetzt (Masonry-Feel)
const IMAGE_COLUMNS = [
    [
        require('@/assets/stock_images/explosive_push.jpg'),
        require('@/assets/stock_images/sprints.jpg'),
        require('@/assets/stock_images/hip_thrust.jpg'),
        require('@/assets/stock_images/upper_pull.jpg'),
    ],
    [
        require('@/assets/stock_images/vertical_jumps.jpg'),
        require('@/assets/stock_images/conditioning.jpg'),
        require('@/assets/stock_images/olympic_lifts.jpg'),
        require('@/assets/stock_images/agility.jpg'),
    ],
    [
        require('@/assets/stock_images/reactive_jumps.jpg'),
        require('@/assets/stock_images/lunges.jpg'),
        require('@/assets/stock_images/medicine_ball.jpg'),
        require('@/assets/stock_images/squat_patterns.jpg'),
    ],
];

const DELAY_LOGO = 200;
const DELAY_TITLE = 340;
const DELAY_SUBTITLE = 460;
const DELAY_BUTTON = 620;

/**
 * Endlos scrollende Bild-Spalte: der Stapel ist doppelt gerendert und wandert
 * um genau eine Stapelhöhe, dann snapt der Loop unsichtbar zurück.
 * Start über onLayout statt useEffect (react-hooks/immutability).
 */
function MarqueeColumn({ images, direction, duration }: {
    images: number[];
    direction: 'up' | 'down';
    duration: number;
}) {
    const offset = useSharedValue(0);
    const started = useRef(false);

    function handleSetLayout(e: LayoutChangeEvent) {
        const setHeight = e.nativeEvent.layout.height;
        if (started.current || setHeight === 0) return;
        started.current = true;
        if (direction === 'up') {
            offset.value = withRepeat(withTiming(-setHeight, { duration, easing: Easing.linear }), -1);
        } else {
            // Abwärts: bei -Stapelhöhe starten und zur 0 laufen
            offset.value = -setHeight;
            offset.value = withRepeat(withTiming(0, { duration, easing: Easing.linear }), -1);
        }
    }

    const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

    return (
        <View style={styles.column}>
            <Animated.View style={animStyle}>
                <View onLayout={handleSetLayout}>
                    {images.map((source, i) => (
                        <Image key={`a-${i}`} source={source} style={styles.tile} contentFit="cover" />
                    ))}
                </View>
                <View>
                    {images.map((source, i) => (
                        <Image key={`b-${i}`} source={source} style={styles.tile} contentFit="cover" />
                    ))}
                </View>
            </Animated.View>
        </View>
    );
}

export function WelcomeStep() {
    const { t } = useTranslation();
    const { nextStep } = useOnboardingControl();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <View style={styles.container}>
            {/* ── Collage: läuft oben aus dem Screen, unten in den Background ── */}
            <Animated.View entering={FadeIn.duration(600)} style={styles.collage}>
                <View style={styles.columns}>
                    <MarqueeColumn images={IMAGE_COLUMNS[0]} direction="down" duration={58000} />
                    <MarqueeColumn images={IMAGE_COLUMNS[1]} direction="up" duration={70000} />
                    <MarqueeColumn images={IMAGE_COLUMNS[2]} direction="down" duration={64000} />
                </View>
                <LinearGradient
                    colors={[`${theme.background}00`, theme.background]}
                    style={styles.collageFade}
                />
            </Animated.View>

            {/* ── Logo-Badge auf der Nahtstelle ── */}
            <View style={styles.content}>
                <Animated.View
                    entering={FadeInDown.delay(DELAY_LOGO).duration(500).springify()}
                    style={[styles.logoBadge, { backgroundColor: theme.surface }]}
                >
                    <Logo width={44} height={44} />
                </Animated.View>

                <View style={styles.textBlock}>
                    <Animated.View entering={FadeInDown.delay(DELAY_TITLE).duration(500).springify()}>
                        <JempText type="h1" style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
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
                    <TouchableOpacity onPress={nextStep} activeOpacity={0.85} style={styles.button}>
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
    collage: {
        flex: 1,
        overflow: 'hidden',
    },
    columns: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 8,
        marginTop: -30,
    },
    column: {
        flex: 1,
    },
    tile: {
        width: '100%',
        aspectRatio: 0.72,
        borderRadius: 14,
        // Abstand als Margin statt gap — so bleibt der Rhythmus auch an der
        // Nahtstelle zwischen den duplizierten Stapeln identisch
        marginBottom: 8,
    },
    collageFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 160,
    },
    content: {
        alignItems: 'center',
        // Button-Breite/-Position identisch zum Continue-Button des Wrappers
        paddingHorizontal: 20,
        paddingBottom: 48,
        gap: 20,
    },
    logoBadge: {
        width: 84,
        height: 84,
        borderRadius: 42,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -42,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 10,
    },
    textBlock: { alignItems: 'center', gap: 10, paddingHorizontal: 8 },
    title: {
        textAlign: 'center',
        fontSize: 25,
        lineHeight: 32,
        letterSpacing: -0.5,
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 21,
    },
    buttonWrapper: { width: '100%', marginTop: 28 },
    button: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    buttonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
