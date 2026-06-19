import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors, GradientMid } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { WeeklyScheduleSession } from '@/types/user-data';
import Slider from '@react-native-community/slider';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type SessionType = WeeklyScheduleSession['type'];

const COMBAT_SPORTS = new Set(['boxing', 'mma', 'wrestling', 'judo', 'bjj', 'kickboxing', 'karate', 'taekwondo']);
const EMPTY_ARRAY: number[] = [];

function getSessionTypes(sportSlug: string | null): { key: SessionType; labelKey: string }[] {
    const isCombat = COMBAT_SPORTS.has(sportSlug ?? '');
    return [
        { key: 'team_training', labelKey: 'onboarding.weekly_schedule_type_training' },
        { key: 'game', labelKey: isCombat ? 'onboarding.weekly_schedule_type_fight' : 'onboarding.weekly_schedule_type_game' },
        { key: 'tournament', labelKey: 'onboarding.weekly_schedule_type_tournament' },
    ];
}

export function WeeklyScheduleStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const storedSchedule = useOnboardingStore((s) => s.weekly_schedule);
    const sportSlug = useOnboardingStore((s) => s.sport_slug);
    const setStore = useOnboardingStore((s) => s.set);
    const sessionTypes = getSessionTypes(sportSlug);
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

    const preferredWorkoutDays = useOnboardingStore((s) => s.preferred_workout_days ?? EMPTY_ARRAY);

    const [sessions, setSessions] = useState<WeeklyScheduleSession[]>(
        () => storedSchedule?.sessions ?? []
    );

    useEffect(() => {
        setCanContinue(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function persist(next: WeeklyScheduleSession[]) {
        setSessions(next);
        setStore({ weekly_schedule: { sessions: next, notes: null } });
    }

    function toggleDay(day: number) {
        const exists = sessions.find((s) => s.day_of_week === day);
        if (exists) {
            persist(sessions.filter((s) => s.day_of_week !== day));
        } else {
            persist([...sessions, { day_of_week: day, type: 'team_training', intensity: 6 }]);
        }
    }

    function setType(day: number, type: SessionType) {
        persist(sessions.map((s) => s.day_of_week === day ? { ...s, type } : s));
    }

    function setIntensity(day: number, intensity: number) {
        persist(sessions.map((s) => s.day_of_week === day ? { ...s, intensity } : s));
    }

    const selectedDays = useMemo(() => new Set(sessions.map((s) => s.day_of_week)), [sessions]);
    const sortedSessions = useMemo(() => [...sessions].sort((a, b) => a.day_of_week - b.day_of_week), [sessions]);

    function getAffectedJempDays(sportDay: number, mode: 'adjacent' | 'same'): number[] {
        if (preferredWorkoutDays.length === 0) return []
        if (mode === 'same') {
            return preferredWorkoutDays.includes(sportDay) ? [sportDay] : [];
        }
        const prev = sportDay === 1 ? 7 : sportDay - 1;
        const next = sportDay === 7 ? 1 : sportDay + 1;
        return preferredWorkoutDays.filter((d) => d === prev || d === next);
    }

    function formatDays(days: number[]): string {
        return days.map((d) => DAYS.find((x) => x.value === d)?.label ?? '').join(', ');
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.weekly_schedule_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.weekly_schedule_subtitle')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()}>
                <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                    {t('onboarding.weekly_schedule_days_label')}
                </JempText>
                <View style={styles.dayRow}>
                    {DAYS.map((day) => (
                        <SelectableChip
                            key={day.value}
                            label={day.label}
                            selected={selectedDays.has(day.value)}
                            onPress={() => toggleDay(day.value)}
                            style={styles.dayChip}
                        />
                    ))}
                </View>
            </Animated.View>

            {sortedSessions.map((session, i) => {
                const dayLabel = DAYS.find((d) => d.value === session.day_of_week)?.label ?? '';
                return (
                    <Animated.View
                        key={session.day_of_week}
                        entering={FadeInDown.delay(i * 80).duration(400).springify()}
                        style={[styles.card, { backgroundColor: theme.surface }]}
                    >
                        <View style={styles.cardHeader}>
                            <JempText type="body-sm" style={styles.cardDay}>{dayLabel}</JempText>
                            <TouchableOpacity onPress={() => toggleDay(session.day_of_week)} hitSlop={12}>
                                <JempText type="body-sm" color={theme.textMuted}>✕</JempText>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.chipRow}>
                            {sessionTypes.map((st) => (
                                <SelectableChip
                                    key={st.key}
                                    label={t(st.labelKey)}
                                    selected={session.type === st.key}
                                    onPress={() => setType(session.day_of_week, st.key)}
                                    size="sm"
                                />
                            ))}
                        </View>

                        {(session.type === 'game' || session.type === 'tournament') && (() => {
                            const prev = session.day_of_week === 1 ? 7 : session.day_of_week - 1;
                            const next = session.day_of_week === 7 ? 1 : session.day_of_week + 1;
                            const affected = preferredWorkoutDays.filter((d) => d === prev || d === next);
                            if (affected.length === 0) return null;
                            return (
                                <View style={[styles.hintBox, { backgroundColor: 'rgba(61, 158, 203, 0.15)' }]}>
                                    <JempText type="body-sm" color={GradientMid}>
                                        {t('onboarding.weekly_schedule_hint_game', { days: formatDays(affected) })}
                                    </JempText>
                                </View>
                            );
                        })()}

                        {session.type !== 'game' && session.type !== 'tournament' && (
                            <View style={styles.intensityRow}>
                                <View style={styles.intensityHeader}>
                                    <JempText type="caption" color={theme.textMuted} style={styles.intensityLabel}>
                                        {t('onboarding.weekly_schedule_intensity_label')}
                                    </JempText>
                                    <JempText type="h2">{session.intensity}</JempText>
                                </View>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={1}
                                    maximumValue={10}
                                    step={1}
                                    value={session.intensity}
                                    onValueChange={(v) => setIntensity(session.day_of_week, v)}
                                    minimumTrackTintColor={GradientMid}
                                    maximumTrackTintColor={theme.borderStrong}
                                    thumbTintColor={theme.text}
                                />
                                {session.intensity === 7 && (() => {
                                    const sameDay = getAffectedJempDays(session.day_of_week, 'same');
                                    if (sameDay.length === 0) return null;
                                    return (
                                        <View style={[styles.hintBox, { backgroundColor: 'rgba(61, 158, 203, 0.15)' }]}>
                                            <JempText type="body-sm" color={GradientMid}>
                                                {t('onboarding.weekly_schedule_hint_intensity_7', { days: formatDays(sameDay) })}
                                            </JempText>
                                        </View>
                                    );
                                })()}
                                {session.intensity >= 8 && (() => {
                                    const sameDay = getAffectedJempDays(session.day_of_week, 'same');
                                    const adjacent = getAffectedJempDays(session.day_of_week, 'adjacent');
                                    if (sameDay.length === 0 && adjacent.length === 0) return null;
                                    const key = sameDay.length > 0 && adjacent.length > 0
                                        ? 'onboarding.weekly_schedule_hint_intensity_8plus_both'
                                        : sameDay.length > 0
                                            ? 'onboarding.weekly_schedule_hint_intensity_8plus_same'
                                            : 'onboarding.weekly_schedule_hint_intensity_8plus_adjacent';
                                    return (
                                        <View style={[styles.hintBox, { backgroundColor: 'rgba(61, 158, 203, 0.15)' }]}>
                                            <JempText type="body-sm" color={GradientMid}>
                                                {t(key, { sameDays: formatDays(sameDay), adjacentDays: formatDays(adjacent) })}
                                            </JempText>
                                        </View>
                                    );
                                })()}
                            </View>
                        )}
                    </Animated.View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40 },
    title: { marginBottom: 10 },
    subtitle: { marginBottom: 32 },
    sectionLabel: {
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 14,
    },
    dayRow: { flexDirection: 'row', gap: 6, marginBottom: 28 },
    dayChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    card: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardDay: { fontWeight: '600' },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    intensityRow: { marginTop: 12 },
    intensityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    intensityLabel: {
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    slider: {
        width: '100%',
        height: 40,
        marginHorizontal: -8,
    },
    hintBox: {
        marginTop: 10,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
});
