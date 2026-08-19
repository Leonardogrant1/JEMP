import { LoadWheel } from '@/components/active-session/LoadWheel';
import { SetWheel } from '@/components/active-session/SetWheel';
import { loadUnit } from '@/helpers/format';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

/** Wheels für EINE Seite einer unilateralen Übung — die Seite kommt vom Log-Flow. */
export function SideLoadSet({ side }: { side: 'left' | 'right' }) {
    const { t } = useTranslation();

    const { exerciseIdx } = useActiveSessionTransition();
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const current = allExercises[exerciseIdx] ?? null;

    const repsLeft = useActiveSessionUIStore(s => s.repsLeft);
    const repsRight = useActiveSessionUIStore(s => s.repsRight);
    const loadLeft = useActiveSessionUIStore(s => s.loadLeft);
    const loadRight = useActiveSessionUIStore(s => s.loadRight);
    const setRepsLeft = useActiveSessionUIStore(s => s.setRepsLeft);
    const setRepsRight = useActiveSessionUIStore(s => s.setRepsRight);
    const setLoadLeft = useActiveSessionUIStore(s => s.setLoadLeft);
    const setLoadRight = useActiveSessionUIStore(s => s.setLoadRight);

    if (!current) return null;

    const unit = loadUnit(current.target_load_type);
    const showLoad = unit !== '';
    const repsFallback = current.target_reps_min ?? current.target_reps_max ?? 8;
    const loadFallback = current.target_load_value ?? 0;
    const isLeft = side === 'left';

    return (
        <View style={styles.wheelRow}>
            <SetWheel
                label={t('ui.reps')}
                value={isLeft ? repsLeft : repsRight}
                fallback={repsFallback}
                onChange={isLeft ? setRepsLeft : setRepsRight}
            />
            {showLoad && (
                <LoadWheel
                    label={`${t('ui.load')} (${unit})`}
                    value={isLeft ? loadLeft : loadRight}
                    fallback={loadFallback}
                    onChange={isLeft ? setLoadLeft : setLoadRight}
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
