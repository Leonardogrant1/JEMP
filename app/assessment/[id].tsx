import InfoIcon from '@/assets/icons/info.svg';
import { JempText } from '@/components/jemp-text';
import { JempDialog } from '@/components/ui/jemp-dialog';
import { NumberWheel } from '@/components/ui/number-wheel';
import { Skeleton } from '@/components/ui/skeleton';
import { SuccessOverlay } from '@/components/ui/success-overlay';
import { VideoDialog } from '@/components/ui/video-dialog';
import { assessmentVideoUrl } from '@/helpers/assessment-storage';
import { TapeMeasure } from '@/components/ui/tape-measure';
import { useModalResultStore } from '@/stores/modal-result-store';
import { REP_RAIL_DEFAULT_MAX, REP_RAIL_MAX, TAPE_DEFAULT_MAX_CM, TAPE_MAX_CM, UNIT_LABELS } from '@/constants/assessment-constants';
import { Colors, Cyan, Electric, GradientMid } from '@/constants/theme';
import { displayMetricValue, estimateOneRepMax, kgToLbs } from '@/helpers/units';
import { useUnitSystem } from '@/hooks/use-unit-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStopwatch } from '@/hooks/use-stopwatch';
import { trackerManager } from '@/lib/tracking/tracker-manager';
import { useCompleteAssessment } from '@/mutations/use-complete-assessment';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useLastAssessmentResultQuery } from '@/queries/use-last-assessment-result-query';
import { useUserAssessmentQuery } from '@/queries/use-user-assessment-query';
import { useSuperwallFunctions } from '@/services/purchases/superwall/useSuperwall';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Pressable,
    StyleSheet, View,
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
    const { data: lastResult } = useLastAssessmentResultQuery(profile?.id, data?.assessment?.id);
    const completeAssessment = useCompleteAssessment();
    const { openWithPlacement } = useSuperwallFunctions();
    const [rating, setRating] = useState(5);
    const [mode, setMode] = useState<'manual' | 'timer'>('manual');
    const [repMode, setRepMode] = useState<'1rm' | '5rm'>('5rm');
    const [tapeCm, setTapeCm] = useState(0);
    const [repCount, setRepCount] = useState(0);
    const [secInt, setSecInt] = useState(0);
    const [secTenth, setSecTenth] = useState(0);
    const [weightMain, setWeightMain] = useState(0);
    const [weightTenth, setWeightTenth] = useState(0);
    const unitSystem = useUnitSystem();
    // Units follow the profile preference — no in-screen toggles
    const weightUnit: 'kg' | 'lbs' = unitSystem === 'imperial' ? 'lbs' : 'kg';
    const [showOneRmWarning, setShowOneRmWarning] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const { assessmentConfirmed, setAssessmentConfirmed } = useModalResultStore();

    useFocusEffect(useCallback(() => {
        if (assessmentConfirmed) {
            setAssessmentConfirmed(false);
            openWithPlacement('log_assessment', handleSubmit);
        }
    }, [assessmentConfirmed]));
    const stopwatch = useStopwatch();

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
                <View style={styles.scroll}>
                    <View style={styles.header}>
                        <Pressable onPress={() => router.back()} hitSlop={12}>
                            <Ionicons name="chevron-back" size={24} color={theme.text} />
                        </Pressable>
                        <Skeleton width={150} height={20} borderRadius={10} />
                        <Skeleton width={22} height={22} borderRadius={11} />
                    </View>
                    <View style={styles.content}>
                        <View style={styles.skeletonRow}>
                            <Skeleton width={96} height={30} borderRadius={100} />
                            <Skeleton width={120} height={30} borderRadius={100} />
                        </View>
                        <Skeleton height={46} borderRadius={12} />
                        <Skeleton height={44} borderRadius={100} />
                        <Skeleton height={220} borderRadius={14} />
                    </View>
                </View>
                <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
                    <Skeleton height={52} borderRadius={100} />
                </View>
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
    const locale = i18n.language;
    const assessmentName = (assessment.name_i18n as Record<string, string> | null)?.[locale] ?? assessment.name;
    const description = (assessment.description_i18n as Record<string, string> | null)?.[locale]
        ?? assessment.description
        ?? '';
    const metric = assessment.metric;
    const unitKey = metric?.unit ?? 'count';
    const isTimeBased = unitKey === 's';
    const isKgBased = unitKey === 'kg';
    const isRatingBased = unitKey === 'rating';
    const isCmBased = unitKey === 'cm';
    const isCountBased = unitKey === 'count';
    const repMax = REP_RAIL_MAX[assessment.slug] ?? REP_RAIL_DEFAULT_MAX;

    const localeUnit = locale === 'de' ? 'de' : 'en';
    const formatMetricValue = (v: number) => {
        if (isRatingBased) return `${v}/10`;
        const converted = displayMetricValue(v, unitKey, unitSystem);
        return `${converted.value} ${UNIT_LABELS[converted.unit ?? '']?.[localeUnit] ?? converted.unit ?? ''}`;
    };

    const weightDisplay = weightMain + weightTenth / 10;
    const weightKgValue = weightUnit === 'kg' ? weightDisplay : Math.round((weightDisplay / 2.2046) * 10) / 10;

    // Long tapes (med ball throws) measure in m/ft, short ones (jumps) in cm/inch.
    // The unit follows the profile preference.
    const tapeMaxCm = TAPE_MAX_CM[assessment.slug] ?? TAPE_DEFAULT_MAX_CM;
    const isLongTape = tapeMaxCm > 500;
    const tapeUnit: 'cm' | 'm' | 'in' | 'ft' = isLongTape
        ? (unitSystem === 'imperial' ? 'ft' : 'm')
        : (unitSystem === 'imperial' ? 'in' : 'cm');
    const tape = tapeUnit === 'cm'
        ? { min: 0, max: tapeMaxCm, step: 1, majorEvery: 5, labelEvery: 10 }
        : tapeUnit === 'm'
            ? { min: 0, max: tapeMaxCm / 100, step: 0.1, majorEvery: 5, labelEvery: 10 }
            : tapeUnit === 'in'
                ? { min: 0, max: Math.ceil(tapeMaxCm / 2.54 / 10) * 10, step: 0.5, majorEvery: 2, labelEvery: 10 }
                : { min: 0, max: Math.ceil(tapeMaxCm / 30.48 / 5) * 5, step: 0.1, majorEvery: 5, labelEvery: 10 };
    const tapeInitial = tapeUnit === 'cm'
        ? Math.round(tapeCm)
        : tapeUnit === 'm'
            ? Math.round(tapeCm / 10) / 10
            : tapeUnit === 'in'
                ? Math.round(tapeCm / 2.54 / 0.5) * 0.5
                : Math.round(tapeCm / 3.048) / 10;

    const rawSubmitValue = mode === 'timer'
        ? stopwatch.bestTime !== null ? String(stopwatch.bestTime) : ''
        : isCmBased
            ? tapeCm > 0 ? String(tapeCm) : ''
            : isCountBased
                ? repCount > 0 ? String(repCount) : ''
                : isTimeBased
                    ? secInt + secTenth > 0 ? (secInt + secTenth / 10).toFixed(1) : ''
                    : weightKgValue > 0 ? String(weightKgValue) : '';

    // Weighted pull-ups: convert over total load (incl. bodyweight), not just the added plates
    const pullupBodyweight = assessment.slug === 'weighted_pullups_1rm' ? profile?.weight_in_kg ?? undefined : undefined;

    const submitValue = isKgBased && repMode === '5rm' && rawSubmitValue
        ? String(estimateOneRepMax(parseFloat(rawSubmitValue.replace(',', '.')), 5, pullupBodyweight))
        : rawSubmitValue;

    const estimated1RM = isKgBased && repMode === '5rm' && rawSubmitValue && !isNaN(parseFloat(rawSubmitValue.replace(',', '.')))
        ? estimateOneRepMax(parseFloat(rawSubmitValue.replace(',', '.')), 5, pullupBodyweight)
        : null;

    const canSubmit = (isRatingBased || !!submitValue) && !completeAssessment.isPending;

    // Live diff vs the previous result for this assessment (if there is one)
    const currentValue = isRatingBased ? rating : rawSubmitValue ? parseFloat(rawSubmitValue) : null;
    const higherIsBetter = metric?.higher_is_better ?? true;
    const resultDiff = lastResult != null && currentValue != null && currentValue > 0
        ? Number((currentValue - lastResult).toFixed(1))
        : null;
    const diffImproved = resultDiff != null && (higherIsBetter ? resultDiff > 0 : resultDiff < 0);

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
                    setShowSuccess(true);
                },
            });
            return;
        }
        if (!submitValue.trim()) return;
        if (!profile.birth_date || !profile.weight_in_kg || !profile.height_in_cm || !profile.gender) return;
        if (completeAssessment.isPending) return;

        const numericValue = parseFloat(submitValue.replace(',', '.'));
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
                setShowSuccess(true);
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
            <View style={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} hitSlop={12}>
                        <Ionicons name="chevron-back" size={24} color={theme.text} />
                    </Pressable>
                    <JempText type="body-l" color={theme.text}>{assessmentName}</JempText>
                    {description ? (
                        <Pressable onPress={() => setShowInfo(true)} hitSlop={12}>
                            <InfoIcon width={22} height={22} color={Cyan[500]} />
                        </Pressable>
                    ) : (
                        <View style={{ width: 24 }} />
                    )}
                </View>

                {/* Explainer video — pinned below the header, outside the centered content */}
                {(assessment.video_storage_path || assessment.youtube_url) && (
                    <Pressable
                        style={[styles.videoBtn, { backgroundColor: theme.surface }]}
                        onPress={() => setShowVideo(true)}
                    >
                        <Ionicons name="play-circle" size={22} color={GradientMid} />
                        <JempText type="body-l" color={theme.text} style={styles.videoBtnLabel}>
                            {t('ui.explainer_video')}
                        </JempText>
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </Pressable>
                )}

                <View style={styles.content}>
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

                {/* Previous result + live diff */}
                {lastResult != null && (
                    <View style={[styles.lastResultRow, { backgroundColor: theme.surface }]}>
                        <JempText type="caption" color={theme.textMuted}>
                            {t('ui.last_result').toUpperCase()}
                        </JempText>
                        <View style={styles.lastResultRight}>
                            <JempText type="body-l" color={GradientMid}>
                                {formatMetricValue(lastResult)}
                            </JempText>
                            {resultDiff != null && resultDiff !== 0 && (
                                <View style={[styles.diffChip, { backgroundColor: `${diffImproved ? '#22c55e' : '#ef4444'}20` }]}>
                                    <JempText type="caption" color={diffImproved ? '#22c55e' : '#ef4444'}>
                                        {`${resultDiff > 0 ? '+' : ''}${resultDiff}`}
                                    </JempText>
                                </View>
                            )}
                        </View>
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
                                    onPress={() => { setMode(m); stopwatch.reset(); }}
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
                {!isRatingBased && mode === 'manual' && isCountBased ? (
                    <View style={styles.inputSection}>
                        <JempText type="h2">{t('ui.enter_result')}</JempText>
                        <JempText type="caption" color={theme.textMuted}>
                            {(UNIT_LABELS.count[locale === 'de' ? 'de' : 'en']).toUpperCase()}
                        </JempText>
                        <View style={styles.wheelColWide}>
                            <NumberWheel
                                initialValue={repCount}
                                min={0}
                                max={repMax}
                                onChange={setRepCount}
                            />
                        </View>
                    </View>
                ) : !isRatingBased && mode === 'manual' && isTimeBased ? (
                    <View style={styles.inputSection}>
                        <JempText type="h2">{t('ui.enter_result')}</JempText>
                        <View style={styles.wheelRow}>
                            <View style={styles.wheelCol}>
                                <JempText type="caption" color={theme.textMuted}>
                                    {t('ui.timer_seconds').toUpperCase()}
                                </JempText>
                                <NumberWheel initialValue={secInt} min={0} max={30} onChange={setSecInt} />
                            </View>
                            <View style={styles.wheelCol}>
                                <JempText type="caption" color={theme.textMuted}>
                                    {t('ui.time_tenths').toUpperCase()}
                                </JempText>
                                <NumberWheel initialValue={secTenth} min={0} max={9} extendable={false} onChange={setSecTenth} />
                            </View>
                        </View>
                        <JempText type="hero" gradient style={styles.heroReadout}>
                            {`${(secInt + secTenth / 10).toFixed(1)} s`}
                        </JempText>
                    </View>
                ) : !isRatingBased && mode === 'manual' && isCmBased ? (
                    <View style={styles.inputSection}>
                        <JempText type="h2">{t('ui.enter_result')}</JempText>
                        <TapeMeasure
                            key={tapeUnit}
                            initialValue={tapeInitial}
                            min={tape.min}
                            max={tape.max}
                            step={tape.step}
                            majorEvery={tape.majorEvery}
                            labelEvery={tape.labelEvery}
                            unitLabel={tapeUnit}
                            onChange={v => setTapeCm(
                                tapeUnit === 'cm' ? v
                                    : tapeUnit === 'm' ? Math.round(v * 100)
                                        : tapeUnit === 'in' ? Math.round(v * 2.54 * 10) / 10
                                            : Math.round(v * 30.48),
                            )}
                        />
                    </View>
                ) : !isRatingBased && mode === 'manual' ? (
                    <View style={styles.inputSection}>
                        <JempText type="h2">{t('ui.enter_result')}</JempText>
                        <JempText type="caption" color={theme.textMuted}>
                            {t('ui.rep_mode_label', {
                                mode: repMode === '5rm' ? '5RM' : '1RM',
                                unit: weightUnit.toUpperCase(),
                            }).toUpperCase()}
                        </JempText>
                        <View style={styles.toggleRow}>
                            <View style={[styles.modeToggle, { backgroundColor: theme.surface }]}>
                                {(['5rm', '1rm'] as const).map(m => {
                                    const active = repMode === m;
                                    return (
                                        <Pressable
                                            key={m}
                                            onPress={() => {
                                                if (m === '1rm' && repMode !== '1rm') setShowOneRmWarning(true);
                                                setRepMode(m);
                                            }}
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
                                                {m === '5rm' ? '5RM' : '1RM'}
                                            </JempText>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                        <View style={styles.weightRow}>
                            <View style={styles.weightWheel}>
                                <NumberWheel
                                    key={`wm-${weightUnit}`}
                                    initialValue={weightMain}
                                    min={0}
                                    max={weightUnit === 'kg' ? 200 : 440}
                                    onChange={setWeightMain}
                                />
                            </View>
                            <JempText type="h1">.</JempText>
                            <View style={styles.weightWheelSmall}>
                                <NumberWheel
                                    key={`wt-${weightUnit}`}
                                    initialValue={weightTenth}
                                    min={0}
                                    max={9}
                                    extendable={false}
                                    onChange={setWeightTenth}
                                />
                            </View>
                            <JempText type="h2" color={theme.textMuted}>{weightUnit}</JempText>
                        </View>
                        {/* Always rendered so the layout never shifts — invisible until a value is set */}
                        <View style={[styles.estimateRow, { backgroundColor: theme.surface, opacity: estimated1RM !== null ? 1 : 0 }]}>
                            <JempText type="caption" color={theme.textMuted}>{t('ui.estimated_1rm')}</JempText>
                            <View style={styles.estimateValues}>
                                <JempText type="body-l" color={theme.textMuted}>
                                    {`${weightDisplay.toFixed(1)} ${weightUnit}`}
                                </JempText>
                                <JempText type="body-l" color={GradientMid}>
                                    ≈ {unitSystem === 'imperial' ? `${kgToLbs(estimated1RM ?? 0)} lbs` : `${estimated1RM ?? 0} kg`}
                                </JempText>
                            </View>
                        </View>
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
                </View>
            </View>

            <VideoDialog
                visible={showVideo}
                title={t('ui.explainer_video')}
                videoUrl={assessmentVideoUrl(assessment.video_storage_path)}
                youtubeUrl={assessment.youtube_url}
                buttonLabel={t('ui.close')}
                onDismiss={() => setShowVideo(false)}
            />

            <SuccessOverlay
                visible={showSuccess}
                onDone={() => {
                    setShowSuccess(false);
                    router.back();
                }}
            />

            <JempDialog
                visible={showInfo}
                title={assessmentName}
                message={description}
                buttonLabel={t('ui.got_it')}
                icon="information-circle-outline"
                iconColor={Cyan[500]}
                onDismiss={() => setShowInfo(false)}
            />

            <JempDialog
                visible={showOneRmWarning}
                title={t('ui.rep_mode_1rm')}
                message={t('ui.rep_mode_1rm_warning')}
                buttonLabel={t('ui.got_it')}
                icon="warning-outline"
                iconColor="#f59e0b"
                onDismiss={() => setShowOneRmWarning(false)}
            />

            {/* CTA */}
            <View style={[styles.bottomBar, { backgroundColor: theme.background }]}>
                <Pressable
                    style={styles.submitBtn}
                    onPress={() => router.push('/assessment-confirm')}
                    disabled={!canSubmit}
                >
                    <LinearGradient
                        colors={canSubmit ? [Cyan[500], Electric[500]] : [`${Cyan[500]}40`, `${Electric[500]}40`]}
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
    scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },
    content: { flex: 1, justifyContent: 'center', gap: 20 },
    skeletonRow: { flexDirection: 'row', gap: 8 },
    heroReadout: { alignSelf: 'center' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },

    videoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 20,
    },
    videoBtnLabel: { flex: 1 },

    equipSection: { gap: 8 },
    equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    equipChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 100,
    },

    // Previous result
    lastResultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    lastResultRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    diffChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 100,
    },
    estimateValues: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

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
    unitToggle: { alignSelf: 'center', width: 180, marginVertical: 4 },

    // Rating slider
    ratingSection: { gap: 8, paddingTop: 12 },
    ratingHeader: { alignItems: 'center', gap: 4 },
    ratingNumber: { fontSize: 56, lineHeight: 64, fontWeight: '700', letterSpacing: -2 },
    slider: { width: '100%', height: 40, marginHorizontal: -8 },
    ratingLabels: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 4 },

    // Manual input
    inputSection: { alignItems: 'center', gap: 8, paddingTop: 12 },
    wheelRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        width: '100%',
    },
    wheelCol: {
        flex: 1,
        maxWidth: 140,
        alignItems: 'center',
        gap: 8,
    },
    wheelColWide: {
        width: '100%',
        maxWidth: 220,
        alignSelf: 'center',
    },
    toggleRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
        marginVertical: 4,
    },
    toggleHalf: { flex: 1 },
    weightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        paddingVertical: 4,
    },
    weightWheel: { width: 110 },
    weightWheelSmall: { width: 72 },
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
