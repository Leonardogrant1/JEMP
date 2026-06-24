import { JempText } from '@/components/jemp-text';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { WEEK_DAYS } from '@/constants/plan-generation-constants';
import { Colors, GradientMid } from '@/constants/theme';
import { getSessionTypes } from '@/helpers/plan-generation-helpers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlanWizardStore } from '@/stores/plan-wizard-store';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';


function getAffectedJempDays(sportDay: number, mode: 'adjacent' | 'same', preferredDaysArray: number[]): number[] {
    if (mode === 'same') return preferredDaysArray.includes(sportDay) ? [sportDay] : [];
    const prev = sportDay === 1 ? 7 : sportDay - 1;
    const next = sportDay === 7 ? 1 : sportDay + 1;
    return preferredDaysArray.filter(d => d === prev || d === next);
}

function formatDays(days: number[], t: (key: any) => string): string {
    return days.map(d => t(WEEK_DAYS.find(x => x.dow === d)?.key as any ?? '')).join(', ');
}

export function WeeklyStep() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const {
        sportSessions, selectedSportSlug, preferredDays, combatSportSlugs,
        toggleSportDay, setSportType, setSportIntensity,
    } = usePlanWizardStore();

    const selectedSportDays = new Set(sportSessions.map(s => s.day_of_week));
    const sortedSportSessions = [...sportSessions].sort((a, b) => a.day_of_week - b.day_of_week);
    const preferredDaysArray = [...preferredDays];

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
                            {getSessionTypes(selectedSportSlug, combatSportSlugs).map(st => (
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
                                        {t('onboarding.weekly_schedule_hint_game', { days: formatDays(affected, t) })}
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
                                    const sameDay = getAffectedJempDays(session.day_of_week, 'same', preferredDaysArray);
                                    if (sameDay.length === 0) return null;
                                    return (
                                        <View style={styles.hintBox}>
                                            <JempText type="body-sm" color={GradientMid}>
                                                {t('onboarding.weekly_schedule_hint_intensity_7', { days: formatDays(sameDay, t) })}
                                            </JempText>
                                        </View>
                                    );
                                })()}
                                {session.intensity >= 8 && (() => {
                                    const sameDay = getAffectedJempDays(session.day_of_week, 'same', preferredDaysArray);
                                    const adjacent = getAffectedJempDays(session.day_of_week, 'adjacent', preferredDaysArray);
                                    if (sameDay.length === 0 && adjacent.length === 0) return null;
                                    const key = sameDay.length > 0 && adjacent.length > 0
                                        ? 'onboarding.weekly_schedule_hint_intensity_8plus_both'
                                        : sameDay.length > 0
                                            ? 'onboarding.weekly_schedule_hint_intensity_8plus_same'
                                            : 'onboarding.weekly_schedule_hint_intensity_8plus_adjacent';
                                    return (
                                        <View style={styles.hintBox}>
                                            <JempText type="body-sm" color={GradientMid}>
                                                {t(key, { sameDays: formatDays(sameDay, t), adjacentDays: formatDays(adjacent, t) })}
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
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
    bodyTitle: { marginBottom: 6 },
    subtitle: { lineHeight: 20, marginBottom: 24 },
    section: { marginBottom: 32 },
    sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
    dayChipRow: { flexDirection: 'row', gap: 6 },
    dayChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
});
