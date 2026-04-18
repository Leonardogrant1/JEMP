import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Mock data ──────────────────────────────────────────────────────────────
// Days (0=Mon … 6=Sun) that have a session this week
const SESSION_DAYS = new Set([1, 3, 4]); // Tue, Thu, Fri

const STREAK_DAYS = 12;
const PLAN_COMPLETION = 0.68; // 68%

const NEXT_SESSION = {
    time: '18:00',
    title: 'Upper Body Blitz',
    description: 'Hypertrophy focus on shoulders, chest, and triceps with high intensity finishers.',
    duration: '45 MIN',
    kcal: '380 KCAL',
};

const SESSION_IMAGE = require('@/assets/images/splash-icon.png');

// ── Date helpers ────────────────────────────────────────────────────────────
const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekDays(date: Date): Date[] {
    const dow = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

// ── Component ───────────────────────────────────────────────────────────────
export default function PlanScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const [trackWidth, setTrackWidth] = useState(0);
    const barWidth = useSharedValue(0);

    useEffect(() => {
        if (trackWidth > 0) {
            barWidth.value = withTiming(trackWidth * PLAN_COMPLETION, { duration: 700 });
        }
    }, [trackWidth]);

    const barStyle = useAnimatedStyle(() => ({ width: barWidth.value }));

    const today = new Date();
    const weekDays = getWeekDays(today);
    const weekNumber = getISOWeek(today);
    const month = MONTHS[today.getMonth()];
    const todayIndex = weekDays.findIndex(
        d => d.getDate() === today.getDate() && d.getMonth() === today.getMonth()
    );

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Header ── */}
                <View style={styles.headerRow}>
                    <View>
                        <JempText type="h1" style={styles.title}>Plan</JempText>
                    </View>
                    <View style={styles.weekInfo}>
                        <JempText type="body-sm" color={theme.textMuted}>{month} {today.getFullYear()}</JempText>
                        <JempText type="body-sm" gradient color={theme.primary}>Week {weekNumber}</JempText>
                    </View>
                </View>

                {/* ── Stats card ── */}
                <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <View style={styles.statValueRow}>
                                <Ionicons name="flame" size={18} color={Cyan[500]} />
                                <JempText type="h1" gradient>{String(STREAK_DAYS)}</JempText>
                            </View>
                            <JempText type="caption" color={theme.textMuted}>DAY STREAK</JempText>
                        </View>

                        <View style={[styles.verticalDivider, { backgroundColor: theme.borderDivider }]} />

                        <View style={styles.statItem}>
                            <JempText type="h1" gradient>{Math.round(PLAN_COMPLETION * 100)}%</JempText>
                            <JempText type="caption" color={theme.textMuted}>PLAN COMPLETE</JempText>
                        </View>
                    </View>

                    <View
                        style={[styles.progressTrack, { backgroundColor: theme.borderDivider }]}
                        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
                    >
                        <Animated.View style={[styles.progressFill, barStyle]}>
                            <LinearGradient
                                colors={[Cyan[500], Electric[500]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    </View>
                </View>

                {/* ── Week strip ── */}
                <View style={styles.weekStrip}>
                    {weekDays.map((day, i) => {
                        const isToday = i === todayIndex;
                        const hasSession = SESSION_DAYS.has(i);

                        return (
                            <View
                                key={i}
                                style={[
                                    styles.dayWrapper,
                                    { backgroundColor: isToday ? 'transparent' : theme.surface },
                                ]}
                            >
                                {isToday && (
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                <JempText type="caption" style={styles.dayName} color={isToday ? 'rgba(255,255,255,0.7)' : theme.textMuted}>
                                    {DAY_NAMES[i]}
                                </JempText>
                                <JempText type="h2" style={styles.dayNumber} color={isToday ? '#fff' : theme.text}>
                                    {String(day.getDate())}
                                </JempText>
                                <View style={styles.dotSlot}>
                                    {isToday
                                        ? <JempText type="caption" style={styles.todayLabel} color="rgba(255,255,255,0.7)">TODAY</JempText>
                                        : hasSession && <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                                    }
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* ── Session card ── */}
                <View style={styles.sessionCard}>
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
                        <JempText type="caption" color={theme.textMuted}>
                            NEXT SESSION • {NEXT_SESSION.time}
                        </JempText>
                        <JempText type="hero" color="#fff">{NEXT_SESSION.title}</JempText>
                        <View style={styles.statsRow}>
                            <View style={styles.stat}>
                                <Ionicons name="time-outline" size={13} color={Cyan[500]} />
                                <JempText type="caption" color={theme.textMuted}>{NEXT_SESSION.duration}</JempText>
                            </View>
                            <View style={styles.stat}>
                                <Ionicons name="flame-outline" size={13} color={Cyan[500]} />
                                <JempText type="caption" color={theme.textMuted}>{NEXT_SESSION.kcal}</JempText>
                            </View>
                        </View>
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
                        <JempText type="button" color="#fff">View Details</JempText>
                    </LinearGradient>
                </Pressable>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        gap: 24,
    },

    // Header
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    eyebrow: {
        letterSpacing: 1,
        marginBottom: 2,
    },
    title: {
        letterSpacing: -0.5,
    },
    weekInfo: {
        alignItems: 'flex-end',
        gap: 2,
        paddingBottom: 4,
    },

    // Stats card
    statsCard: {
        borderRadius: 16,
        padding: 16,
        gap: 14,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statItem: {
        flex: 1,
        gap: 2,
    },
    statValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    verticalDivider: {
        width: 1,
        height: 40,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
    },

    // Week strip
    weekStrip: {
        flexDirection: 'row',
        gap: 4,
    },
    dayWrapper: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 7,
        alignItems: 'center',
        overflow: 'hidden',
        gap: 2,
    },
    dayName: {
        fontSize: 9,
        lineHeight: 12,
        letterSpacing: 0.5,
    },
    dayNumber: {
        fontSize: 15,
        lineHeight: 18,
    },
    todayLabel: {
        fontSize: 7,
        lineHeight: 10,
        letterSpacing: 0.5,
    },
    dotSlot: {
        height: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },

    // Session card
    sessionCard: {
        height: "100%",
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardContent: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        gap: 6,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
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
