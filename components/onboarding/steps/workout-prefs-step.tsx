import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOnboardingControl } from '@/components/onboarding/onboarding-control-context';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { SessionDuration } from '@/types/database';

const DAYS: { value: number; label: string }[] = [
    { value: 1, label: 'Mo' },
    { value: 2, label: 'Di' },
    { value: 3, label: 'Mi' },
    { value: 4, label: 'Do' },
    { value: 5, label: 'Fr' },
    { value: 6, label: 'Sa' },
    { value: 7, label: 'So' },
];

const DURATIONS: { value: SessionDuration; label: string }[] = [
    { value: '30min', label: '30 min' },
    { value: '45min', label: '45 min' },
    { value: '60min', label: '60 min' },
    { value: '90min', label: '90 min' },
];

export function WorkoutPrefsStep() {
    const { setCanContinue } = useOnboardingControl();
    const setStore = useOnboardingStore((s) => s.set);
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
    const [selectedDuration, setSelectedDuration] = useState<SessionDuration | null>(null);

    function validate(days: Set<number>, duration: SessionDuration | null) {
        setCanContinue(days.size > 0 && duration !== null);
    }

    function toggleDay(value: number) {
        setSelectedDays((prev) => {
            const next = new Set(prev);
            if (next.has(value)) {
                next.delete(value);
            } else {
                next.add(value);
            }
            const days = Array.from(next);
            setStore({ preferred_workout_days: days });
            validate(next, selectedDuration);
            return next;
        });
    }

    function selectDuration(value: SessionDuration) {
        setSelectedDuration(value);
        setStore({ preferred_session_duration: value });
        validate(selectedDays, value);
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Training planen</Text>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Trainingstage</Text>
                <View style={styles.dayRow}>
                    {DAYS.map((day) => (
                        <TouchableOpacity
                            key={day.value}
                            style={[styles.dayChip, selectedDays.has(day.value) && styles.dayChipSelected]}
                            onPress={() => toggleDay(day.value)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.dayText, selectedDays.has(day.value) && styles.dayTextSelected]}>
                                {day.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Einheitsdauer</Text>
                <View style={styles.durationGrid}>
                    {DURATIONS.map((d) => (
                        <TouchableOpacity
                            key={d.value}
                            style={[styles.durationChip, selectedDuration === d.value && styles.durationChipSelected]}
                            onPress={() => selectDuration(d.value)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.durationText, selectedDuration === d.value && styles.durationTextSelected]}>
                                {d.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
    title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 36 },
    section: { marginBottom: 36 },
    sectionLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 14,
    },
    dayRow: { flexDirection: 'row', gap: 8 },
    dayChip: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    dayChipSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    dayText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
    dayTextSelected: { color: 'white' },
    durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    durationChip: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    durationChipSelected: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'white',
    },
    durationText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600' },
    durationTextSelected: { color: 'white' },
});
