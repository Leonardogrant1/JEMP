import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GradientMid, Neutral } from '@/constants/theme';
import { formatLoad, formatReps, formatRest } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSessionDetailQuery, type SessionDetail } from '@/queries/use-session-detail-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function computeStats(session: SessionDetail) {
    let totalExercises = 0;
    for (const block of session.blocks) {
        totalExercises += block.exercises.length;
    }
    return { totalExercises };
}

const PLACEHOLDER_THUMB = require('@/assets/images/splash-icon.png');

// ── Screen ───────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { data: session, isLoading } = useSessionDetailQuery(id);
    const stats = useMemo(() => session ? computeStats(session) : null, [session]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.primary} />
                </View>
            </SafeAreaView>
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
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Back button ── */}
                <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={theme.text} />
                </Pressable>

                {/* ── Hero section ── */}
                <View style={styles.heroSection}>
                    <View style={[styles.heroLabel, { backgroundColor: `${GradientMid}20` }]}>
                        <JempText type="caption" color={GradientMid} style={styles.heroLabelText}>
                            {t(`session_type.${session.session_type}`).toUpperCase()}
                        </JempText>
                    </View>

                    <JempText type="hero">{session.name}</JempText>

                    {session.description && (
                        <JempText type="body-sm" color={theme.textMuted} style={styles.heroDesc}>
                            {session.description}
                        </JempText>
                    )}
                </View>

                {/* ── Stats grid ── */}
                <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCell}>
                            <JempText type="caption" color={theme.textMuted}>
                                {t('ui.duration').toUpperCase()}
                            </JempText>
                            <View style={styles.statValueRow}>
                                <JempText type="h1" gradient>
                                    {session.estimated_duration_minutes ?? '–'}
                                </JempText>
                                <JempText type="body-sm" color={theme.textMuted}>{t('ui.min')}</JempText>
                            </View>
                        </View>

                        <View style={styles.statCell}>
                            <JempText type="caption" color={theme.textMuted}>
                                {t('ui.exercises').toUpperCase()}
                            </JempText>
                            <View style={styles.statValueRow}>
                                <JempText type="h1" gradient>
                                    {stats?.totalExercises ?? 0}
                                </JempText>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── Blocks ── */}
                {session.blocks.map((block, blockIdx) => (
                    <View key={block.id} style={styles.blockSection}>
                        {/* Block header */}
                        <View style={styles.blockHeaderRow}>
                            <View>
                                <JempText type="h2">
                                    {block.block_type
                                        ? t(`block_type.${block.block_type.slug}`)
                                        : `Block ${blockIdx + 1}`}
                                </JempText>
                                {block.focused_category && (
                                    <JempText type="caption" color={theme.textMuted}>
                                        {t(`category.${block.focused_category.slug}`)}
                                    </JempText>
                                )}
                            </View>
                        </View>

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
                                    {/* Left: accent border */}
                                    <LinearGradient
                                        colors={[Cyan[500], Electric[500]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        style={styles.exerciseAccent}
                                    />

                                    {/* Thumbnail */}
                                    <View style={styles.thumbWrap}>
                                        <Image
                                            source={PLACEHOLDER_THUMB}
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
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 24 },

    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -8,
        marginTop: 4,
    },

    // Hero
    heroSection: { gap: 8 },
    heroLabel: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    heroLabelText: { letterSpacing: 1.5 },
    heroDesc: { marginTop: 4 },

    // Stats
    statsCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statCell: {
        flex: 1,
        gap: 4,
    },
    statValueRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
    },

    // Block
    blockSection: { gap: 10 },
    blockHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 2,
    },
    blockAccentBar: {
        width: 3,
        height: 28,
        borderRadius: 2,
    },

    // Exercise row
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 12,
        gap: 12,
        overflow: 'hidden',
    },
    exerciseAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderTopLeftRadius: 14,
        borderBottomLeftRadius: 14,
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
});
