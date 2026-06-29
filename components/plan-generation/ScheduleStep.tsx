import { JempText } from '@/components/jemp-text';
import { JempInput } from '@/components/ui/jemp-input';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { DURATIONS, WEEK_DAYS } from '@/constants/plan-generation-constants';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

export function ScheduleStep() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const {
        preferredDays, togglePreferredDay,
        preferredDuration, setPreferredDuration,
        selectedEnvIds, allEnvs,
        dayEnvMap, toggleDayEnv,
        scheduleNotes, setScheduleNotes,
    } = usePlanWizardStore();

    return (
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
                {preferredDays.size > 0 && (
                    <JempText type="body-sm" color={theme.textMuted} style={styles.daysCounter}>
                        {preferredDays.size}× {t('onboarding.workout_prefs_days_counter')}
                    </JempText>
                )}
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
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    section: { marginBottom: 32 },
    sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
    dayChipRow: { flexDirection: 'row', gap: 6 },
    daysCounter: { marginTop: 10 },
    dayChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    durationRow: { flexDirection: 'row', gap: 8 },
    durationChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    notesHint: { marginBottom: 12 },
    notesInput: { minHeight: 100 },
    dayEnvRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    dayEnvLabel: { width: 28 },
    dayEnvChips: { flexDirection: 'row', gap: 8, flex: 1 },
    dayEnvChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
});
