import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { loadUnit } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSessionSummaryQuery } from '@/queries/use-session-summary-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Helpers ──────────────────────────────────────────────────────────────

function durationMinutes(start: string | null, end: string | null): number | null {
    if (!start || !end) return null;
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

// ── Screen ───────────────────────────────────────────────────────────────

export default function SessionSummaryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { data: session, isLoading } = useSessionSummaryQuery(id);

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
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} hitSlop={12}>
                        <Ionicons name="chevron-back" size={24} color={theme.text} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <JempText type="caption" color={GradientMid}>
                            {t('ui.summary').toUpperCase()}
                        </JempText>
                    </View>
                    <View style={{ width: 24 }} />
                </View>

                {/* ── Title ── */}
                <View style={styles.titleSection}>
                    <View style={styles.completedIcon}>
                        <Ionicons name="checkmark-circle" size={36} color={GradientMid} />
                    </View>
                    <JempText type="hero">{session.name}</JempText>
                    <JempText type="body-sm" color={theme.textMuted}>
                        {t(`session_type.${session.session_type}`)}
                    </JempText>
                </View>

                {/* ── Stats card ── */}
                <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                    <View style={styles.statsGrid}>
                        {/* Top-left: Dauer */}
                        <View style={[styles.statCell, { borderRightColor: theme.borderDivider, borderBottomColor: theme.borderDivider }]}>
                            <JempText type="caption" color={theme.textMuted}>{t('ui.duration').toUpperCase()} ({t('ui.min')})</JempText>
                            <View style={styles.statValueRow}>
                                <JempText type="h1" gradient>{stats?.actualDuration ?? '–'}</JempText>
                            </View>
                        </View>
                        {/* Top-right: Übungen */}
                        <View style={[styles.statCell, { borderRightWidth: 0, borderBottomColor: theme.borderDivider }]}>
                            <JempText type="caption" color={theme.textMuted}>{t('ui.exercises').toUpperCase()}</JempText>
                            <View style={styles.statValueRow}>
                                <JempText type="h1" gradient>{stats?.totalExercises ?? 0}</JempText>
                            </View>
                        </View>
                        {/* Bottom-left: Sätze */}
                        <View style={[styles.statCell, { borderRightColor: theme.borderDivider, borderBottomWidth: 0 }]}>
                            <JempText type="caption" color={theme.textMuted}>{t('ui.sets').toUpperCase()}</JempText>
                            <View style={styles.statValueRow}>
                                <JempText type="h1" gradient>{stats?.totalSets ?? 0}</JempText>
                            </View>
                        </View>
                        {/* Bottom-right: Volumen */}
                        <View style={[styles.statCell, { borderRightWidth: 0, borderBottomWidth: 0 }]}>
                            <JempText type="caption" color={theme.textMuted}>{t('ui.total_volume').toUpperCase()}</JempText>
                            <View style={styles.statValueRow}>
                                <JempText type="h1" gradient>
                                    {stats?.totalVolume ? Math.round(stats.totalVolume).toLocaleString() : '–'}
                                </JempText>
                                {stats?.totalVolume ? (
                                    <JempText type="body-sm" color={theme.textMuted}>kg</JempText>
                                ) : null}
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── Blocks with exercises ── */}
                {session.blocks.map((block, blockIdx) => {
                    const hasPerformed = block.exercises.some(ex => ex.performed_sets.length > 0);
                    if (!hasPerformed) return null;

                    return (
                        <View key={block.id} style={styles.blockSection}>
                            <View style={styles.blockHeaderRow}>
                                <LinearGradient
                                    colors={[Cyan[500], Electric[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0, y: 1 }}
                                    style={styles.blockAccentBar}
                                />
                                <JempText type="button" gradient>
                                    {block.block_type
                                        ? t(`block_type.${block.block_type.slug}`).toUpperCase()
                                        : `BLOCK ${blockIdx + 1}`}
                                </JempText>
                            </View>

                            <View style={styles.exerciseGrid}>
                            {block.exercises.map(ex => {
                                if (ex.performed_sets.length === 0) return null;
                                const unit = loadUnit(ex.target_load_type);

                                return (
                                    <View key={ex.id} style={[styles.exerciseCard, { backgroundColor: theme.surface }]}>
                                        <View style={styles.exerciseHeader}>
                                            <View style={styles.exerciseNameWrap}>
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

                                        {/* Set results */}
                                        <View style={styles.setGrid}>
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
                                            {ex.performed_sets.map(set => (
                                                <View
                                                    key={set.set_number}
                                                    style={[styles.setRow, { borderTopColor: theme.borderDivider }]}
                                                >
                                                    <JempText type="body-sm" color={theme.textMuted} style={styles.colSet}>
                                                        {set.set_number}
                                                    </JempText>
                                                    {unit !== '' && (
                                                        <JempText type="body-sm" color={theme.text} style={styles.colValue}>
                                                            {set.performed_load_value != null
                                                                ? `${set.performed_load_value} ${unit}`
                                                                : '–'}
                                                        </JempText>
                                                    )}
                                                    <JempText type="body-sm" color={theme.text} style={styles.colValue}>
                                                        {set.performed_reps ?? '–'}
                                                    </JempText>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                );
                            })}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 20 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    headerCenter: { flex: 1, alignItems: 'center' },

    titleSection: { alignItems: 'center', gap: 6 },
    completedIcon: { marginBottom: 4 },

    // Stats
    statsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    statCell: { width: '50%', padding: 16, gap: 4, alignItems: 'center', borderRightWidth: 1, borderBottomWidth: 1, },
    statValueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 },
    volumeRow: { borderTopWidth: 1, paddingTop: 12, alignItems: 'center', gap: 4 },

    // Blocks
    blockSection: { gap: 8 },
    blockHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    blockAccentBar: { width: 3, height: 24, borderRadius: 2 },

    // Exercise grid + card
    exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    exerciseCard: { width: '48%', borderRadius: 14, padding: 12, gap: 8 },
    exerciseHeader: { flexDirection: 'row', alignItems: 'center' },
    exerciseNameWrap: { flex: 1, gap: 2 },

    // Set grid
    setGrid: { gap: 0 },
    setHeaderRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4 },
    setRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderTopWidth: 1 },
    colSet: { width: 36 },
    colValue: { flex: 1 },
});
