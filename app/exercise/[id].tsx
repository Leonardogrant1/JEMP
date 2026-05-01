import InfoIcon from '@/assets/icons/info.svg';
import { ExerciseVideoHero } from '@/components/exercise-video-hero';
import { JempText } from '@/components/jemp-text';
import { getCategoryMeta } from '@/constants/categories';
import { Colors, Cyan } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useExerciseDetailQuery } from '@/queries/use-exercise-detail-query';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExerciseDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { data: exercise, isLoading } = useExerciseDetailQuery(id);

    useEffect(() => {
        trackerManager.track('exercise_viewed', { exercise_id: id });
    }, []);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <View style={styles.centered}><ActivityIndicator color={theme.primary} /></View>
            </SafeAreaView>
        );
    }

    if (!exercise) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <View style={styles.centered}>
                    <JempText type="body-l" color={theme.textMuted}>{t('ui.exercise_not_found')}</JempText>
                </View>
            </SafeAreaView>
        );
    }

    const locale = i18n.language;
    const i18nMap = exercise.description_i18n as Record<string, string> | null;
    const description = i18nMap?.[locale] ?? i18nMap?.['en'] ?? exercise.description ?? null;
    const hasEquipment = exercise.equipments.length > 0;
    const cat = exercise.category ? getCategoryMeta(exercise.category.slug) : null;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Back button — fixed, outside scroll */}
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                <View style={styles.backCircle}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </View>
            </Pressable>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Video Hero ── */}
                <ExerciseVideoHero
                    videoStoragePath={exercise.video_storage_path}
                    youtubeUrl={exercise.youtube_url}
                    thumbnailStoragePath={exercise.thumbnail_storage_path}
                    exerciseId={id}
                />

                {/* ── Title + Category + Level ── */}
                <View style={styles.titleSection}>
                    <JempText type="hero">{exercise.name}</JempText>
                    <View style={styles.metaRow}>
                        {cat && (
                            <View style={[styles.catBadge, { backgroundColor: `${cat.color}20` }]}>
                                <JempText type="caption" color={cat.color}>
                                    {t(`category.${exercise.category!.slug}`)}
                                </JempText>
                            </View>
                        )}
                        <View style={[styles.catBadge, { backgroundColor: theme.surface }]}>
                            <JempText type="caption" color={theme.textMuted}>
                                {`Lvl ${exercise.min_level} – ${exercise.max_level}`}
                            </JempText>
                        </View>
                        {exercise.body_region && (
                            <View style={[styles.catBadge, { backgroundColor: theme.surface }]}>
                                <JempText type="caption" color={theme.textMuted}>
                                    {t(`body_region.${exercise.body_region}`)}
                                </JempText>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Description ── */}
                {description && (
                    <View style={[styles.descCard, { backgroundColor: theme.surface }]}>
                        <InfoIcon width={18} height={18} color={Cyan[500]} />
                        <JempText type="body-sm" color={theme.textMuted} style={styles.descText}>
                            {description}
                        </JempText>
                    </View>
                )}

                {/* ── Equipment ── */}
                <View style={styles.section}>
                    <JempText type="caption" color={theme.textMuted}>{t('ui.equipment').toUpperCase()}</JempText>
                    <View style={styles.chipRow}>
                        {hasEquipment ? (
                            exercise.equipments.map(eq => (
                                <View key={eq?.slug} style={[styles.chip, { backgroundColor: theme.surface }]}>
                                    <JempText type="caption" color={theme.text}>
                                        {(eq?.name_i18n as Record<string, string> | null)?.[locale] ?? eq?.slug}
                                    </JempText>
                                </View>
                            ))
                        ) : (
                            <View style={[styles.chip, { backgroundColor: theme.surface }]}>
                                <JempText type="caption" color={theme.text}>
                                    {t('load_type.bodyweight')}
                                </JempText>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Block types ── */}
                {exercise.block_types.length > 0 && (
                    <View style={styles.section}>
                        <JempText type="caption" color={theme.textMuted}>{t('ui.block_types').toUpperCase()}</JempText>
                        <View style={styles.chipRow}>
                            {exercise.block_types.map(slug => (
                                <View key={slug} style={[styles.chip, { backgroundColor: theme.surface }]}>
                                    <JempText type="caption" color={theme.text}>
                                        {t(`block_type.${slug}`)}
                                    </JempText>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingBottom: 48, gap: 20 },

    backBtn: { position: 'absolute', top: 56, left: 16, zIndex: 10 },
    backCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    titleSection: { paddingHorizontal: 20, gap: 10 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },

    descCard: {
        flexDirection: 'row',
        marginHorizontal: 20,
        borderRadius: 14,
        padding: 14,
        gap: 10,
        alignItems: 'flex-start',
    },
    descText: { flex: 1 },

    section: { paddingHorizontal: 20, gap: 10 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },

});
