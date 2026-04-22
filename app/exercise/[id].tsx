import { JempText } from '@/components/jemp-text';
import { Colors, Cyan, Electric } from '@/constants/theme';
import { levelLabel } from '@/helpers/format';
import { youtubeThumbUrl } from '@/helpers/youtube';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useExerciseDetailQuery } from '@/queries/use-exercise-detail-query';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PLACEHOLDER = require('@/assets/images/splash-icon.png');

export default function ExerciseDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { data: exercise, isLoading } = useExerciseDetailQuery(id);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.primary} />
                </View>
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

    const thumbUrl = exercise.youtube_url ? youtubeThumbUrl(exercise.youtube_url) : null;
    const hasEquipment = exercise.equipments.length > 0;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Video Hero ── */}
                <Pressable
                    style={styles.videoHero}
                    onPress={() => exercise.youtube_url && Linking.openURL(exercise.youtube_url)}
                    disabled={!exercise.youtube_url}
                >
                    <Image
                        source={thumbUrl ? { uri: thumbUrl } : PLACEHOLDER}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                        locations={[0.3, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                    {exercise.youtube_url && (
                        <View style={styles.playButton}>
                            <Ionicons name="play" size={32} color="#fff" />
                        </View>
                    )}
                </Pressable>

                {/* ── Back button (overlay) ── */}
                <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                    <View style={styles.backCircle}>
                        <Ionicons name="chevron-back" size={22} color="#fff" />
                    </View>
                </Pressable>

                {/* ── Title ── */}
                <View style={styles.titleSection}>
                    <JempText type="hero">{exercise.name}</JempText>
                    <View style={styles.tagRow}>
                        {exercise.body_region && (
                            <View style={[styles.tag, { backgroundColor: `${Cyan[500]}18` }]}>
                                <JempText type="caption" color={Cyan[500]}>
                                    {t(`body_region.${exercise.body_region}`)}
                                </JempText>
                            </View>
                        )}
                        {exercise.movement_pattern && (
                            <View style={[styles.tag, { backgroundColor: `${Electric[500]}18` }]}>
                                <JempText type="caption" color={Electric[500]}>
                                    {t(`movement_pattern.${exercise.movement_pattern}`)}
                                </JempText>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Description ── */}
                {exercise.description && (
                    <View style={styles.section}>
                        <JempText type="button" gradient>
                            {t('ui.description').toUpperCase()}
                        </JempText>
                        <JempText type="body-sm" color={theme.textMuted}>
                            {exercise.description}
                        </JempText>
                    </View>
                )}

                {/* ── Stats card ── */}
                <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.borderCard }]}>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCell}>
                            <JempText type="caption" color={theme.textMuted}>
                                {t('ui.difficulty').toUpperCase()}
                            </JempText>
                            <JempText type="h2" gradient>
                                {levelLabel(exercise.min_level, t)} – {levelLabel(exercise.max_level, t)}
                            </JempText>
                        </View>
                        {exercise.category && (
                            <View style={styles.statCell}>
                                <JempText type="caption" color={theme.textMuted}>
                                    {t('ui.category').toUpperCase()}
                                </JempText>
                                <JempText type="h2" gradient>
                                    {t(`category.${exercise.category.slug}`)}
                                </JempText>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Equipment ── */}
                <View style={styles.section}>
                    <JempText type="button" gradient>
                        {t('ui.equipment').toUpperCase()}
                    </JempText>
                    <View style={styles.chipRow}>
                        {hasEquipment ? (
                            exercise.equipments.map(slug => (
                                <View key={slug} style={[styles.chip, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="barbell-outline" size={13} color={Cyan[500]} />
                                    <JempText type="caption" color={theme.text}>
                                        {t(`equipment.${slug}`)}
                                    </JempText>
                                </View>
                            ))
                        ) : (
                            <View style={[styles.chip, { backgroundColor: theme.surface }]}>
                                <Ionicons name="body-outline" size={13} color={Cyan[500]} />
                                <JempText type="caption" color={theme.text}>
                                    {t('load_type.bodyweight')}
                                </JempText>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Block types (Used in) ── */}
                {exercise.block_types.length > 0 && (
                    <View style={styles.section}>
                        <JempText type="button" gradient>
                            {t('ui.used_in').toUpperCase()}
                        </JempText>
                        <View style={styles.chipRow}>
                            {exercise.block_types.map(slug => (
                                <View key={slug} style={styles.gradientChipWrap}>
                                    <LinearGradient
                                        colors={[`${Cyan[500]}20`, `${Electric[500]}20`]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientChip}
                                    >
                                        <JempText type="caption" color={Cyan[500]}>
                                            {t(`block_type.${slug}`)}
                                        </JempText>
                                    </LinearGradient>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Watch video CTA ── */}
                {exercise.youtube_url && (
                    <Pressable
                        style={styles.cta}
                        onPress={() => Linking.openURL(exercise.youtube_url!)}
                    >
                        <LinearGradient
                            colors={[Cyan[500], Electric[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.ctaGradient}
                        >
                            <Ionicons name="play-circle-outline" size={20} color="#fff" />
                            <JempText type="button" color="#fff">{t('ui.watch_video')}</JempText>
                        </LinearGradient>
                    </Pressable>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingBottom: 48, gap: 20 },

    // Video hero
    videoHero: {
        height: 240,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    // Back
    backBtn: {
        position: 'absolute',
        top: 56,
        left: 16,
        zIndex: 10,
    },
    backCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Title
    titleSection: { paddingHorizontal: 20, gap: 8 },
    tagRow: { flexDirection: 'row', gap: 8 },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },

    // Stats
    statsCard: {
        marginHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    statsGrid: { flexDirection: 'row', gap: 12 },
    statCell: { flex: 1, gap: 4 },

    // Sections
    section: { paddingHorizontal: 20, gap: 10 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    gradientChipWrap: { borderRadius: 10, overflow: 'hidden' },
    gradientChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
    },

    // CTA
    cta: { marginHorizontal: 20, borderRadius: 100, overflow: 'hidden' },
    ctaGradient: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
});
