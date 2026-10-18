import GameIcon from '@/assets/icons/game.svg';
import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { ENV_ICONS } from '@/constants/environment-icons';
import { getSportKind } from '@/constants/sports';
import { Colors, GradientMid } from '@/constants/theme';
import { computeLoadProfile, maxWorkoutDays, MIN_WORKOUT_DAYS } from '@/lib/load-profile';
import { computeWeekComposition, extraSessionAllowance, speedFocusWithoutSpeedDay } from '@/lib/week-allocation';
import { JempDialog } from '@/components/ui/jemp-dialog';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrainingAnimationBySlug } from '@/hooks/use-training-animation';
import { supabase } from '@/services/supabase/client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type EnvItem = { id: string; slug: string; name_i18n: Record<string, string> | null };

export function WorkoutPrefsStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedDays = useOnboardingStore((s) => s.preferred_workout_days);
    const pillarLevels = useOnboardingStore((s) => s.pillarLevels);
    const sprintsCoveredByClub = useOnboardingStore((s) => s.sprints_covered_by_club);
    const [showCapInfo, setShowCapInfo] = useState(false);
    const dayDurations = useOnboardingStore((s) => s.preferred_day_durations);
    const storedDuration = useOnboardingStore((s) => s.preferred_session_duration);
    const storedDayEnvironments = useOnboardingStore((s) => s.dayEnvironments);
    const environmentIds = useOnboardingStore((s) => s.environmentIds);
    const weeklySchedule = useOnboardingStore((s) => s.weekly_schedule);
    const sportSlug = useOnboardingStore((s) => s.sport_slug);
    const setStore = useOnboardingStore((s) => s.set);
    const trainingAnimation = useTrainingAnimationBySlug(sportSlug);
    const sportKind = getSportKind(sportSlug);
    const sportSessions = weeklySchedule?.sessions ?? [];
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const DAYS: { value: number; label: string }[] = [
        { value: 1, label: t('onboarding.workout_prefs_day_mon') },
        { value: 2, label: t('onboarding.workout_prefs_day_tue') },
        { value: 3, label: t('onboarding.workout_prefs_day_wed') },
        { value: 4, label: t('onboarding.workout_prefs_day_thu') },
        { value: 5, label: t('onboarding.workout_prefs_day_fri') },
        { value: 6, label: t('onboarding.workout_prefs_day_sat') },
        { value: 7, label: t('onboarding.workout_prefs_day_sun') },
    ];

    const [environments, setEnvironments] = useState<EnvItem[]>([]);

    // Dauer wird pro Tag im Tag-Editor gewählt — global bleibt nur noch der
    // 60-min-Fallback für Tage ohne Override (QA 09.10.).
    useEffect(() => {
        if (!storedDuration) setStore({ preferred_session_duration: '60min' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Tage + Env-Zuordnung leben direkt im Store — der training-day-editor-Sheet
    // schreibt dorthin, die Rows spiegeln seine Änderungen live
    const selectedDays = new Set(storedDays ?? []);
    const dayEnvMap: Record<number, string> = {};
    storedDayEnvironments.forEach((de) => { dayEnvMap[de.day_of_week] = de.environment_id; });
    const multiEnv = environmentIds.length > 1;

    // Mehr Vereinsbelastung → weniger wählbare eigene Einheiten
    // Cap = Workout-Cap + Session-Allowance (Spec §3.1): Überschuss-Tage werden
    // zu Speed-/Conditioning-Einheiten — der Tage-Cap muss sie zulassen.
    const loadProfile = computeLoadProfile(sportSessions).load_profile;
    const pillarLevelMap: Record<string, 1 | 2 | 3> = {};
    pillarLevels.forEach((l) => { pillarLevelMap[l.slug] = l.level; });
    const allowance = extraSessionAllowance({ loadProfile, pillarLevels: pillarLevelMap, sprintsCoveredByClub: sprintsCoveredByClub ?? false });
    const maxDays = maxWorkoutDays(loadProfile) + allowance;
    const atCap = selectedDays.size >= maxDays;
    const overCap = selectedDays.size > maxDays;
    const missingDays = MIN_WORKOUT_DAYS - selectedDays.size;

    useEffect(() => {
        setCanContinue(
            selectedDays.size >= MIN_WORKOUT_DAYS
            && selectedDays.size <= maxDays,
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storedDays, maxDays]);

    useEffect(() => {
        if (environmentIds.length > 1) {
            supabase
                .from('environments')
                .select('id, slug, name_i18n')
                .in('id', environmentIds)
                .then(({ data }) => {
                    if (data) setEnvironments(data as EnvItem[]);
                });
        }
    }, [environmentIds]);

    // Tap öffnet immer den Tag-Editor (Ort + Dauer); Abwählen passiert dort
    // über "Tag leeren" (QA 09.10. — Dauer pro Tag statt globaler Auswahl).
    function handleDayPress(dow: number) {
        const active = selectedDays.has(dow);
        if (!active && atCap) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setShowCapInfo(true);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!active) setStore({ preferred_workout_days: [...(storedDays ?? []), dow] });
        router.push(`/training-day-editor?day=${dow}&source=onboarding`);
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.workout_prefs_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.workout_prefs_subtitle')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()} style={styles.dayList}>
                {DAYS.map(({ value: dow, label }) => {
                    const active = selectedDays.has(dow);
                    const blocked = !active && atCap;
                    return (
                        <TouchableOpacity
                            key={dow}
                            activeOpacity={0.7}
                            onPress={() => handleDayPress(dow)}
                            style={[
                                styles.dayRow,
                                active
                                    ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                                    : { backgroundColor: 'transparent', borderColor: theme.borderDivider },
                                blocked && styles.dayRowBlocked,
                            ]}
                        >
                            <JempText
                                type="body-l"
                                color={active ? GradientMid : theme.text}
                                style={styles.dayName}
                            >
                                {label.toUpperCase()}
                            </JempText>

                            <View style={styles.dayRight}>
                                {/* Sport-Termin aus dem vorherigen Step als gedimmter Kontext-Hint */}
                                {(() => {
                                    const sportSession = sportSessions.find((s) => s.day_of_week === dow);
                                    if (!sportSession) return null;
                                    return (
                                        <View style={styles.sportHint}>
                                            {sportSession.type === 'team_training' && (
                                                <LottieView
                                                    source={trainingAnimation as never}
                                                    autoPlay
                                                    loop
                                                    style={styles.sportHintLottie}
                                                />
                                            )}
                                            {sportSession.type === 'game' && sportKind === 'combat' && (
                                                <LottieView
                                                    source={require('@/assets/animations/fight.json')}
                                                    autoPlay
                                                    loop
                                                    style={styles.sportHintLottie}
                                                />
                                            )}
                                            {sportSession.type === 'game' && sportKind === 'match' && (
                                                <GameIcon width={13} height={13} />
                                            )}
                                            {/* Turnier bzw. Wettkampf (Individualsport) — beides Trophäe */}
                                            {(sportSession.type === 'tournament' || (sportSession.type === 'game' && sportKind === 'individual')) && (
                                                <LottieView
                                                    source={require('@/assets/animations/throphy.json')}
                                                    autoPlay
                                                    loop
                                                    style={styles.sportHintLottie}
                                                />
                                            )}
                                        </View>
                                    );
                                })()}
                                {/* Zugewiesener Trainingsort (im Sheet gewählt) */}
                                {active && (() => {
                                    const env = environments.find((e) => e.id === dayEnvMap[dow]);
                                    if (!env) return null;
                                    return (
                                        <Ionicons
                                            name={(ENV_ICONS[env.slug] ?? 'location-outline') as any}
                                            size={15}
                                            color={theme.textMuted}
                                        />
                                    );
                                })()}
                                {/* Dauer-Override nur anzeigen — geändert wird sie im Tag-Editor */}
                                {active && (() => {
                                    const override = (dayDurations ?? []).find((d) => d.day_of_week === dow);
                                    return override
                                        ? <JempText type="caption" color={GradientMid}>{`${override.minutes}m`}</JempText>
                                        : null;
                                })()}
                                {active
                                    ? <Ionicons name="checkmark-circle" size={16} color={GradientMid} />
                                    : <Ionicons name="add" size={18} color={theme.textSubtle} />
                                }
                            </View>
                        </TouchableOpacity>
                    );
                })}
                {missingDays > 0 ? (
                    <JempText type="caption" color={theme.textMuted} style={styles.maxDaysHint}>
                        {t(missingDays === 1 ? 'onboarding.workout_prefs_min_days_hint_one' : 'onboarding.workout_prefs_min_days_hint', { count: missingDays })}
                    </JempText>
                ) : atCap && (
                    <JempText type="caption" color={overCap ? '#ef4444' : theme.textMuted} style={styles.maxDaysHint}>
                        {t(overCap ? 'onboarding.workout_prefs_max_days_over' : 'onboarding.workout_prefs_max_days_hint', { count: maxDays })}
                    </JempText>
                )}
                {selectedDays.size >= MIN_WORKOUT_DAYS && speedFocusWithoutSpeedDay({
                    availableDayCount: selectedDays.size, loadProfile,
                    pillarLevels: pillarLevelMap, sprintsCoveredByClub: sprintsCoveredByClub ?? false,
                }) && (
                    <JempText type="caption" color={theme.textMuted} style={styles.maxDaysHint}>
                        {t('plan.speed_micro_hint')}
                    </JempText>
                )}
                {(() => {
                    // Live-Zusammensetzung (§3.4): deterministisch aus dem Allocation-Spiegel —
                    // verspricht exakt das, was der Generator baut.
                    if (selectedDays.size < MIN_WORKOUT_DAYS || pillarLevels.length === 0) return null;
                    const levelMap: Record<string, 1 | 2 | 3> = {};
                    pillarLevels.forEach((l) => { levelMap[l.slug] = l.level; });
                    const comp = computeWeekComposition({
                        availableDayCount: selectedDays.size,
                        loadProfile,
                        pillarLevels: levelMap,
                        sprintsCoveredByClub: sprintsCoveredByClub ?? false,
                    });
                    const parts: string[] = [t('week_composition.workouts', { count: comp.workouts })];
                    if (comp.speedDays === 1) parts.push(t('week_composition.speed_days', { count: 1 }));
                    if (comp.speedDays > 1) parts.push(t('week_composition.speed_days_plural', { count: comp.speedDays }));
                    if (comp.speedDays === 0 && comp.carrier === 'integrated') parts.push(t('week_composition.sprint_integrated'));
                    if (comp.conditioningDay) parts.push(t('week_composition.conditioning_day'));
                    const line = parts.join(' + ') + (comp.mobilityDay ? ` · ${t('week_composition.mobility')}` : '');
                    return (
                        <JempText type="caption" color={GradientMid} style={styles.maxDaysHint}>
                            {line}
                        </JempText>
                    );
                })()}
            </Animated.View>

            <JempDialog
                visible={showCapInfo}
                title={t('plan.schedule_cap_title')}
                message={t(loadProfile !== 'low' ? 'plan.schedule_cap_body_load' : 'plan.schedule_cap_body_free', { count: maxDays })}
                buttonLabel={t('ui.got_it')}
                icon="information-circle-outline"
                iconColor={GradientMid}
                onDismiss={() => setShowCapInfo(false)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 28,
        paddingTop: 32,
        paddingBottom: 24,
    },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 28 },
    dayList: { gap: 8 },
    dayRowBlocked: { opacity: 0.35 },
    maxDaysHint: { marginTop: 6, lineHeight: 17 },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    dayName: {
        fontWeight: '600',
        minWidth: 36,
    },
    dayRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    envToggle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: { marginTop: 32 },
    sectionLabel: {
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 14,
    },
    durationRow: { flexDirection: 'row', gap: 8 },
    durationChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    sportHint: {
        opacity: 0.55,
        marginRight: 2,
    },
    sportHintLottie: {
        // Lottie-Icons haben eingebautes Padding — größer rendern und vertikal
        // kompensieren, damit die Row nicht höher wird
        width: 20,
        height: 20,
        marginVertical: -5,
    },
});
