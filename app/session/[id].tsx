import { JempText } from '@/components/jemp-text';
import { SectionHeader } from '@/components/plan/SectionHeader';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { CategoryChip, ModeChip, SessionChip } from '@/components/plan/SessionChip';
import { StatsStrip } from '@/components/profile/stats-strip';
import { Skeleton } from '@/components/ui/skeleton';
import { getSessionImage } from '@/constants/session-images';
import { Colors, GradientMid, Neutral } from '@/constants/theme';
import { exerciseThumbnailUrl } from '@/helpers/exercise-storage';
import { formatLoad, formatReps, formatRest } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { usePlan } from '@/providers/plan-provider';
import { useSessionDetailQuery, type SessionDetail } from '@/queries/use-session-detail-query';
import { useSessionThumbnailsQuery } from '@/queries/use-session-thumbnails-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
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

function computeStats(session: SessionDetail) {
    let totalExercises = 0;
    for (const block of session.blocks) {
        totalExercises += block.exercises.length;
    }
    return { totalExercises };
}

/** Layout-treuer Platzhalter: Foto-Hero, Stats-Card, zwei Blöcke mit Übungszeilen */
function SessionDetailSkeleton() {
    return (
        <>
            <Skeleton height={300} borderRadius={0} />
            <View style={styles.body}>
                <Skeleton height={92} borderRadius={16} />
                {[0, 1].map(block => (
                    <View key={block} style={styles.blockSection}>
                        <Skeleton width={150} height={22} borderRadius={8} />
                        {[0, 1, 2].map(row => (
                            <View key={row} style={styles.skeletonRow}>
                                <Skeleton width={52} height={52} borderRadius={10} />
                                <View style={styles.skeletonRowText}>
                                    <Skeleton width="65%" height={14} />
                                    <Skeleton width="40%" height={10} />
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        </>
    );
}

// ── Screen ───────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { data: session, isLoading } = useSessionDetailQuery(id);
    const stats = useMemo(() => session ? computeStats(session) : null, [session]);

    const insets = useSafeAreaInsets();
    const { planSessions } = usePlan();
    const { data: remoteThumbnails } = useSessionThumbnailsQuery();

    // Gleiche Bild-Logik wie die Session-Cards im Plan: erste Übung des
    // wichtigsten Trainingsblocks bestimmt das Hero-Foto
    const heroImage = useMemo(() => {
        for (const type of ['primary', 'secondary', 'accessory']) {
            const block = session?.blocks.find(b => b.block_type?.slug === type);
            const first = block?.exercises[0]?.exercise;
            if (first) return getSessionImage(first.slug, first.image_group, remoteThumbnails);
        }
        return getSessionImage(null, null, remoteThumbnails);
    }, [session, remoteThumbnails]);

    const modeSlug = session?.workout_plan_session_id
        ? planSessions.find(ps => ps.id === session.workout_plan_session_id)?.mode_slug ?? null
        : null;

    // Fokus-Kategorien der Trainingsblöcke für die Hero-Chips (max. 2, dedupliziert)
    const focusCategories = useMemo(() => {
        const slugs: string[] = [];
        for (const b of session?.blocks ?? []) {
            if (!['primary', 'secondary'].includes(b.block_type?.slug ?? '')) continue;
            const slug = b.focused_category?.slug;
            if (slug && !slugs.includes(slug)) slugs.push(slug);
        }
        return slugs.slice(0, 2);
    }, [session]);

    // Parallax wie beim Profil-Banner: Pull-down zoomt (Oberkante bleibt fixiert),
    // Hochscrollen bewegt das Banner mit halber Geschwindigkeit weg und fadet es aus
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

    useEffect(() => {
        trackerManager.track('session_details_opened', { session_id: id });
    }, []);


    if (isLoading) {
        return (
            <View style={[styles.root, { backgroundColor: theme.background }]}>
                <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={false}>
                    <SessionDetailSkeleton />
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
            {/* ── Fixes Banner hinter der ScrollView — Bild wie auf der Session-Card ── */}
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
                        {t(`session_type.${session.session_type}`).toUpperCase()}
                    </JempText>
                    <JempText type="h1">{session.name}</JempText>
                    <View style={styles.heroChips}>
                        {session.estimated_duration_minutes ? (
                            <SessionChip
                                icon={<Ionicons name="time-outline" size={12} color={GradientMid} />}
                                label={`${session.estimated_duration_minutes} min`}
                            />
                        ) : null}
                        <ModeChip mode={modeSlug} />
                        {focusCategories.map(slug => (
                            <CategoryChip key={slug} slug={slug} />
                        ))}
                    </View>
                </View>

                <View style={styles.body}>

                {session.description && (
                    <JempText type="body-sm" color={theme.textMuted} style={styles.heroDesc}>
                        {session.description}
                    </JempText>
                )}

                {/* ── Stats — Glass-Strip wie in profile.tsx ── */}
                <StatsStrip
                    items={[
                        {
                            label: t('ui.duration'),
                            value: String(session.estimated_duration_minutes ?? '–'),
                            unit: session.estimated_duration_minutes ? t('ui.min') : undefined,
                        },
                        {
                            label: t('ui.exercises'),
                            value: String(stats?.totalExercises ?? 0),
                        },
                    ]}
                />

                {/* ── Blocks ── */}
                {session.blocks.map((block, blockIdx) => (
                    <View key={block.id} style={styles.blockSection}>
                        {/* Block header — Kategorie (mit Icon) nur bei den Trainingsblöcken */}
                        {(() => {
                            const isMainBlock = ['primary', 'secondary', 'accessory'].includes(block.block_type?.slug ?? '');
                            const categorySlug = isMainBlock ? block.focused_category?.slug : undefined;
                            const CategoryIcon = categorySlug ? CATEGORY_SVG_ICONS[categorySlug] : undefined;
                            return (
                                <SectionHeader
                                    label={block.block_type
                                        ? t(`block_type.${block.block_type.slug}`)
                                        : `Block ${blockIdx + 1}`}
                                    caption={categorySlug ? t(`category.${categorySlug}`) : undefined}
                                    captionIcon={CategoryIcon
                                        ? <CategoryIcon width={14} height={14} color={theme.textMuted} />
                                        : undefined}
                                />
                            );
                        })()}

                        {/* Exercise rows */}
                        {block.exercises.map((ex, exIdx) => {
                            const reps = formatReps(ex, t);
                            const load = formatLoad(ex, t);
                            const rest = formatRest(ex.target_rest_seconds);

                            return (
                                <Pressable
                                    key={ex.id}
                                    style={[styles.exerciseRow, { backgroundColor: theme.surface }]}
                                    onPress={() => router.push(`/exercise/${ex.exercise.id}`)}
                                >
                                    {/* Thumbnail */}
                                    <View style={styles.thumbWrap}>
                                        <Image
                                            source={
                                                ex.exercise.thumbnail_storage_path
                                                    ? { uri: exerciseThumbnailUrl(ex.exercise.thumbnail_storage_path)! }
                                                    : require('@/assets/images/splash-icon.png')
                                            }
                                            style={styles.thumb}
                                            contentFit="cover"
                                        />
                                        <View style={styles.thumbIndex}>
                                            <JempText type="caption" color="#fff">
                                                {String(exIdx + 1)}
                                            </JempText>
                                        </View>
                                    </View>

                                    {/* Info */}
                                    <View style={styles.exerciseInfo}>
                                        <JempText type="body-l" color={theme.text}>
                                            {ex.exercise.name}
                                        </JempText>
                                        {ex.exercise.body_region && (
                                            <JempText type="caption" color={theme.textMuted}>
                                                {t(`body_region.${ex.exercise.body_region}`)}
                                            </JempText>
                                        )}
                                        <View style={styles.exerciseMeta}>
                                            {ex.target_sets && (
                                                <JempText type="caption" color={theme.textSubtle}>
                                                    {ex.target_sets} {t('ui.sets')}
                                                </JempText>
                                            )}
                                            {reps !== '' && (
                                                <>
                                                    <JempText type="caption" color={Neutral[7]}>{'  ·  '}</JempText>
                                                    <JempText type="caption" color={theme.textSubtle}>
                                                        {reps}
                                                    </JempText>
                                                </>
                                            )}
                                            {rest && (
                                                <>
                                                    <JempText type="caption" color={Neutral[7]}>{'  ·  '}</JempText>
                                                    <Ionicons name="timer-outline" size={10} color={theme.textSubtle} />
                                                    <JempText type="caption" color={theme.textSubtle}>
                                                        {' '}{rest}
                                                    </JempText>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
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
    heroDesc: { marginTop: -4 },

    // Block
    blockSection: { gap: 10 },

    // Exercise row
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 12,
        gap: 12,
        overflow: 'hidden',
    },
    thumbWrap: {
        width: 52,
        height: 52,
        borderRadius: 10,
        overflow: 'hidden',
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    thumbIndex: {
        position: 'absolute',
        bottom: 2,
        left: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 6,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    exerciseInfo: {
        flex: 1,
        gap: 2,
    },
    exerciseMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },

    // Skeleton
    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    skeletonRowText: { flex: 1, gap: 8 },
});
