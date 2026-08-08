import { JempText } from '@/components/jemp-text';
import { CategoryChip, ModeChip, SessionChip } from '@/components/plan/SessionChip';
import { ProgressHeroCard } from '@/components/progress/progress-hero-card';
import { Sparkline } from '@/components/progress/sparkline';
import { TrendBadge } from '@/components/progress/trend-badge';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { getCategoryLabelShort } from '@/constants/category-labels';
import { DAY_NAMES, MONTHS } from '@/constants/date-constants';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { getISOWeek, getWeekDays } from '@/helpers/date-helpers';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useTutorialStore } from '@/stores/tutorial-store';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Die Mocks spiegeln die echten Redesign-Komponenten (WeekStrip-Thumb,
// Session-Card mit Glass-Chips, Assessments-Tab), aber ohne Provider-Kopplung
const theme = Colors.dark;

// ─── Slide 1: Plan ────────────────────────────────────────────────────────────

const today = new Date();
const weekDays = getWeekDays(today);
const todayIndex = weekDays.findIndex(
    d => d.getDate() === today.getDate() && d.getMonth() === today.getMonth()
);
// Session-Punkte auf zwei Nicht-Heute-Tagen
const dotDays = [(todayIndex + 2) % 7, (todayIndex + 4) % 7];

function PlanMock() {
    const { t } = useTranslation();
    return (
        <View style={mock.planContainer}>
            <View style={mock.weekInfoRow}>
                <JempText type="body-sm" color={theme.textMuted}>
                    {MONTHS[today.getMonth()]} {today.getFullYear()}
                </JempText>
                <JempText type="body-sm" gradient color={theme.primary}>
                    Week {getISOWeek(today)}
                </JempText>
            </View>

            {/* WeekStrip-Optik: heute trägt den Gradient-Thumb */}
            <View style={mock.weekStrip}>
                {weekDays.map((day, i) => {
                    const isToday = i === todayIndex;
                    return (
                        <View key={i} style={[mock.dayTile, !isToday && { backgroundColor: theme.surface }]}>
                            {isToday && (
                                <LinearGradient
                                    colors={[Cyan[500], Electric[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            <JempText type="caption" style={mock.dayName} color={isToday ? 'rgba(255,255,255,0.7)' : theme.textMuted}>
                                {DAY_NAMES[i]}
                            </JempText>
                            <JempText type="h2" style={mock.dayNumber} color={isToday ? '#fff' : theme.text}>
                                {String(day.getDate())}
                            </JempText>
                            <View style={mock.dotSlot}>
                                {isToday
                                    ? <JempText type="caption" style={mock.todayLabel} color="rgba(255,255,255,0.7)">{t('ui.today')}</JempText>
                                    : dotDays.includes(i) && <View style={[mock.sessionDot, { backgroundColor: theme.primary }]} />}
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Session-Card-Optik: Foto, Overlay, Glass-Chips, Glow */}
            <View style={mock.cardGlow}>
                <View style={mock.sessionCard}>
                    <Image
                        source={require('@/assets/stock_images/explosive_push.jpg')}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.95)']}
                        locations={[0.15, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={mock.cardContent}>
                        <JempText type="h1" color="#fff">{t('tutorial.mock_session_title')}</JempText>
                        <View style={mock.metaRow}>
                            <SessionChip
                                icon={<Ionicons name="time-outline" size={12} color={GradientMid} />}
                                label="60 min"
                            />
                            <ModeChip mode="full" />
                            <CategoryChip slug="strength" />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

// ─── Slide 2: Assessments ─────────────────────────────────────────────────────

const StrengthIcon = CATEGORY_SVG_ICONS.strength;
const JumpsIcon = CATEGORY_SVG_ICONS.jumps;

function AssessmentsMock() {
    const { t } = useTranslation();
    return (
        <View style={mock.assessContainer}>
            {/* Kategorie-Chips wie im Assessments-Tab */}
            <View style={mock.chipRow}>
                <LinearGradient
                    colors={[Cyan[500], Electric[500]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={mock.chip}
                >
                    {StrengthIcon && <StrengthIcon width={14} height={14} color="#fff" />}
                    <JempText type="body-sm" color="#fff">{t('category.strength_short')}</JempText>
                    <View style={[mock.chipCount, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                        <JempText type="body-sm" color="#fff">3</JempText>
                    </View>
                </LinearGradient>
                <View style={[mock.chip, { backgroundColor: theme.surface }]}>
                    {JumpsIcon && <JumpsIcon width={14} height={14} color={theme.textMuted} />}
                    <JempText type="body-sm" color={theme.textMuted}>{t('category.jumps_short')}</JempText>
                    <View style={[mock.chipCount, { backgroundColor: theme.background }]}>
                        <JempText type="body-sm" color={theme.textMuted}>2</JempText>
                    </View>
                </View>
            </View>

            {/* Assessment-Cards: eine erledigt, zwei offen */}
            <View style={mock.assessList}>
                <View style={[mock.assessCard, { backgroundColor: theme.surface }]}>
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={mock.circleFilled}
                    >
                        <Ionicons name="checkmark" size={14} color="#fff" />
                    </LinearGradient>
                    <View style={mock.assessText}>
                        <JempText type="body-l" color={theme.text}>Vertical Jump</JempText>
                        <JempText type="body-sm" color={theme.textSubtle}>
                            {t('ui.assessment_result', { value: '42 cm' })}
                        </JempText>
                    </View>
                </View>
                {[t('tutorial.mock_assessment_1'), t('tutorial.mock_assessment_2')].map((name) => (
                    <View key={name} style={[mock.assessCard, { backgroundColor: theme.surface }]}>
                        <View style={[mock.circle, { borderColor: theme.borderStrong }]} />
                        <View style={mock.assessText}>
                            <JempText type="body-l" color={theme.textMuted}>{name}</JempText>
                            <JempText type="body-sm" color={theme.textSubtle}>
                                {t('ui.assessment_not_attempted')}
                            </JempText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Slide 3: Progress ────────────────────────────────────────────────────────

// Aufsteigende Fake-Historie im echten CategoryHistoryPoint-Format
function toHistory(scores: number[]) {
    return scores.map((score, i) => ({
        score,
        recordedAt: new Date(today.getTime() - (scores.length - 1 - i) * 7 * 86400000).toISOString(),
    }));
}

const HERO_HISTORY = toHistory([58, 61, 60, 64, 67, 71, 74]);
const STAT_TILES = [
    { slug: 'strength', value: 68, trend: 8, history: toHistory([52, 55, 60, 58, 63, 68]) },
    { slug: 'mobility', value: 81, trend: 15, history: toHistory([61, 66, 70, 74, 78, 81]) },
];

function ProgressMock() {
    const { t } = useTranslation();
    return (
        <View style={mock.progressContainer}>
            <ProgressHeroCard
                label={t('category.overall')}
                score={74}
                trend={12}
                chartData={HERO_HISTORY}
                emptyLabel=""
            />
            {/* Stat-Tiles in CategoryStatGrid-Optik */}
            <View style={mock.statRow}>
                {STAT_TILES.map(({ slug, value, trend, history }) => {
                    const Icon = CATEGORY_SVG_ICONS[slug];
                    return (
                        <View key={slug} style={[mock.statTile, { backgroundColor: theme.surface }]}>
                            <View style={mock.statContent}>
                                <View style={mock.statLabelRow}>
                                    {Icon && <Icon width={14} height={14} color={theme.textMuted} />}
                                    <JempText type="caption" color={theme.textMuted} style={mock.statLabel} numberOfLines={1}>
                                        {getCategoryLabelShort(slug, t)}
                                    </JempText>
                                </View>
                                <View style={mock.statValueRow}>
                                    <JempText type="h1" style={mock.statValue}>{String(value)}</JempText>
                                    <TrendBadge trend={trend} />
                                </View>
                            </View>
                            <View style={mock.statSparkWrap}>
                                <Sparkline data={history} negative={false} delay={0} />
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

// ─── Slide 4: 4-Wochen-Zyklus ─────────────────────────────────────────────────

const WEEK_STEP_MS = 650;
const FIRST_WEEK_MS = 600;
const RESET_HOLD_MS = 1300;
const START_LEVEL = 7;

function WeekPill({ week, lit }: { week: number; lit: boolean }) {
    const isLast = week === 4;
    return (
        <View style={[mock.weekPill, { backgroundColor: theme.surface }]}>
            {lit && (
                <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={StyleSheet.absoluteFill}>
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            )}
            {lit && <Ionicons name={isLast ? 'sparkles' : 'checkmark'} size={13} color="#fff" />}
            <JempText type="button" color={lit ? '#fff' : theme.textMuted}>W{week}</JempText>
        </View>
    );
}

function CycleMock() {
    // Loop: Wochen leuchten nacheinander auf, die XP-Bar rückt synchron pro
    // Woche ein Viertel weiter; mit W4 landet sie am Ende und das Level poppt.
    // Alles über Layout-Animationen (LinearTransition) — keine Shared Values;
    // der Bar-Reset läuft über key-Remount, sonst würde er rückwärts animieren.
    const [cycle, setCycle] = useState(0);
    const [weekCount, setWeekCount] = useState(0);

    useEffect(() => {
        const timers = [1, 2, 3, 4].map((week) =>
            setTimeout(() => setWeekCount(week), FIRST_WEEK_MS + (week - 1) * WEEK_STEP_MS)
        );
        timers.push(setTimeout(() => {
            setWeekCount(0);
            setCycle(c => c + 1);
        }, FIRST_WEEK_MS + 3 * WEEK_STEP_MS + RESET_HOLD_MS));
        return () => timers.forEach(clearTimeout);
    }, [cycle]);

    // Mit W4 springt das Level; der Zyklus-Reset kompensiert (+1 auf cycle,
    // weekCount zurück auf 0) — die Zahl bleibt dabei stehen, kein Re-Pop
    const level = START_LEVEL + cycle + (weekCount === 4 ? 1 : 0);
    const leveledUp = weekCount === 4;

    return (
        <View style={mock.cycleContainer}>
            <View style={[mock.levelCard, { backgroundColor: theme.surface }]}>
                <View style={mock.levelRow}>
                    <JempText type="caption" color={theme.textMuted} style={mock.levelLabel}>
                        LEVEL
                    </JempText>
                    <View style={mock.levelValueRow}>
                        <Animated.View key={level} entering={ZoomIn.duration(320).springify()}>
                            <JempText type="h1" gradient style={mock.levelNumber}>{String(level)}</JempText>
                        </Animated.View>
                        {leveledUp && (
                            <Animated.View
                                entering={ZoomIn.delay(100).duration(300).springify()}
                                exiting={FadeOut.duration(180)}
                            >
                                <Ionicons name="sparkles" size={16} color={GradientMid} />
                            </Animated.View>
                        )}
                    </View>
                </View>
                <View style={mock.xpTrack}>
                    <Animated.View
                        key={cycle}
                        layout={LinearTransition.duration(420)}
                        style={[mock.xpFill, { width: `${(weekCount / 4) * 100}%` }]}
                    >
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>
            </View>

            <View style={mock.weekPillRow}>
                {[1, 2, 3, 4].map((week) => (
                    <WeekPill key={week} week={week} lit={weekCount >= week} />
                ))}
            </View>
        </View>
    );
}

// ─── Slides ───────────────────────────────────────────────────────────────────

const SLIDES = [
    { Mock: PlanMock, titleKey: 'tutorial.slide1.title', bodyKey: 'tutorial.slide1.body' },
    { Mock: AssessmentsMock, titleKey: 'tutorial.slide2.title', bodyKey: 'tutorial.slide2.body' },
    { Mock: ProgressMock, titleKey: 'tutorial.slide3.title', bodyKey: 'tutorial.slide3.body' },
    { Mock: CycleMock, titleKey: 'tutorial.slide4.title', bodyKey: 'tutorial.slide4.body' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TutorialScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { setHasSeenTutorial } = useTutorialStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const pagerRef = useRef<ScrollView>(null);

    const isLast = currentIndex === SLIDES.length - 1;

    function finish() {
        setHasSeenTutorial(true);
        trackerManager.track('tutorial_completed');
        router.replace('/(tabs)');
    }

    function advance() {
        if (isLast) { finish(); return; }
        pagerRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    }

    return (
        <View style={styles.container}>
            <ScrollView
                ref={pagerRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
                }}
            >
                {SLIDES.map(({ Mock, titleKey, bodyKey }, i) => (
                    <View key={titleKey} style={[styles.page, { width, paddingTop: insets.top + 12 }]}>
                        <Animated.View
                            entering={FadeInDown.delay(i === 0 ? 120 : 0).duration(400)}
                            style={styles.previewArea}
                        >
                            <Mock />
                        </Animated.View>
                        <View style={styles.textBlock}>
                            <JempText type="h1" color="#fff" style={styles.title}>
                                {t(titleKey as any)}
                            </JempText>
                            <JempText type="body-l" color={theme.textMuted} style={styles.body}>
                                {t(bodyKey as any)}
                            </JempText>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Footer: Dots + CTA, für alle Slides fix */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.dots}>
                    {SLIDES.map((_, i) => (
                        <Animated.View
                            key={i}
                            layout={LinearTransition.duration(200)}
                            style={[styles.dot, i === currentIndex && styles.dotActive]}
                        />
                    ))}
                </View>
                <Pressable style={styles.button} onPress={advance}>
                    <LinearGradient
                        colors={[Cyan[500], Electric[500]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                    >
                        <JempText type="button" color="#fff">
                            {isLast ? t('tutorial.cta_start' as any) : t('tutorial.cta_continue' as any)}
                        </JempText>
                    </LinearGradient>
                </Pressable>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    page: {
        flex: 1,
        paddingHorizontal: 24,
    },
    previewArea: {
        flex: 1,
        justifyContent: 'center',
    },
    textBlock: {
        gap: 10,
        paddingBottom: 8,
    },
    title: {
        letterSpacing: -0.5,
    },
    body: {
        lineHeight: 24,
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        gap: 18,
    },
    dots: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dotActive: {
        width: 18,
        backgroundColor: GradientMid,
    },
    button: {
        borderRadius: 100,
        overflow: 'hidden',
    },
    buttonGradient: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// ─── Mock Styles ──────────────────────────────────────────────────────────────

const mock = StyleSheet.create({
    // Plan
    planContainer: {
        gap: 12,
    },
    weekInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
    },
    weekStrip: {
        flexDirection: 'row',
        gap: 4,
    },
    dayTile: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 7,
        alignItems: 'center',
        gap: 2,
        overflow: 'hidden',
    },
    dayName: { fontSize: 9, lineHeight: 12, letterSpacing: 0.5 },
    dayNumber: { fontSize: 15, lineHeight: 18 },
    todayLabel: { fontSize: 7, lineHeight: 10, letterSpacing: 0.5 },
    dotSlot: { height: 10, alignItems: 'center', justifyContent: 'center' },
    sessionDot: { width: 5, height: 5, borderRadius: 3 },
    cardGlow: {
        borderRadius: 20,
        shadowColor: GradientMid,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 8,
    },
    sessionCard: {
        borderRadius: 20,
        overflow: 'hidden',
        height: 240,
    },
    cardContent: {
        position: 'absolute',
        bottom: 18,
        left: 18,
        right: 18,
        gap: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },

    // Assessments
    assessContainer: {
        gap: 16,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 100,
        paddingLeft: 14,
        paddingRight: 6,
        paddingVertical: 6,
    },
    chipCount: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    assessList: {
        gap: 8,
    },
    assessCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    circle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
    },
    circleFilled: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    assessText: {
        flex: 1,
        gap: 1,
    },

    // Progress
    progressContainer: {
        gap: 12,
    },
    statRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statTile: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        paddingBottom: 6,
    },
    statContent: {
        paddingHorizontal: 12,
        paddingTop: 12,
        gap: 4,
    },
    statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statLabel: { fontSize: 11, letterSpacing: 0.3, flexShrink: 1 },
    statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statValue: { fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
    statSparkWrap: { marginTop: 'auto', paddingTop: 8 },

    // Zyklus
    cycleContainer: {
        alignSelf: 'stretch',
        gap: 12,
    },
    levelCard: {
        borderRadius: 20,
        padding: 20,
        gap: 16,
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    levelLabel: {
        letterSpacing: 1.5,
    },
    levelValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    levelNumber: {
        fontSize: 40,
        lineHeight: 46,
        letterSpacing: -1,
    },
    xpTrack: {
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    xpFill: {
        height: '100%',
        borderRadius: 5,
        overflow: 'hidden',
    },
    weekPillRow: {
        flexDirection: 'row',
        gap: 8,
        alignSelf: 'stretch',
    },
    weekPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        height: 44,
        borderRadius: 12,
        overflow: 'hidden',
    },
});
