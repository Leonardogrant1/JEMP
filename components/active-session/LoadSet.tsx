import { LoadWheel } from '@/components/active-session/LoadWheel';
import { SetWheel } from '@/components/active-session/SetWheel';
import { loadUnit } from '@/helpers/format';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

export function LoadSet() {
    const { t } = useTranslation();

    const { exerciseIdx } = useActiveSessionTransition();
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const current = allExercises[exerciseIdx] ?? null;

    const load = useActiveSessionUIStore(s => s.load);
    const reps = useActiveSessionUIStore(s => s.reps);
    const setLoad = useActiveSessionUIStore(s => s.setLoad);
    const setReps = useActiveSessionUIStore(s => s.setReps);

    if (!current) return null;

    const unit = loadUnit(current.target_load_type);
    const showLoad = unit !== '';
    const repsFallback = current.target_reps_min ?? current.target_reps_max ?? 8;
    const loadFallback = current.target_load_value ?? 0;

    return (
        // Reps zuerst, dann Gewicht (zweigeteilt: kg + Nachkomma)
        <View style={styles.wheelRow}>
            <SetWheel
                label={t('ui.reps')}
                value={reps}
                fallback={repsFallback}
                onChange={setReps}
            />
            {showLoad && (
                <LoadWheel
                    label={`${t('ui.load')} (${unit})`}
                    value={load}
                    fallback={loadFallback}
                    onChange={setLoad}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wheelRow: {
        flexDirection: 'row',
        gap: 16,
    },
});
