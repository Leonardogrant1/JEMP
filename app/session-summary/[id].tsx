import { JempText } from '@/components/jemp-text';
import { SectionHeader } from '@/components/plan/SectionHeader';
import { SessionChip } from '@/components/plan/SessionChip';
import { StatsStrip } from '@/components/profile/stats-strip';
import { Skeleton } from '@/components/ui/skeleton';
import { getSessionImage } from '@/constants/session-images';
import { Colors, GradientMid } from '@/constants/theme';
import { exerciseThumbnailUrl } from '@/helpers/exercise-storage';
import { loadUnit } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSessionSummaryQuery } from '@/queries/use-session-summary-query';
import { useSessionThumbnailsQuery } from '@/queries/use-session-thumbnails-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Helpers ──────────────────────────────────────────────────────────────

function durationMinutes(start: string | null, end: string | null): number | null {
    if (!start || !end) return null;
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

/** Layout-treuer Platzhalter: Foto-Hero, StatsStrip, Übungs-Karten */
function SessionSummarySkeleton() {
    return (
        <>
            <Skeleton height={300} borderRadius={0} />
            <View style={styles.body}>
                <Skeleton height={72} borderRadius={16} />
                {[0, 1].map(block => (
                    <View key={block} style={styles.blockSection}>
                        <Skeleton width={150} height={22} borderRadius={8} />
                        {[0, 1].map(row => (
                            <Skeleton key={row} height={140} borderRadius={14} />
                        ))}
                    </View>
                ))}
            </View>
        </>
    );
}

// ── Screen ───────────────────────────────────────────────────────────────

export default function SessionSummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const insets = useSafeAreaInsets();

    const { data: session, isLoading } = useSessionSummaryQuery(id);
    const { data: remoteThumbnails } = useSessionThumbnailsQuery();

    const stats = useMemo(() => {
        if (!session) return null;
        let totalSets = 0;
        let totalExercises = 0;
        let totalVolume = 0;

        for (const block of session.blocks) {
            for (const ex of block.exercises) {
                if (ex.performed_sets.length > 0) totalExercises++;
                for (const set of ex.performed_sets) {
                    totalSets++;
                    if (set.performed_reps && set.performed_load_value) {
                        totalVolume += set.performed_reps * set.performed_load_value;
                    }
                }
            }
        }

        const actualDuration = durationMinutes(session.started_at, session.completed_at);

        return { totalSets, totalExercises, totalVolume, actualDuration };
    }, [session]);

    // Gleiche Bild-Logik wie Session-Card/-Detail: erste Übung des wichtigsten
    // Trainingsblocks bestimmt das Hero-Foto
    const heroImage = useMemo(() => {
        for (const type of ['primary', 'secondary', 'accessory']) {
            const block = session?.blocks.find(b => b.block_type?.slug === type);
            const first = block?.exercises[0]?.exercise;
            if (first) return getSessionImage(first.slug, first.image_group, remoteThumbnails);
        }
        return getSessionImage(null, null, remoteThumbnails);
    }, [session, remoteThumbnails]);

    // Parallax wie session-detail: Pull-down zoomt, Hochscrollen fadet aus
    const bannerHeight = insets.top + 230;
    const scrollY = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler(e => {
        scrollY.value = e.contentOffset.y;
    });
    const bannerStyle = useAnimatedStyle(() => {
        const y = scrollY.value;
        const scale = interpolate(y, [-bannerHeight, 0], [2, 1], Extrapolation.CLAMP);
        const opacity = interpolate(y, [0, bannerHeight * 0.55], [1, 0], Extrapolation.CLAMP);
        return { opacity, transform: [{ translateY: -y / 2 }, { scale }] };
    });

    if (isLoading) {
        return (
            <View style={[styles.root, { backgroundColor: theme.background }]}>
                <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={false}>
                    <SessionSummarySkeleton />
                </ScrollView>
                <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { top: insets.top + 8 }]}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </Pressable>
            </View>
        );
    }

    if (!session) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <View style={styles.centered}>
                    <JempText type="body-l" color={theme.textMuted}>{t('ui.session_not_found')}</JempText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={[styles.root, { backgroundColor: theme.background }]}>
            {/* ── Fixes Banner hinter der ScrollView ── */}
            <Animated.View style={[styles.fixedBanner, { height: bannerHeight }, bannerStyle]}>
                <Image
                    source={heroImage}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    contentPosition="center"
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']}
                    locations={[0, 0.55]}
                    style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                    colors={[`${theme.background}00`, theme.background]}
                    style={styles.bannerFade}
                    pointerEvents="none"
                />
            </Animated.View>

            <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Transparenter Spacer — hier scheint das fixe Banner durch */}
                <View style={{ height: bannerHeight - 108 }} />

                <View style={styles.heroTextBlock}>
                    <JempText type="caption" color={GradientMid} style={styles.heroLabelText}>
                        {t('ui.summary').toUpperCase()}
                    </JempText>
                    <JempText type="h1">{session.name}</JempText>
                    <View style={styles.heroChips}>
                        <SessionChip
                            icon={<Ionicons name="checkmark-circle" size={12} color={GradientMid} />}
                            label={t('ui.session_completed')}
                        />
                        {stats?.actualDuration ? (
                            <SessionChip
                                icon={<Ionicons name="time-outline" size={12} color={GradientMid} />}
                                label={`${stats.actualDuration} ${t('ui.min')}`}
                            />
                        ) : null}
                    </View>
                </View>

                <View style={styles.body}>
                    {/* ── Stats — Glass-Strip wie session-detail/profile ── */}
                    <StatsStrip
                        items={[
                            {
                                label: t('ui.duration'),
                                value: String(stats?.actualDuration ?? '–'),
                                unit: stats?.actualDuration ? t('ui.min') : undefined,
                            },
                            {
                                label: t('ui.exercises'),
                                value: String(stats?.totalExercises ?? 0),
                            },
                            {
                                label: t('ui.sets'),
                                value: String(stats?.totalSets ?? 0),
                            },
                            {
                                label: t('ui.total_volume'),
                                value: stats?.totalVolume ? Math.round(stats.totalVolume).toLocaleString() : '–',
                                unit: stats?.totalVolume ? 'kg' : undefined,
                            },
                        ]}
                    />

                    {/* ── Blocks ── */}
                    {session.blocks.map((block, blockIdx) => {
                        const performed = block.exercises.filter(ex => ex.performed_sets.length > 0);
                        if (performed.length === 0) return null;

                        return (
                            <View key={block.id} style={styles.blockSection}>
                                <SectionHeader
                                    label={block.block_type
                                        ? t(`block_type.${block.block_type.slug}`)
                                        : `Block ${blockIdx + 1}`}
                                />

                                {performed.map(ex => {
                                    const unit = loadUnit(ex.target_load_type);
                                    const thumbUrl = exerciseThumbnailUrl(ex.exercise.thumbnail_storage_path);

                                    return (
                                        <View key={ex.id} style={[styles.exerciseCard, { backgroundColor: theme.surface }]}>
                                            {/* Kopfzeile wie die Übungszeilen im Session-Detail */}
                                            <View style={styles.exerciseHeader}>
                                                <View style={styles.thumbWrap}>
                                                    <Image
                                                        source={thumbUrl
                                                            ? { uri: thumbUrl }
                                                            : require('@/assets/images/splash-icon.png')}
                                                        style={styles.thumb}
                                                        contentFit="cover"
                                                    />
                                                </View>
                                                <View style={styles.exerciseInfo}>
                                                    <JempText type="body-l" color={theme.text}>
                                                        {ex.exercise.name}
                                                    </JempText>
                                                    {ex.exercise.body_region && (
                                                        <JempText type="caption" color={theme.textMuted}>
                                                            {t(`body_region.${ex.exercise.body_region}`)}
                                                        </JempText>
                                                    )}
                                                </View>
                                            </View>

                                            {/* Set-Ergebnisse */}
                                            <View>
                                                <View style={styles.setHeaderRow}>
                                                    <JempText type="caption" color={theme.textMuted} style={styles.colSet}>
                                                        {t('ui.set')}
                                                    </JempText>
                                                    {unit !== '' && (
                                                        <JempText type="caption" color={theme.textMuted} style={styles.colValue}>
                                                            {t('ui.load')}
                                                        </JempText>
                                                    )}
                                                    <JempText type="caption" color={theme.textMuted} style={styles.colValue}>
                                                        {t('ui.reps')}
                                                    </JempText>
                                                </View>
                                                {ex.performed_sets.map((set, si) => (
                                                    <View
                                                        key={`${ex.id}-${si}`}
                                                        style={[styles.setRow, { borderTopColor: theme.borderDivider }]}
                                                    >
                                                        <JempText type="body-sm" color={theme.textMuted} style={styles.colSet}>
                                                            {set.set_number}
                                                            {set.side && set.side !== 'bilateral'
                                                                ? ` ${set.side === 'left' ? 'L' : 'R'}`
                                                                : ''}
                                                        </JempText>
                                                        {unit !== '' && (
                                                            <JempText type="body-sm" color={theme.text} style={styles.colValue}>
                                                                {set.performed_load_value != null
                                                                    ? `${set.performed_load_value} ${unit}`
                                                                    : '–'}
                                                            </JempText>
                                                        )}
                                                        <JempText type="body-sm" color={theme.text} style={styles.colValue}>
                                                            {set.performed_duration_seconds != null
                                                                ? `${set.performed_duration_seconds}s`
                                                                : set.performed_reps != null
                                                                    ? String(set.performed_reps)
                                                                    : '–'}
                                                        </JempText>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        );
                    })}
                </View>
            </Animated.ScrollView>

            {/* ── Floating back button (Glass) ── */}
            <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, { top: insets.top + 8 }]}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingBottom: 48 },
    body: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },

    backBtn: {
        position: 'absolute',
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },

    // Hero / Banner
    fixedBanner: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
    bannerFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
    heroTextBlock: { paddingHorizontal: 20, gap: 6 },
    heroChips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    heroLabelText: { letterSpacing: 1.5 },

    // Block
    blockSection: { gap: 10 },

    // Exercise card
    exerciseCard: {
        borderRadius: 14,
        padding: 12,
        gap: 10,
    },
    exerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    thumbWrap: {
        width: 44,
        height: 44,
        borderRadius: 10,
        overflow: 'hidden',
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    exerciseInfo: {
        flex: 1,
        gap: 2,
    },

    // Set grid
    setHeaderRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4 },
    setRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderTopWidth: 1 },
    colSet: { width: 44 },
    colValue: { flex: 1 },
});
