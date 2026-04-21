import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type SessionStatus, type WorkoutSession, usePlan } from '@/providers/plan-provider';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

// ── Date helpers ──────────────────────────────────────────────────────────

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

function toDateStr(date: Date): string {
    return date.toISOString().split('T')[0];
}

// ── Status badge ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<SessionStatus, string> = {
    scheduled: 'Geplant',
    in_progress: 'Läuft',
    completed: 'Fertig',
    skipped: 'Übersprungen',
    cancelled: 'Abgebrochen',
};

const STATUS_COLORS: Record<SessionStatus, string> = {
    scheduled: '#8c8c8c',
    in_progress: '#f59e0b',
    completed: '#14b8a6',
    skipped: '#6b7280',
    cancelled: '#ef4444',
};

function StatusBadge({ status }: { status: SessionStatus }) {
    const color = STATUS_COLORS[status];
    return (
        <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
            <JempText type="caption" color={color}>{STATUS_LABELS[status]}</JempText>
        </View>
    );
}

// ── Session card ──────────────────────────────────────────────────────────

const SESSION_IMAGE = require('@/assets/images/splash-icon.png');

function SessionCard({ session, theme }: { session: WorkoutSession; theme: any }) {
    const isTraining = session.session_type === 'training';

    return (
        <View style={styles.sessionCard}>
            <Image
                source={SESSION_IMAGE}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="top center"
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.92)']}
                locations={[0.3, 1]}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.cardContent}>

                <JempText type="hero" color="#fff">{session.name}</JempText>
                <View style={styles.metaRow}>
                    {session.estimated_duration_minutes ? (
                        <>
                            <Ionicons name="time-outline" size={13} color={Cyan[500]} />
                            <JempText type="caption" color="rgba(255,255,255,0.5)">
                                {session.estimated_duration_minutes} MIN
                            </JempText>
                        </>
                    ) : null}
                    <StatusBadge status={session.status} />
                </View>
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
            </View>
        </View>
    );
}

// ── Gradient moon icon ────────────────────────────────────────────────────

function GradientMoonIcon({ size = 42 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 512 512">
            <Defs>
                <SvgLinearGradient id="moon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0" stopColor={Cyan[500]} />
                    <Stop offset="1" stopColor={Electric[500]} />
                </SvgLinearGradient>
            </Defs>
            {/* moon-outline path from Ionicons */}
            <Path
                d="M160 136c0-30.62 4.51-61.61 16-88C99.57 81.27 48 159.32 48 248c0 119.29 96.71 216 216 216 88.68 0 166.73-51.57 200-128-26.39 11.49-57.38 16-88 16-119.29 0-216-96.71-216-216z"
                fill="url(#moon-grad)"
            />
        </Svg>
    );
}

// ── Screen ────────────────────────────────────────────────────────────────

