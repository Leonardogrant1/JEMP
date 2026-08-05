import GameIcon from '@/assets/icons/game.svg';
import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { ENV_ICONS } from '@/constants/environment-icons';
import { COMBAT_SPORT_SLUGS } from '@/constants/sports';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrainingAnimationBySlug } from '@/hooks/use-training-animation';
import { supabase } from '@/services/supabase/client';
import { DayEnvironment, useOnboardingStore } from '@/stores/onboarding-store';
import { SessionDuration } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const DURATIONS: { value: SessionDuration; label: string }[] = [
    { value: '30min', label: '30 min' },
    { value: '45min', label: '45 min' },
    { value: '60min', label: '60 min' },
    { value: '90min', label: '90 min' },
];

type EnvItem = { id: string; slug: string; name_i18n: Record<string, string> | null };

export function WorkoutPrefsStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedDays = useOnboardingStore((s) => s.preferred_workout_days);
    const storedDuration = useOnboardingStore((s) => s.preferred_session_duration);
    const storedDayEnvironments = useOnboardingStore((s) => s.dayEnvironments);
    const environmentIds = useOnboardingStore((s) => s.environmentIds);
    const weeklySchedule = useOnboardingStore((s) => s.weekly_schedule);
    const sportSlug = useOnboardingStore((s) => s.sport_slug);
    const setStore = useOnboardingStore((s) => s.set);
    const trainingAnimation = useTrainingAnimationBySlug(sportSlug);
    const isCombat = COMBAT_SPORT_SLUGS.has(sportSlug ?? '');
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

    const [selectedDays, setSelectedDays] = useState<Set<number>>(() => new Set(storedDays ?? []));
    const [selectedDuration, setSelectedDuration] = useState<SessionDuration | null>(storedDuration ?? null);
    const [environments, setEnvironments] = useState<EnvItem[]>([]);
    const [dayEnvMap, setDayEnvMap] = useState<Record<number, string>>(() => {
        const map: Record<number, string> = {};
        storedDayEnvironments.forEach((de) => { map[de.day_of_week] = de.environment_id; });
        return map;
    });

    useEffect(() => {
        validate(selectedDays, selectedDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    function validate(days: Set<number>, duration: SessionDuration | null) {
        setCanContinue(days.size > 0 && duration !== null);
    }

    function saveDayEnvironments(map: Record<number, string>) {
        const dayEnvironments: DayEnvironment[] = Object.entries(map).map(([day, id]) => ({
            day_of_week: Number(day),
            environment_id: id,
        }));
        setStore({ dayEnvironments });
    }

    function toggleDay(value: number) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = new Set(selectedDays);
        next.has(value) ? next.delete(value) : next.add(value);
        setSelectedDays(next);
        setStore({ preferred_workout_days: Array.from(next) });
        validate(next, selectedDuration);
        // Env-Zuordnung eines abgewählten Tags mit aufräumen
        if (!next.has(value) && dayEnvMap[value]) {
            const { [value]: _removed, ...rest } = dayEnvMap;
            setDayEnvMap(rest);
            saveDayEnvironments(rest);
        }
    }

    function toggleDayEnv(day: number, envId: string) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = { ...dayEnvMap };
        if (next[day] === envId) delete next[day];
        else next[day] = envId;
        setDayEnvMap(next);
        saveDayEnvironments(next);
    }

    function selectDuration(value: SessionDuration) {
        setSelectedDuration(value);
        setStore({ preferred_session_duration: value });
        validate(selectedDays, value);
    }

    const multiEnv = environments.length > 1;

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
                    return (
                        <TouchableOpacity
                            key={dow}
                            activeOpacity={0.7}
                            onPress={() => toggleDay(dow)}
                            style={[
                                styles.dayRow,
                                active
                                    ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                                    : { backgroundColor: 'transparent', borderColor: theme.borderDivider },
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
                                            {sportSession.type === 'game' && (isCombat
                                                ? <LottieView
                                                    source={require('@/assets/animations/fight.json')}
                                                    autoPlay
                                                    loop
                                                    style={styles.sportHintLottie}
                                                />
                                                : <GameIcon width={13} height={13} />)}
                                            {sportSession.type === 'tournament' && (
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
                                {/* Trainingsort direkt in der Row wählen — nur bei mehreren Orten */}
                                {active && multiEnv && environments.map((env) => {
                                    const envActive = dayEnvMap[dow] === env.id;
                                    return (
                                        <Pressable
                                            key={env.id}
                                            onPress={() => toggleDayEnv(dow, env.id)}
                                            hitSlop={6}
                                            style={[
                                                styles.envToggle,
                                                envActive
                                                    ? { backgroundColor: `${GradientMid}18`, borderColor: GradientMid }
                                                    : { backgroundColor: theme.surface, borderColor: 'transparent' },
                                            ]}
                                        >
                                            <Ionicons
                                                name={(ENV_ICONS[env.slug] ?? 'location-outline') as any}
                                                size={15}
                                                color={envActive ? GradientMid : theme.textMuted}
                                            />
                                        </Pressable>
                                    );
                                })}
                                {active
                                    ? <Ionicons name="checkmark-circle" size={16} color={GradientMid} />
                                    : <Ionicons name="add" size={18} color={theme.textSubtle} />
                                }
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(480).duration(500).springify()} style={styles.section}>
                <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                    {t('onboarding.workout_prefs_duration_label')}
                </JempText>
                <View style={styles.durationRow}>
                    {DURATIONS.map((d) => (
                        <SelectableChip
                            key={d.value}
                            label={d.label}
                            selected={selectedDuration === d.value}
                            onPress={() => selectDuration(d.value)}
                            style={styles.durationChip}
                        />
                    ))}
                </View>
            </Animated.View>

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
