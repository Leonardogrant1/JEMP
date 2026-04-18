import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SESSION_IMAGE = require('@/assets/images/splash-icon.png');

export default function HomeScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.content}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        <JempText type="body-sm" color={theme.textMuted}>Welcome Back,</JempText>
                        <JempText type="h1">Leonardo</JempText>
                    </View>
                    <View style={[styles.avatar, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                        <JempText type="button" color={theme.text}>L</JempText>
                    </View>
                </View>

                {/* ── Session Card ── */}
                <View style={styles.card}>
                    <Image
                        source={SESSION_IMAGE}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        contentPosition="top center"
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.9)']}
                        locations={[0.35, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.cardContent}>
                        <JempText type="caption" color={theme.textMuted}>Todays Session</JempText>
                        <JempText type="hero" color="#fff">Explosivity Focus</JempText>
                        <JempText type="body-sm" color={theme.textMuted}>30 min</JempText>
                    </View>
                </View>

                {/* ── CTA ── */}
                <Pressable style={styles.cta}>
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaGradient}
                    >
                        <JempText type="button" color="#fff">Start Session</JempText>
                    </LinearGradient>
                </Pressable>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        gap: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardContent: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        gap: 4,
    },
    cta: {
        borderRadius: 100,
        overflow: 'hidden',
    },
    ctaGradient: {
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