export default function PlanScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { plan, sessions, isLoading, streak } = usePlan();

    const [selectedDay, setSelectedDay] = useState<Date>(new Date());
    const [trackWidth, setTrackWidth] = useState(0);
    const barWidth = useSharedValue(0);

    const today = new Date();
    const weekDays = getWeekDays(today);
    const weekNumber = getISOWeek(today);
    const month = MONTHS[today.getMonth()];
    const todayIndex = weekDays.findIndex(
        d => d.getDate() === today.getDate() && d.getMonth() === today.getMonth()
    );

    // Plan completion: sessions that are no longer scheduled/in_progress
    const planCompletion = sessions.length > 0
        ? sessions.filter(s => s.status !== 'scheduled' && s.status !== 'in_progress').length / sessions.length
        : 0;

    // Days in current week that have at least one session
    const weekSessionDays = new Set(
        sessions
            .map(s => toDateStr(new Date(s.scheduled_at)))
            .filter(dateStr => weekDays.some(wd => toDateStr(wd) === dateStr))
    );

    // Sessions for the tapped day
    const selectedDayStr = toDateStr(selectedDay);
    const selectedDaySessions = sessions.filter(
        s => toDateStr(new Date(s.scheduled_at)) === selectedDayStr
    );

    useEffect(() => {
        if (trackWidth > 0) {
            barWidth.value = withTiming(trackWidth * planCompletion, { duration: 700 });
        }
    }, [trackWidth, planCompletion]);

    const barStyle = useAnimatedStyle(() => ({ width: barWidth.value }));

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.content} >

                {/* Header */}
                <View style={styles.headerRow}>
                    <JempText type="h1" style={styles.title}>Plan</JempText>
                    <View style={styles.weekInfo}>
                        <JempText type="body-sm" color={theme.textMuted}>{month} {today.getFullYear()}</JempText>
                        <JempText type="body-sm" gradient color={theme.primary}>Week {weekNumber}</JempText>
                    </View>
                </View>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator color={theme.primary} />
                    </View>
                ) : !plan ? (
                    <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
                        <Ionicons name="barbell-outline" size={32} color={theme.textMuted} />
                        <JempText type="body-l" color={theme.textMuted} style={styles.centeredText}>
                            Kein aktiver Trainingsplan.{'\n'}Erstelle einen im Profil.
                        </JempText>
                    </View>
                ) : (
                    <>
                        {/* Stats card */}
                        <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <JempText type="h1" gradient>{Math.round(planCompletion * 100)}%</JempText>
                                    <JempText type="caption" color={theme.textMuted}>PLAN COMPLETE</JempText>
                                </View>
                                <View style={[styles.divider, { backgroundColor: theme.borderDivider }]} />
                                <View style={styles.statItem}>
                                    <View style={styles.statValueRow}>
                                        <Ionicons name="flame" size={18} color={Cyan[500]} />
                                        <JempText type="h1" gradient>{String(streak)}</JempText>
                                    </View>
                                    <JempText type="caption" color={theme.textMuted}>DAY STREAK</JempText>
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

                        {/* Week strip */}
                        <View style={styles.weekStrip}>
                            {weekDays.map((day, i) => {
                                const isToday = i === todayIndex;
                                const isSelected = toDateStr(day) === selectedDayStr;
                                const hasSession = weekSessionDays.has(toDateStr(day));

                                return (
                                    <Pressable
                                        key={i}
                                        style={[
                                            styles.dayWrapper,
                                            {
                                                backgroundColor: isToday
                                                    ? 'transparent'
                                                    : isSelected
                                                        ? `${Electric[500]}28`
                                                        : theme.surface,
                                            },
                                        ]}
                                        onPress={() => setSelectedDay(new Date(day))}
                                    >
                                        {isToday && (
                                            <LinearGradient
                                                colors={[Cyan[500], Electric[500]]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 0, y: 1 }}
                                                style={StyleSheet.absoluteFill}
                                            />
                                        )}
                                        <JempText
                                            type="caption"
                                            style={styles.dayName}
                                            color={isToday ? 'rgba(255,255,255,0.7)' : theme.textMuted}
                                        >
                                            {DAY_NAMES[i]}
                                        </JempText>
                                        <JempText
                                            type="h2"
                                            style={styles.dayNumber}
                                            color={isToday ? '#fff' : theme.text}
                                        >
                                            {String(day.getDate())}
                                        </JempText>
                                        <View style={styles.dotSlot}>
                                            {isToday
                                                ? <JempText type="caption" style={styles.todayLabel} color="rgba(255,255,255,0.7)">TODAY</JempText>
                                                : hasSession && <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                                            }
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Sessions for selected day */}
                        {selectedDaySessions.length === 0 ? (
                            <View style={[styles.restCard]}>
                                <GradientMoonIcon size={42} />
                                <JempText type="body-l" color={theme.textMuted}>Ruhetag</JempText>
                            </View>
                        ) : (
                            // <View style={styles.sessionList}>

                            <SessionCard key={selectedDaySessions[0].id} session={selectedDaySessions[0]} theme={theme} />

                            // </View>
                        )}
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 20, height: "100%" },

    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    title: { letterSpacing: -0.5 },
    weekInfo: { alignItems: 'flex-end', gap: 2, paddingBottom: 4 },

    centered: { paddingTop: 60, alignItems: 'center' },
    centeredText: { textAlign: 'center' },
    emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 12 },

    // Stats
    statsCard: { borderRadius: 16, padding: 16, gap: 14 },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    statItem: { flex: 1, gap: 2 },
    statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    divider: { width: 1, height: 40 },
    progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },

    // Week strip
    weekStrip: { flexDirection: 'row', gap: 4 },
    dayWrapper: {
        flex: 1, borderRadius: 10, paddingVertical: 7,
        alignItems: 'center', overflow: 'hidden', gap: 2,
    },
    dayName: { fontSize: 9, lineHeight: 12, letterSpacing: 0.5 },
    dayNumber: { fontSize: 15, lineHeight: 18 },
    todayLabel: { fontSize: 7, lineHeight: 10, letterSpacing: 0.5 },
    dotSlot: { height: 10, alignItems: 'center', justifyContent: 'center' },
    dot: { width: 5, height: 5, borderRadius: 3 },

    // Sessions
    // sessionList: { gap: 16, height: "100%" },
    sessionCard: { position: "relative", borderRadius: 20, overflow: 'hidden', flex: 1 },
    cardContent: { position: 'absolute', bottom: 20, left: 20, right: 20, gap: 8 },
    sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cta: { borderRadius: 100, overflow: 'hidden', marginTop: 4 },
    ctaGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },

    // Rest
    restCard: { borderRadius: 16, alignItems: 'center', gap: 8, flex: 1, justifyContent: "center" },
});
