import InfoIcon from '@/assets/icons/info.svg';
import { JempText } from '@/components/jemp-text';
import { UNIT_LABELS } from '@/constants/assessment-constants';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { estimateOneRepMax } from '@/helpers/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStopwatch } from '@/hooks/use-stopwatch';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useCompleteAssessment } from '@/mutations/use-complete-assessment';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useUserAssessmentQuery } from '@/queries/use-user-assessment-query';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Pressable, ScrollView,
    StyleSheet, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function lerpColor(a: string, b: string, t: number): string {
    const parse = (hex: string) => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
    const [ar, ag, ab] = parse(a);
    const [br, bg, bb] = parse(b);
    return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

function ratingToColor(rating: number): string {
    const t = (rating - 1) / 9;
    if (t <= 0.5) return lerpColor('#ef4444', '#f59e0b', t * 2);
    return lerpColor('#f59e0b', '#22c55e', (t - 0.5) * 2);
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AssessmentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const { data, isLoading } = useUserAssessmentQuery(id);
    const completeAssessment = useCompleteAssessment();
    const { openWithPlacement } = useSuperwallFunctions();
    const [value, setValue] = useState('');
    const [rating, setRating] = useState(5);
    const [mode, setMode] = useState<'manual' | 'timer'>('manual');
    const [repMode, setRepMode] = useState<'1rm' | '5rm'>('5rm');
    const stopwatch = useStopwatch();

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <View style={styles.centered}><ActivityIndicator color={theme.primary} /></View>
            </SafeAreaView>
        );
    }

    if (!data) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
                <View style={styles.centered}>
                    <JempText type="body-l" color={theme.textMuted}>{t('ui.exercise_not_found')}</JempText>
                </View>
            </SafeAreaView>
        );
    }


    const { assessment } = data;
    console.log(assessment)
    const locale = i18n.language;
    const assessmentName = (assessment.name_i18n as Record<string, string> | null)?.[locale] ?? assessment.name;
    const description = (assessment.description_i18n as Record<string, string> | null)?.[locale]
        ?? assessment.description
        ?? '';
    const metric = assessment.metric;
    const unitKey = metric?.unit ?? 'count';
    const unitLabel = UNIT_LABELS[unitKey]?.en ?? unitKey;
    const isTimeBased = unitKey === 's';
    const isKgBased = unitKey === 'kg';
    const isRatingBased = unitKey === 'rating';

    const rawSubmitValue = mode === 'timer'
        ? stopwatch.bestTime !== null ? String(stopwatch.bestTime) : ''
        : value;

    // For 5RM mode, compute estimated 1RM before submitting
    const submitValue = isKgBased && repMode === '5rm' && rawSubmitValue
        ? String(estimateOneRepMax(parseFloat(rawSubmitValue), 5))
        : rawSubmitValue;

    const estimated1RM = isKgBased && repMode === '5rm' && rawSubmitValue && !isNaN(parseFloat(rawSubmitValue))
        ? estimateOneRepMax(parseFloat(rawSubmitValue), 5)
        : null;

    const ratingColor = ratingToColor(rating);
    const ratingLabelKey = rating <= 3
        ? 'mobility.rating_strongly_restricted'
        : rating <= 6
            ? 'mobility.rating_restricted'
            : rating <= 9
                ? 'mobility.rating_good'
                : 'mobility.rating_full';

    const handleSubmit = () => {
        if (!profile?.id || !metric?.id) return;
        if (isRatingBased) {
            if (completeAssessment.isPending) return;
            completeAssessment.mutate({
                userAssessmentId: data.id,
                assessmentId: assessment.id,
                userId: profile.id,
                metricId: metric.id,
                value: rating,
                assessmentSlug: assessment.slug,
                categoryId: assessment.category_id,
                userProfile: {
                    gender: profile.gender as 'male' | 'female',
                    weight_kg: profile.weight_in_kg!,
                    height_cm: profile.height_in_cm!,
                    birth_date: profile.birth_date!,
                },
            }, {
                onSuccess: () => {
                    trackerManager.track('assessment_completed', {
                        assessment_slug: assessment.slug,
                        category_id: assessment.category_id,
                    });
                    router.back();
                },
            });
            return;
        }
        if (!submitValue.trim()) return;
        if (!profile.birth_date || !profile.weight_in_kg || !profile.height_in_cm || !profile.gender) return;
        if (completeAssessment.isPending) return;

        const numericValue = parseFloat(submitValue);
        if (isNaN(numericValue) || numericValue <= 0) return;

        completeAssessment.mutate({
            userAssessmentId: data.id,
            assessmentId: assessment.id,
            userId: profile.id,
            metricId: metric.id,
            value: numericValue,
            assessmentSlug: assessment.slug,
            categoryId: assessment.category_id,
            userProfile: {
                gender: profile.gender as 'male' | 'female',
                weight_kg: profile.weight_in_kg,
                height_cm: profile.height_in_cm,
                birth_date: profile.birth_date,
            },
        }, {
            onSuccess: () => {
                trackerManager.track('assessment_completed', {
                    assessment_slug: assessment.slug,
                    category_id: assessment.category_id,
                });
                router.back();
            },
        });
    };

    // Attempts sorted best (lowest) first, with original index kept
    const rankedAttempts = stopwatch.attempts
        .map((time, i) => ({ time, attempt: i + 1 }))
        .sort((a, b) => a.time - b.time);

    const displayElapsed = (stopwatch.elapsed / 1000).toFixed(2);

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} hitSlop={12}>
                        <Ionicons name="chevron-back" size={24} color={theme.text} />
                    </Pressable>
                    <JempText type="body-l" color={theme.text}>{assessmentName}</JempText>
                    <View style={{ width: 24 }} />
                </View>

                {/* Description */}
                <View style={[styles.descCard, { backgroundColor: theme.surface }]}>
                    <InfoIcon width={18} height={18} color={Cyan[500]} />
                    <JempText type="body-sm" color={theme.textMuted} style={styles.descText}>
                        {description}
                    </JempText>
                </View>

                {/* Equipment */}
                {assessment.equipments.length > 0 && (
                    <View style={styles.equipSection}>
                        <JempText type="caption" color={theme.textMuted}>
                            {t('ui.equipment').toUpperCase()}
                        </JempText>
                        <View style={styles.equipRow}>
                            {assessment.equipments.map((eq: { slug: string; name_i18n: unknown }) => (
                                <View key={eq.slug} style={[styles.equipChip, { backgroundColor: theme.surface }]}>
                                    <JempText type="caption" color={theme.text}>
                                        {(eq.name_i18n as Record<string, string> | null)?.[locale] ?? eq.slug}
                                    </JempText>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Rep mode toggle — only for kg-based */}
                {isKgBased && (
                    <View style={[styles.modeToggle, { backgroundColor: theme.surface }]}>
                        {(['5rm', '1rm'] as const).map(m => {
                            const active = repMode === m;
                            return (
                                <Pressable
                                    key={m}
                                    onPress={() => { setRepMode(m); setValue(''); }}
                                    style={[styles.modeBtn, active && styles.modeBtnActive]}
                                >
                                    {active && (
                                        <LinearGradient
                                            colors={[Cyan[500], Electric[500]]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <JempText type="button" color={active ? '#fff' : theme.textMuted}>
                                        {m === '5rm' ? t('ui.rep_mode_5rm') : t('ui.rep_mode_1rm')}
                                    </JempText>
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {/* 1RM safety warning */}
                {isKgBased && repMode === '1rm' && (
                    <View style={[styles.warningCard, { backgroundColor: `${'#f59e0b'}15` }]}>
                        <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                        <JempText type="body-sm" color="#f59e0b" style={styles.warningText}>
                            {t('ui.rep_mode_1rm_warning')}
                        </JempText>
                    </View>
                )}

                {/* Mode toggle — only for time-based */}
                {isTimeBased && (
                    <View style={[styles.modeToggle, { backgroundColor: theme.surface }]}>
                        {(['manual', 'timer'] as const).map(m => {
                            const active = mode === m;
                            return (
                                <Pressable
                                    key={m}
                                    onPress={() => { setMode(m); stopwatch.reset(); setValue(''); }}
                                    style={[styles.modeBtn, active && styles.modeBtnActive]}
                                >
                                    {active && (
                                        <LinearGradient
                                            colors={[Cyan[500], Electric[500]]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <Ionicons
                                        name={m === 'manual' ? 'create-outline' : 'timer-outline'}
                                        size={14}
                                        color={active ? '#fff' : theme.textMuted}
                                    />
                                    <JempText type="button" color={active ? '#fff' : theme.textMuted}>
                                        {m === 'manual' ? t('ui.assessment_mode_manual') : t('ui.assessment_mode_timer')}
                                    </JempText>
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {/* Rating slider — mobility assessments */}
                {isRatingBased && (
                    <View style={styles.ratingSection}>
                        <View style={styles.ratingHeader}>
                            <JempText type="h1" color={ratingColor} style={styles.ratingNumber}>
                                {rating}
                            </JempText>
                            <JempText type="body-l" color={ratingColor}>
                                {t(ratingLabelKey as any)}
                            </JempText>
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={1}
                            maximumValue={10}
                            step={1}
                            value={rating}
                            onValueChange={setRating}
                            minimumTrackTintColor={ratingColor}
                            maximumTrackTintColor={theme.borderStrong}
                            thumbTintColor={ratingColor}
                        />
                        <View style={styles.ratingLabels}>
                            <JempText type="caption" color={theme.textSubtle}>1</JempText>
                            <JempText type="caption" color={theme.textSubtle}>10</JempText>
                        </View>
                    </View>
                )}

                {/* Input section */}
                {!isRatingBased && mode === 'manual' ? (
                    <View style={styles.inputSection}>
                        <JempText type="h2">{t('ui.enter_result')}</JempText>
                        <JempText type="caption" color={theme.textMuted}>
                            {isKgBased && repMode === '5rm' ? t('ui.rep_mode_5rm_label') : unitLabel.toUpperCase()}
                        </JempText>
                        <View style={[styles.pillInput, { backgroundColor: theme.surface }]}>
                            <TextInput
                                style={[styles.pillTextInput, { color: theme.text }]}
                                value={value}
                                onChangeText={setValue}
                                keyboardType="decimal-pad"
                                placeholder="–"
                                placeholderTextColor={theme.textPlaceholder}
                            />
                        </View>
                        {estimated1RM !== null && (
                            <View style={[styles.estimateRow, { backgroundColor: theme.surface }]}>
                                <JempText type="caption" color={theme.textMuted}>{t('ui.estimated_1rm')}</JempText>
                                <JempText type="body-l" color={GradientMid}>≈ {estimated1RM} kg</JempText>
                            </View>
                        )}
                    </View>
                ) : !isRatingBased ? (
                    <View style={styles.timerSection}>
                        {/* Elapsed display */}
                        <View style={[styles.timerDisplay, { backgroundColor: theme.surface }]}>
                            <JempText type="hero" style={styles.timerDigits} color={stopwatch.isRunning ? Cyan[400] : theme.text}>
                                {stopwatch.isRunning ? displayElapsed : '0.00'}
                            </JempText>
                            <JempText type="caption" color={theme.textMuted}>{t('ui.timer_seconds')}</JempText>
                        </View>

                        {/* Start / Stop */}
                        <Pressable
                            style={styles.timerBtn}
                            onPress={stopwatch.isRunning ? stopwatch.stop : stopwatch.start}
                        >
                            <LinearGradient
                                colors={stopwatch.isRunning
                                    ? ['#ef4444', '#dc2626']
                                    : [Cyan[500], Electric[500]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.timerBtnGradient}
                            >
                                <Ionicons
                                    name={stopwatch.isRunning ? 'stop' : 'play'}
                                    size={20}
                                    color="#fff"
                                />
                                <JempText type="button" color="#fff">
                                    {stopwatch.isRunning
                                        ? t('ui.timer_stop')
                                        : stopwatch.attempts.length > 0 ? t('ui.timer_new_attempt') : t('ui.timer_start')}
                                </JempText>
                            </LinearGradient>
                        </Pressable>

                        {/* Attempts ranked list */}
                        {rankedAttempts.length > 0 && (
                            <View style={styles.attemptsList}>
                                {rankedAttempts.map((item, rank) => {
                                    const isBest = rank === 0;
                                    return (
                                        <View
                                            key={item.attempt}
                                            style={[
                                                styles.attemptRow,
                                                { backgroundColor: theme.surface },
                                                isBest && styles.attemptRowBest,
                                            ]}
                                        >
                                            <View style={styles.attemptLeft}>
                                                {isBest
                                                    ? <Ionicons name="trophy" size={14} color={Cyan[400]} />
                                                    : <JempText type="caption" color={theme.textMuted} style={styles.attemptRank}>
                                                        #{rank + 1}
                                                    </JempText>
                                                }
                                                <JempText type="caption" color={isBest ? theme.text : theme.textMuted}>
                                                    {t('ui.timer_attempt', { n: item.attempt })}
                                                </JempText>
                                            </View>
                                            <JempText
                                                type="body-l"
                                                color={isBest ? Cyan[400] : theme.textMuted}
                                                style={styles.attemptTime}
                                            >
                                                {item.time.toFixed(2)}s
                                            </JempText>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                ) : null}
            </ScrollView>

            {/* CTA */}
            <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
                <Pressable
                    style={styles.submitBtn}
                    onPress={() => openWithPlacement('log_assessment', handleSubmit)}
                    disabled={(!isRatingBased && !submitValue) || completeAssessment.isPending}
                >
                    <LinearGradient
                        colors={submitValue ? [Cyan[500], Electric[500]] : [`${Cyan[500]}40`, `${Electric[500]}40`]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitBtnGradient}
                    >
                        {completeAssessment.isPending ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <JempText type="button" color="#fff">{t('ui.save_result')}</JempText>
                        )}
                    </LinearGradient>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 20 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },

    descCard: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 14,
        gap: 10,
        alignItems: 'flex-start',
    },
    descText: { flex: 1 },

    equipSection: { gap: 8 },
    equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    equipChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 100,
    },

    // Warning
    warningCard: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 14,
        gap: 10,
        alignItems: 'flex-start',
    },
    warningText: { flex: 1, lineHeight: 20 },

    // Estimate preview
    estimateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        width: '100%',
    },

    // Mode toggle
    modeToggle: {
        flexDirection: 'row',
        borderRadius: 100,
        overflow: 'hidden',
        padding: 4,
        gap: 4,
    },
    modeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 100,
        overflow: 'hidden',
    },
    modeBtnActive: {},

    // Rating slider
    ratingSection: { gap: 8, paddingTop: 12 },
    ratingHeader: { alignItems: 'center', gap: 4 },
    ratingNumber: { fontSize: 56, lineHeight: 64, fontWeight: '700', letterSpacing: -2 },
    slider: { width: '100%', height: 40, marginHorizontal: -8 },
    ratingLabels: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 4 },

    // Manual input
    inputSection: { alignItems: 'center', gap: 8, paddingTop: 12 },
    pillInput: {
        borderRadius: 16,
        width: '100%',
        height: 72,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pillTextInput: {
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        width: '100%',
        height: '100%',
    },

    // Timer
    timerSection: { gap: 14 },
    timerDisplay: {
        borderRadius: 20,
        paddingVertical: 28,
        alignItems: 'center',
        gap: 4,
    },
    timerDigits: {
        fontSize: 56,
        lineHeight: 64,
        letterSpacing: -2,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    timerBtn: { borderRadius: 100, overflow: 'hidden' },
    timerBtnGradient: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },

    attemptsList: { gap: 8 },
    attemptRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    attemptRowBest: {
        borderWidth: 1,
        borderColor: `${Cyan[500]}40`,
    },
    attemptLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    attemptRank: { width: 24 },
    attemptTime: { fontWeight: '700', letterSpacing: -0.5 },

    // CTA
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 34,
        paddingTop: 12,
    },
    submitBtn: { borderRadius: 100, overflow: 'hidden' },
    submitBtnGradient: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
