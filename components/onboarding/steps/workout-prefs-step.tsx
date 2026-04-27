import { JempText } from '@/components/jemp-text';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { JempInput } from '@/components/ui/jemp-input';
import { SelectableChip } from '@/components/ui/selectable-chip';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { SessionDuration } from '@/types/database';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown } from 'react-native-reanimated';

const DURATIONS: { value: SessionDuration; label: string }[] = [
    { value: '30min', label: '30 min' },
    { value: '45min', label: '45 min' },
    { value: '60min', label: '60 min' },
    { value: '90min', label: '90 min' },
];

export function WorkoutPrefsStep() {
    const { t } = useTranslation();
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
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

    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
    const [selectedDuration, setSelectedDuration] = useState<SessionDuration | null>(null);
    const [notes, setNotes] = useState('');

    function validate(days: Set<number>, duration: SessionDuration | null) {
        setCanContinue(days.size > 0 && duration !== null);
    }

    function toggleDay(value: number) {
        setSelectedDays((prev) => {
            const next = new Set(prev);
            next.has(value) ? next.delete(value) : next.add(value);
            setStore({ preferred_workout_days: Array.from(next) });
            validate(next, selectedDuration);
            return next;
        });
    }

    function selectDuration(value: SessionDuration) {
        setSelectedDuration(value);
        setStore({ preferred_session_duration: value });
        validate(selectedDays, value);
    }

    function handleNotesChange(text: string) {
        setNotes(text);
        setStore({ schedule_notes: text.trim() || null });
    }

    return (
        <KeyboardAwareScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.delay(100).duration(500).springify()}>
                <JempText type="h1" style={styles.title}>{t('onboarding.workout_prefs_title')}</JempText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(240).duration(500).springify()}>
                <JempText type="body-l" color={theme.textMuted} style={styles.subtitle}>
                    {t('onboarding.workout_prefs_subtitle')}
                </JempText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(360).duration(500).springify()}>
                <View style={styles.section}>
                    <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                        {t('onboarding.workout_prefs_days_label')}
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
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(480).duration(500).springify()}>
                <View style={styles.section}>
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
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).duration(500).springify()}>
                <View style={styles.section}>
                    <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                        {t('onboarding.workout_prefs_notes_label')}
                    </JempText>
                    <JempText type="body-sm" color={theme.textMuted} style={styles.notesHint}>
                        {t('onboarding.workout_prefs_notes_hint')}
                    </JempText>
                    <JempInput
                        value={notes}
                        onChangeText={handleNotesChange}
                        placeholder={t('onboarding.workout_prefs_notes_placeholder')}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        style={styles.notesInput}
                    />
                </View>
            </Animated.View>
        </KeyboardAwareScrollView>
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
    subtitle: { marginBottom: 36 },
    section: { marginBottom: 32 },
    sectionLabel: {
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 14,
    },
    dayRow: { flexDirection: 'row', gap: 6 },
    dayChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    durationRow: { flexDirection: 'row', gap: 8 },
    durationChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0, borderRadius: 12 },
    notesHint: { marginBottom: 12 },
    notesInput: { minHeight: 100 },
});
