import InfoIcon from '@/assets/icons/info.svg';
import { ExerciseVideoHero } from '@/components/exercise-video-hero';
import { JempText } from '@/components/jemp-text';
import { Skeleton } from '@/components/ui/skeleton';
import { CATEGORY_SVG_ICONS } from '@/constants/category-icons';
import { Colors, Cyan } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useExerciseDetailQuery } from '@/queries/use-exercise-detail-query';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExerciseDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { data: exercise, isLoading } = useExerciseDetailQuery(id);

    // Wenig Text-Content — das Video darf gut die halbe Höhe einnehmen
    const { height: windowHeight } = useWindowDimensions();
    const videoHeight = Math.round(windowHeight * 0.55);

    useEffect(() => {
        trackerManager.track('exercise_viewed', { exercise_id: id });
    }, []);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
                <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={false}>
                    {/* Layout-treues Skeleton: Video, Titel + Chips, Beschreibung, Sektion */}
                    <Skeleton height={videoHeight} borderRadius={0} />
                    <View style={styles.titleSection}>
                        <Skeleton width="65%" height={34} borderRadius={10} />
                        <View style={styles.metaRow}>
                            <Skeleton width={90} height={28} borderRadius={100} />
                            <Skeleton width={70} height={28} borderRadius={100} />
                        </View>
                    </View>
                    <View style={styles.section}>
                        <Skeleton height={72} borderRadius={16} />
                    </View>
                    <View style={styles.section}>
                        <Skeleton width={80} height={12} />
                        <View style={styles.chipRow}>
                            <Skeleton width={90} height={30} borderRadius={100} />
                            <Skeleton width={70} height={30} borderRadius={100} />
                        </View>
                    </View>
                </ScrollView>
                <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                    <View style={styles.backCircle}>
                        <Ionicons name="close" size={20} color="#fff" />
                    </View>
                </Pressable>
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

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Close button — fixed über dem Video */}
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                <View style={styles.backCircle}>
                    <Ionicons name="close" size={20} color="#fff" />
                </View>
            </Pressable>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Video Hero — fadet rein, dominiert den Screen ── */}
                <Animated.View entering={FadeIn.duration(450)}>
                    <ExerciseVideoHero
                        videoStoragePath={exercise.video_storage_path}
                        youtubeUrl={exercise.youtube_url}
                        thumbnailStoragePath={exercise.thumbnail_storage_path}
                        exerciseId={id}
                        height={videoHeight}
                    />
                </Animated.View>

                {/* ── Info-Box slidet von unten hoch ── */}
                <Animated.View entering={FadeInUp.duration(450).delay(120)} style={styles.infoBox}>

                {/* ── Title + Category + Level ── */}
                <View style={styles.titleSection}>
                    <JempText type="hero">{exercise.name}</JempText>
                    <View style={styles.metaRow}>
                        {exercise.category && (() => {
                            const CategoryIcon = CATEGORY_SVG_ICONS[exercise.category.slug];
                            return (
                                <View style={[styles.catBadge, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderCard }]}>
                                    {CategoryIcon && <CategoryIcon width={13} height={13} color={theme.textMuted} />}
                                    <JempText type="caption" color={theme.textMuted}>
                                        {t(`category.${exercise.category.slug}`)}
                                    </JempText>
                                </View>
                            );
                        })()}
                        <View style={[styles.catBadge, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderCard }]}>
                            <JempText type="caption" color={theme.textMuted}>
                                {`Lvl ${exercise.min_level} – ${exercise.max_level}`}
                            </JempText>
                        </View>
                        {exercise.body_region && (
                            <View style={[styles.catBadge, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderCard }]}>
                                <JempText type="caption" color={theme.textMuted}>
                                    {t(`body_region.${exercise.body_region}`)}
                                </JempText>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Description ── */}
                {description && (
                    <View style={[styles.descCard, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                        <InfoIcon width={18} height={18} color={Cyan[500]} />
                        <JempText type="body-sm" color={theme.textMuted} style={styles.descText}>
                            {description}
                        </JempText>
                    </View>
                )}

                {/* ── Equipment ── */}
                <View style={styles.section}>
                    <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>{t('ui.equipment').toUpperCase()}</JempText>
                    <View style={styles.chipRow}>
                        {hasEquipment ? (
                            exercise.equipments.map(eq => (
                                <View key={eq?.slug} style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                                    <JempText type="caption" color={theme.text}>
                                        {(eq?.name_i18n as Record<string, string> | null)?.[locale] ?? eq?.slug}
                                    </JempText>
                                </View>
                            ))
                        ) : (
                            <View style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                                <JempText type="caption" color={theme.text}>
                                    {t('load_type.bodyweight')}
                                </JempText>
                            </View>
                        )}
                    </View>
                </View>

                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingBottom: 48, gap: 20 },
    infoBox: { gap: 20 },

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
    catBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100,
    },

    descCard: {
        flexDirection: 'row',
        marginHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 10,
        alignItems: 'flex-start',
    },
    descText: { flex: 1, lineHeight: 20 },

    section: { paddingHorizontal: 20, gap: 10 },
    sectionLabel: { fontSize: 11, letterSpacing: 1 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
});
