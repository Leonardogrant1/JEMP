import { JempText } from '@/components/jemp-text';
import { StepBars } from '@/components/plan-generation/StepBars';
import { COMBAT_SPORTS } from '@/components/plan-generation/WeeklyStep';
import { JempInput } from '@/components/ui/jemp-input';
import { HeightSlider, WeightSlider } from '@/components/ui/measurement-slider';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { SelectableRow } from '@/components/ui/selectable-row';
import { DURATIONS, WEEK_DAYS } from '@/constants/plan-generation-constants';
import { getSportLabelI18n, SPORT_GROUPS } from '@/constants/sports';
import { Colors, GRADIENT, GradientMid } from '@/constants/theme';
import { getSessionTypes } from '@/helpers/plan-generation-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Pressable, ScrollView, StyleSheet,
    TouchableOpacity, View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function GeneratePlanScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const router = useRouter();
    const { profile } = useCurrentUser();

    const {
        phase, goalsSubPhase, loading, isSaving, saveError,
        selectedSportSlug, allEnvs, selectedEnvIds,
        allEquipment, selectedEquipmentIds,
        ambiguousEquipment, equipmentEnvSelections,
        allCategories, selectedCategoryIds, rankedCategories,
        weightKg, heightCm, weightUnit, heightUnit,
        preferredDays, preferredDuration, scheduleNotes, dayEnvMap,
        sportSessions,
        initialize,
        setSelectedSportSlug, toggleEnv, toggleEquipment, toggleEquipmentEnv,
        toggleCategory, setRankedCategories,
        setWeightKg, setHeightCm, setWeightUnit, setHeightUnit,
        togglePreferredDay, setPreferredDuration, setScheduleNotes, toggleDayEnv,
        toggleSportDay, setSportType, setSportIntensity,
        goBack, goNext, generate,
    } = usePlanWizardStore();

    useEffect(() => {
        if (profile) initialize(profile);
    }, [profile]);

    const canProceedNext =
        phase === 'sport' ? !!selectedSportSlug :
        phase === 'environment' ? selectedEnvIds.size > 0 :
        phase === 'goals' ? selectedCategoryIds.size > 0 :
        phase === 'schedule' ? preferredDays.size >= 2 && preferredDuration !== null :
        true;

    return (
        <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>

            {/* Header */}
            <View style={[styles.header]}>
                <Pressable onPress={() => goBack(router)} hitSlop={12}>
                    <Ionicons
                        name={phase === 'sport' ? 'close' : 'arrow-back'}
                        size={24}
                        color={theme.text}
                    />
                </Pressable>
                <View style={styles.headerCenter}>
                    <JempText type="body-l" color={theme.textMuted}>{t('ui.new_plan')}</JempText>
                    <StepBars phase={phase} />
                </View>
                <View style={{ width: 24 }} />
            </View>

            {/* ── Sport ── */}
            {phase === 'sport' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('ui.sport')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.sport_subtitle')}
                    </JempText>
                    {SPORT_GROUPS.map(group => (
                        <View key={group.titleKey} style={styles.group}>
                            <JempText type="caption" color={theme.textSubtle} style={styles.groupTitle}>
                                {t(group.titleKey as any).toUpperCase()}
                            </JempText>
                            <View style={styles.chipGrid}>
                                {group.sports.map(sport => (
                                    <SelectableChip
                                        key={sport.slug}
                                        label={getSportLabelI18n(sport.slug, t) ?? sport.slug}
                                        selected={selectedSportSlug === sport.slug}
                                        onPress={() => setSelectedSportSlug(sport.slug)}
                                    />
                                ))}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* ── Environment ── */}
            {phase === 'environment' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.environment_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.environment_subtitle')}
                    </JempText>
                    <View style={styles.envList}>
                        {allEnvs.map(env => (
                            <SelectableRow
                                key={env.id}
                                label={env.name_i18n?.[locale] ?? env.slug}
                                description={env.description_i18n?.[locale]}
                                icon={env.icon}
                                selected={selectedEnvIds.has(env.id)}
                                onPress={() => toggleEnv(env.id)}
                            />
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* ── Equipment ── */}
            {phase === 'equipment' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.equipment_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.equipment_subtitle')}
                    </JempText>
                    <View style={styles.chipGrid}>
                        {allEquipment.map(eq => (
                            <SelectableChip
                                key={eq.id}
                                label={eq.name_i18n?.[locale] ?? eq.slug}
                                selected={selectedEquipmentIds.has(eq.id)}
                                onPress={() => toggleEquipment(eq.id)}
                            />
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* ── Equipment environment ── */}
            {phase === 'equipment-env' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>
                        {t('onboarding.equipment_location_title')}
                    </JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('onboarding.equipment_location_subtitle')}
                    </JempText>
                    {ambiguousEquipment.map(eq => {
                        const eqSelections = equipmentEnvSelections.get(eq.id) ?? new Set<string>();
                        return (
                            <View key={eq.id} style={styles.equipmentEnvRow}>
                                <JempText type="body-l" color={theme.text} style={styles.equipmentEnvLabel}>
                                    {eq.name_i18n?.[locale] ?? eq.slug}
                                </JempText>
                                <View style={styles.chipGrid}>
                                    {eq.compatibleEnvIds.map(envId => {
                                        const env = allEnvs.find(e => e.id === envId);
                                        if (!env) return null;
                                        return (
                                            <SelectableChip
                                                key={envId}
                                                label={env.name_i18n?.[locale] ?? env.slug}
                                                selected={eqSelections.has(envId)}
                                                onPress={() => toggleEquipmentEnv(eq.id, envId)}
                                            />
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {/* ── Goals ── */}
            {phase === 'goals' && goalsSubPhase === 'select' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('goals.select_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('goals.select_subtitle')}
                    </JempText>
                    <View style={styles.chipGrid}>
                        {allCategories.map(cat => (
                            <SelectableChip
                                key={cat.id}
                                label={cat.label}
                                selected={selectedCategoryIds.has(cat.id)}
                                onPress={() => toggleCategory(cat.id)}
                            />
                        ))}
                    </View>
                </ScrollView>
            )}

            {phase === 'goals' && goalsSubPhase === 'rank' && (
                <DraggableFlatList
                    data={rankedCategories}
                    keyExtractor={item => item.id}
                    onDragEnd={({ data }) => setRankedCategories(data)}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, drag }: RenderItemParams<(typeof rankedCategories)[number]>) => {
                        const index = rankedCategories.indexOf(item);
                        return (
                            <ScaleDecorator activeScale={1.03}>
                                <TouchableOpacity
                                    onLongPress={drag}
                                    activeOpacity={1}
                                    style={[styles.rankRow, { backgroundColor: theme.surface }]}
                                >
                                    <JempText type="caption" color={theme.textMuted} style={styles.rankNumber}>
                                        {index + 1}
                                    </JempText>
                                    <JempText type="body-l" color={theme.text} style={{ flex: 1 }}>
                                        {item.label}
                                    </JempText>
                                    <Ionicons name="reorder-three-outline" size={22} color={theme.textMuted} />
                                </TouchableOpacity>
                            </ScaleDecorator>
                        );
                    }}
                    ListHeaderComponent={
                        <View>
                            <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('goals.rank_title')}</JempText>
                            <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                                {t('goals.rank_subtitle')}
                            </JempText>
                        </View>
                    }
                />
            )}

            {/* ── Body data ── */}
            {phase === 'body' && (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.body_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.body_subtitle')}
                    </JempText>
                    <WeightSlider
                        valueKg={weightKg}
                        onChange={setWeightKg}
                        unit={weightUnit}
                        onToggleUnit={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}
                    />
                    <HeightSlider
                        valueCm={heightCm}
                        onChange={setHeightCm}
                        unit={heightUnit}
                        onToggleUnit={() => setHeightUnit(heightUnit === 'cm' ? 'ft' : 'cm')}
                    />
                </ScrollView>
            )}

            {/* ── Schedule ── */}
            {phase === 'schedule' && (
                <KeyboardAwareScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <JempText type="h1" color={theme.text} style={styles.bodyTitle}>{t('plan.schedule_title')}</JempText>
                    <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                        {t('plan.schedule_subtitle')}
                    </JempText>

                    <View style={styles.section}>
                        <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                            {t('onboarding.workout_prefs_days_label')}
                        </JempText>
                        <View style={styles.dayChipRow}>
                            {WEEK_DAYS.map(({ dow, key }) => (
                                <SelectableChip
                                    key={dow}
                                    label={t(key as any)}
                                    selected={preferredDays.has(dow)}
                                    onPress={() => togglePreferredDay(dow)}
                                    style={styles.dayChip}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                            {t('plan.schedule_duration_label')}
                        </JempText>
                        <View style={styles.durationRow}>
                            {DURATIONS.map(d => (
                                <SelectableChip
                                    key={d.value}
                                    label={d.label}
                                    selected={preferredDuration === d.value}
                                    onPress={() => setPreferredDuration(d.value)}
                                    style={styles.durationChip}
                                />
                            ))}
                        </View>
                    </View>

                    {selectedEnvIds.size > 1 && preferredDays.size > 0 && (
                        <View style={styles.section}>
                            <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                                {t('onboarding.workout_prefs_env_label')}
                            </JempText>
                            <JempText type="body-sm" color={theme.textMuted} style={styles.notesHint}>
                                {t('onboarding.workout_prefs_env_hint')}
                            </JempText>
                            {[...preferredDays].sort((a, b) => a - b).map(dow => {
                                const dayKey = WEEK_DAYS.find(d => d.dow === dow)?.key;
                                const selectedEnvs = allEnvs.filter(e => selectedEnvIds.has(e.id));
                                return (
                                    <View key={dow} style={styles.dayEnvRow}>
                                        <JempText type="body-l" style={styles.dayEnvLabel}>
                                            {dayKey ? t(dayKey as any) : ''}
                                        </JempText>
                                        <View style={styles.dayEnvChips}>
                                            {selectedEnvs.map(env => (
                                                <SelectableChip
                                                    key={env.id}
                                                    label={env.name_i18n?.[locale] ?? env.slug}
                                                    selected={dayEnvMap[dow] === env.id}
                                                    onPress={() => toggleDayEnv(dow, env.id)}
                                                    style={styles.dayEnvChip}
                                                />
                                            ))}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <View style={styles.section}>
                        <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                            {t('plan.schedule_notes_label')}
                        </JempText>
                        <JempText type="body-sm" color={theme.textMuted} style={styles.notesHint}>
                            {t('plan.schedule_notes_hint')}
                        </JempText>
                        <JempInput
                            value={scheduleNotes}
                            onChangeText={setScheduleNotes}
                            placeholder={t('plan.schedule_notes_placeholder')}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            style={styles.notesInput}
                        />
                    </View>
                </KeyboardAwareScrollView>
            )}

            {/* ── Weekly sport schedule ── */}
            {phase === 'weekly' && (() => {
                const selectedSportDays = new Set(sportSessions.map(s => s.day_of_week));
                const sortedSportSessions = [...sportSessions].sort((a, b) => a.day_of_week - b.day_of_week);
                return (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <JempText type="h1" color={theme.text} style={styles.bodyTitle}>
                            {t('onboarding.weekly_schedule_title')}
                        </JempText>
                        <JempText type="caption" color={theme.textMuted} style={styles.subtitle}>
                            {t('onboarding.weekly_schedule_subtitle')}
                        </JempText>

                        <View style={styles.section}>
                            <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                                {t('onboarding.weekly_schedule_days_label')}
                            </JempText>
                            <View style={styles.dayChipRow}>
                                {WEEK_DAYS.map(({ dow, key }) => (
                                    <SelectableChip
                                        key={dow}
                                        label={t(key as any)}
                                        selected={selectedSportDays.has(dow)}
                                        onPress={() => toggleSportDay(dow)}
                                        style={styles.dayChip}
                                    />
                                ))}
                            </View>
                        </View>

                        {sortedSportSessions.map(session => {
                            const dayLabel = WEEK_DAYS.find(d => d.dow === session.day_of_week);
                            const preferredDaysArray = [...preferredDays];

                            function getAffectedJempDays(sportDay: number, mode: 'adjacent' | 'same'): number[] {
                                if (mode === 'same') return preferredDaysArray.includes(sportDay) ? [sportDay] : [];
                                const prev = sportDay === 1 ? 7 : sportDay - 1;
                                const next = sportDay === 7 ? 1 : sportDay + 1;
                                return preferredDaysArray.filter(d => d === prev || d === next);
                            }

                            function formatDays(days: number[]): string {
                                return days.map(d => t(WEEK_DAYS.find(x => x.dow === d)?.key as any ?? '')).join(', ');
                            }

                            return (
                                <View key={session.day_of_week} style={[styles.sportCard, { backgroundColor: theme.surface }]}>
                                    <View style={styles.sportCardHeader}>
                                        <JempText type="body-sm" style={{ fontWeight: '600' }}>
                                            {t(dayLabel?.key as any)}
                                        </JempText>
                                        <TouchableOpacity onPress={() => toggleSportDay(session.day_of_week)} hitSlop={12}>
                                            <JempText type="body-sm" color={theme.textMuted}>✕</JempText>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.chipGrid}>
                                        {getSessionTypes(selectedSportSlug, COMBAT_SPORTS).map(st => (
                                            <SelectableChip
                                                key={st.key}
                                                label={t(st.labelKey as any)}
                                                selected={session.type === st.key}
                                                onPress={() => setSportType(session.day_of_week, st.key)}
                                                size="sm"
                                            />
                                        ))}
                                    </View>

                                    {(session.type === 'game' || session.type === 'tournament') && (() => {
                                        const prev = session.day_of_week === 1 ? 7 : session.day_of_week - 1;
                                        const next = session.day_of_week === 7 ? 1 : session.day_of_week + 1;
                                        const affected = preferredDaysArray.filter(d => d === prev || d === next);
                                        if (affected.length === 0) return null;
                                        return (
                                            <View style={styles.hintBox}>
                                                <JempText type="body-sm" color={GradientMid}>
                                                    {t('onboarding.weekly_schedule_hint_game', { days: formatDays(affected) })}
                                                </JempText>
                                            </View>
                                        );
                                    })()}

                                    {session.type !== 'game' && session.type !== 'tournament' && (
                                        <View style={styles.intensityRow}>
                                            <View style={styles.intensityHeader}>
                                                <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
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
                                                onValueChange={v => setSportIntensity(session.day_of_week, v)}
                                                minimumTrackTintColor={GradientMid}
                                                maximumTrackTintColor={theme.borderStrong}
                                                thumbTintColor={theme.text}
                                            />
                                            {session.intensity === 7 && (() => {
                                                const sameDay = getAffectedJempDays(session.day_of_week, 'same');
                                                if (sameDay.length === 0) return null;
                                                return (
                                                    <View style={styles.hintBox}>
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
                                                    <View style={styles.hintBox}>
                                                        <JempText type="body-sm" color={GradientMid}>
                                                            {t(key, { sameDays: formatDays(sameDay), adjacentDays: formatDays(adjacent) })}
                                                        </JempText>
                                                    </View>
                                                );
                                            })()}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                );
            })()}

            {/* Fixed bottom button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20), backgroundColor: theme.background }]}>
                {saveError && (
                    <JempText type="body-sm" color="#ef4444" style={{ textAlign: 'center', marginBottom: 8 }}>
                        {saveError}
                    </JempText>
                )}
                <Pressable
                    onPress={phase === 'weekly' ? () => generate(router) : goNext}
                    disabled={!canProceedNext || isSaving}
                    style={styles.bottomBtn}
                >
                    <LinearGradient
                        colors={canProceedNext ? GRADIENT : [theme.surface, theme.surface]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.bottomBtnGradient}
                    >
                        {isSaving
                            ? <ActivityIndicator color="#fff" />
                            : <JempText type="button" color={canProceedNext ? '#fff' : theme.textMuted}>
                                {phase === 'weekly' ? t('plan.create') : t('ui.continue')}
                            </JempText>
                        }
                    </LinearGradient>
                </Pressable>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerCenter: { flex: 1, alignItems: 'center', gap: 15, paddingHorizontal: 12 },

    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },

    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    bottomBtn: { borderRadius: 100, overflow: 'hidden' },
    bottomBtnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },

    // Sport / Equipment chips
    group: { marginBottom: 24 },
    groupTitle: { letterSpacing: 1, fontSize: 11, marginBottom: 10 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

    // Goals rank
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 10,
    },
    rankNumber: { width: 20, textAlign: 'center' },

    // Environment cards
    envList: { gap: 12 },

    // Equipment environment
    equipmentEnvRow: { marginBottom: 24 },
    equipmentEnvLabel: { marginBottom: 10 },

    // Schedule
    section: { marginBottom: 32 },
    sectionLabel: {
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 14,
    },
    dayChipRow: { flexDirection: 'row', gap: 6 },
    dayChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    durationRow: { flexDirection: 'row', gap: 8 },
    durationChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    notesHint: { marginBottom: 12 },
    notesInput: { minHeight: 100 },
    dayEnvRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    dayEnvLabel: { width: 28 },
    dayEnvChips: { flexDirection: 'row', gap: 8, flex: 1 },
    dayEnvChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },

    // Weekly sport schedule
    sportCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
    sportCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    intensityRow: { marginTop: 12 },
    intensityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    slider: { width: '100%', height: 40, marginHorizontal: -8 },
    hintBox: {
        marginTop: 10,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(61, 158, 203, 0.15)',
    },

    closePlanBtn: {
        borderRadius: 100,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
