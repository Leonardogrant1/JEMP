import GameIcon from '@/assets/icons/game.svg';
import { InfoCallout } from '@/components/ui/info-callout';
import { JempText } from '@/components/jemp-text';
import { WEEK_DAYS } from '@/constants/plan-generation-constants';
import { getSportKind } from '@/constants/sports';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrainingAnimation } from '@/hooks/use-training-animation';
import { computeLoadProfile, maxWorkoutDays, MIN_WORKOUT_DAYS } from '@/lib/load-profile';
import { computeWeekComposition, extraSessionAllowance, speedFocusWithoutSpeedDay } from '@/lib/week-allocation';
import { JempDialog } from '@/components/ui/jemp-dialog';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export function ScheduleStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const router = useRouter();
    const { profile } = useCurrentUser();
    const {
        preferredDays, togglePreferredDay,
        selectedEnvIds, allEnvs,
        dayEnvMap,
        sportSessions, selectedSportSlug,
        pillarLevels, sprintClub, dayDurations,
    } = usePlanWizardStore();
    const trainingAnimation = useTrainingAnimation(profile?.sport);
    const [showCapInfo, setShowCapInfo] = useState(false);
    const sportKind = getSportKind(selectedSportSlug);

    // Env-Auswahl pro Tag lohnt nur, wenn mehrere Trainingsorte gewählt sind
    const multiEnv = selectedEnvIds.size > 1;

    // Mehr Vereinsbelastung → weniger wählbare eigene Einheiten
    const loadProfile = computeLoadProfile(sportSessions).load_profile;
    const wizardLevelMap: Record<string, 1 | 2 | 3> = {};
    pillarLevels.forEach((l) => { wizardLevelMap[l.slug] = l.level; });
    const maxDays = maxWorkoutDays(loadProfile)
        + extraSessionAllowance({ loadProfile, pillarLevels: wizardLevelMap, sprintsCoveredByClub: sprintClub });
    const atCap = preferredDays.size >= maxDays;
    const overCap = preferredDays.size > maxDays;
    const missingDays = MIN_WORKOUT_DAYS - preferredDays.size;

    // Tap öffnet immer den Tag-Editor (Ort + Dauer); Abwählen passiert dort
    // über "Tag leeren" (QA 09.10. — Dauer pro Tag statt globaler Auswahl).
    function handleDayPress(dow: number) {
        const active = preferredDays.has(dow);
        if (!active && atCap) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setShowCapInfo(true);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!active) togglePreferredDay(dow);
        router.push(`/training-day-editor?day=${dow}`);
    }

    return (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.schedule_title')}</JempText>
            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                {t('plan.schedule_subtitle')}
            </JempText>

            <View style={styles.dayList}>
                {WEEK_DAYS.map(({ dow, key }) => {
                    const active = preferredDays.has(dow);
                    const blocked = !active && atCap;
                    const env = active && multiEnv
                        ? allEnvs.find(e => e.id === dayEnvMap[dow])
                        : undefined;
                    const sportSession = sportSessions.find(s => s.day_of_week === dow);
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
                                {t(key as any).toUpperCase()}
                            </JempText>

                            <View style={styles.dayRight}>
                                {/* Sport-Termin aus dem vorherigen Step als gedimmter Kontext-Hint */}
                                {sportSession && (
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
                                )}
                                {active
                                    ? (
                                        <>
                                            {/* Dauer-Override nur anzeigen — geändert wird sie im Tag-Editor */}
                                            {(() => {
                                                const override = dayDurations.find((d) => d.day_of_week === dow);
                                                return override
                                                    ? <JempText type="caption" color={GradientMid}>{`${override.minutes}m`}</JempText>
                                                    : null;
                                            })()}
                                            {env && (
                                                <Ionicons name={env.icon as any} size={15} color={theme.textMuted} />
                                            )}
                                            <Ionicons name="checkmark-circle" size={16} color={GradientMid} />
                                        </>
                                    )
                                    : <Ionicons name="add" size={18} color={theme.textSubtle} />
                                }
                            </View>
                        </TouchableOpacity>
                    );
                })}
                {missingDays > 0 ? (
                    <JempText type="caption" color={theme.textMuted} style={styles.maxDaysHint}>
                        {t(missingDays === 1 ? 'plan.schedule_min_days_hint_one' : 'plan.schedule_min_days_hint', { count: missingDays })}
                    </JempText>
                ) : atCap && (
                    <JempText type="caption" color={overCap ? '#ef4444' : theme.textMuted} style={styles.maxDaysHint}>
                        {t(overCap ? 'plan.schedule_max_days_over' : 'plan.schedule_max_days_hint', { count: maxDays })}
                    </JempText>
                )}
                {preferredDays.size >= MIN_WORKOUT_DAYS && speedFocusWithoutSpeedDay({
                    availableDayCount: preferredDays.size, loadProfile,
                    pillarLevels: wizardLevelMap, sprintsCoveredByClub: sprintClub,
                }) && (
                    <InfoCallout icon="flash-outline" text={t('plan.speed_micro_hint')} />
                )}
                {(() => {
                    // Live-Zusammensetzung (§3.4) — Spiegel der Generator-Zuteilung.
                    if (preferredDays.size < MIN_WORKOUT_DAYS || pillarLevels.length === 0) return null;
                    const levelMap: Record<string, 1 | 2 | 3> = {};
                    pillarLevels.forEach((l) => { levelMap[l.slug] = l.level; });
                    const comp = computeWeekComposition({
                        availableDayCount: preferredDays.size,
                        loadProfile,
                        pillarLevels: levelMap,
                        sprintsCoveredByClub: sprintClub,
                    });
                    const parts: string[] = [t('week_composition.workouts', { count: comp.workouts })];
                    if (comp.speedDays === 1) parts.push(t('week_composition.speed_days', { count: 1 }));
                    if (comp.speedDays > 1) parts.push(t('week_composition.speed_days_plural', { count: comp.speedDays }));
                    if (comp.speedDays === 0 && comp.carrier === 'integrated') parts.push(t('week_composition.sprint_integrated'));
                    if (comp.conditioningDay) parts.push(t('week_composition.conditioning_day'));
                    const line = parts.join(' + ') + (comp.mobilityDay ? ` · ${t('week_composition.mobility')}` : '');
                    return (
                        <JempText type="caption" color={GradientMid} style={styles.maxDaysHint}>{line}</JempText>
                    );
                })()}
            </View>

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
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    dayList: { gap: 8 },
    dayRowBlocked: { opacity: 0.35 },
    maxDaysHint: { marginTop: 6, lineHeight: 17 },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
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
    durationSection: { marginTop: 32 },
    sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
    durationRow: { flexDirection: 'row', gap: 8 },
    durationChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
});
