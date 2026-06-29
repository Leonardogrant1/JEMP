import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { formatTargetReps, loadUnit } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

export function UniLoadSet() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

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
    const repsTarget = formatTargetReps(current.target_reps_min, current.target_reps_max);

    return (
        <View style={styles.rows}>
            {(['left', 'right'] as const).map(side => {
                const isLeft = side === 'left';
                const sideReps = isLeft ? repsLeft : repsRight;
                const setSideReps = isLeft ? setRepsLeft : setRepsRight;
                const sideLoad = isLeft ? loadLeft : loadRight;
                const setSideLoad = isLeft ? setLoadLeft : setLoadRight;

                return (
                    <View key={side} style={styles.row}>
                        <JempText type="caption" color={theme.textMuted} style={styles.sideLabel}>
                            {isLeft ? 'LINKS' : 'RECHTS'}
                        </JempText>
                        <View style={styles.inputRow}>
                            {showLoad && (
                                <>
                                    <View style={styles.inputGroup}>
                                        <JempText type="caption" color={theme.textMuted}>
                                            {t('ui.load').toUpperCase()} ({unit.toUpperCase()})
                                        </JempText>
                                        <View style={[styles.pillInput, { backgroundColor: theme.surface }]}>
                                            <TextInput
                                                style={[styles.pillTextInput, { color: theme.text }]}
                                                value={sideLoad}
                                                onChangeText={setSideLoad}
                                                keyboardType="decimal-pad"
                                                placeholder="–"
                                                placeholderTextColor={theme.textPlaceholder}
                                            />
                                        </View>
                                    </View>
                                    <JempText type="h2" color={theme.textMuted} style={styles.divider}>×</JempText>
                                </>
                            )}
                            <View style={styles.inputGroup}>
                                <JempText type="caption" color={theme.textMuted}>
                                    {t('ui.reps').toUpperCase()}
                                </JempText>
                                <View style={[styles.pillInput, { backgroundColor: theme.surface }]}>
                                    <TextInput
                                        style={[styles.pillTextInput, { color: theme.text }]}
                                        value={sideReps}
                                        onChangeText={setSideReps}
                                        keyboardType="number-pad"
                                        placeholder={repsTarget !== '–' ? repsTarget : '–'}
                                        placeholderTextColor={theme.textPlaceholder}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    rows: { gap: 16 },
    row: { gap: 8 },
    sideLabel: { letterSpacing: 1.5 },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
    inputGroup: { flex: 1, gap: 6 },
    divider: { paddingBottom: 12 },
    pillInput: { borderRadius: 14, height: 56, justifyContent: 'center', alignItems: 'center' },
    pillTextInput: { fontSize: 24, fontWeight: '700', textAlign: 'center', width: '100%', height: '100%' },
});
