import { JempText } from '@/components/jemp-text';
import { Colors, GradientMid } from '@/constants/theme';
import { formatTimer } from '@/helpers/active-session-helpers';
import { formatTargetReps, loadUnit } from '@/helpers/format';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveSessionTransition } from '@/providers/active-session-transition-provider';
import { type PendingSet, useActiveSessionStore } from '@/stores/active-session-store';
import { useActiveSessionUIStore } from '@/stores/active-session-ui-store';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

function formatSingleSet(s: PendingSet, unit: string): string {
    const value = s.performed_duration_seconds != null
        ? formatTimer(s.performed_duration_seconds)
        : String(s.performed_reps ?? '–');
    const load = s.performed_load_value != null && unit
        ? `${s.performed_load_value} ${unit} × `
        : '';
    return `${load}${value}`;
}

/**
 * Satz-Übersicht der aktuellen Übung: geloggte Werte pro Satz, der aktive
 * Satz hervorgehoben, kommende Sätze mit dem Zielwert.
 */
export function SetTable() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    const { exerciseIdx, currentSet } = useActiveSessionTransition();
    const allExercises = useActiveSessionUIStore(s => s.allExercises);
    const setShowLogSheet = useActiveSessionUIStore(s => s.setShowLogSheet);
    const suggestionHint = useActiveSessionUIStore(s => s.suggestionHint);
    const pendingSets = useActiveSessionStore(s => s.pendingSets);

    const current = allExercises[exerciseIdx] ?? null;
    if (!current) return null;

    const totalSets = current.target_sets ?? 1;
    const unit = loadUnit(current.target_load_type);
    const isDuration = current.exercise.measurement_type === 'duration';
    const isUnilateral = current.exercise.laterality === 'unilateral';

    const targetLabel = isDuration
        ? formatTimer(current.target_duration_seconds ?? 0)
        : `${formatTargetReps(current.target_reps_min, current.target_reps_max)} ${t('ui.reps').toLowerCase()}`;
    // Kurzform für die kleinen L/R-Kacheln
    const tileTarget = isDuration
        ? formatTimer(current.target_duration_seconds ?? 0)
        : formatTargetReps(current.target_reps_min, current.target_reps_max);

    return (
        <View style={styles.table}>
            {Array.from({ length: totalSets }, (_, i) => {
                const setNumber = i + 1;
                const logged = pendingSets.filter(
                    s => s.workout_session_block_exercise_id === current.id && s.set_number === setNumber,
                );
                const isActive = setNumber === currentSet;
                const isDone = logged.length > 0 && !isActive;
                const isUpcoming = !isActive && !isDone;

                const canOpenSheet = isActive;

                return (
                    <Pressable
                        key={setNumber}
                        disabled={!canOpenSheet}
                        onPress={() => setShowLogSheet(true)}
                        style={[
                            styles.row,
                            isActive && { backgroundColor: `${GradientMid}18`, borderColor: GradientMid },
                            !isActive && styles.rowIdle,
                            isUpcoming && styles.rowUpcoming,
                        ]}
                    >
                        <View style={styles.rowLeft}>
                            {isDone ? (
                                <Ionicons name="checkmark-circle" size={22} color={GradientMid} />
                            ) : (
                                <View style={[
                                    styles.numberBadge,
                                    { borderColor: isActive ? GradientMid : theme.borderDivider },
                                ]}>
                                    <JempText type="caption" color={isActive ? GradientMid : theme.textMuted}>
                                        {setNumber}
                                    </JempText>
                                </View>
                            )}
                            <JempText type="body-l" color={isActive ? theme.text : theme.textMuted}>
                                {t('ui.set_label', { number: setNumber })}
                            </JempText>
                        </View>
                        <View style={styles.rowRight}>
                            {isUnilateral ? (
                                // Eine Kachel pro Seite — geloggt wird seitenweise
                                // mit Pause dazwischen
                                <View style={styles.sideTiles}>
                                    {(['left', 'right'] as const).map(side => {
                                        const sideLog = logged.find(s => s.side === side);
                                        const leftLogged = logged.some(s => s.side === 'left');
                                        const isSideActive = isActive && !sideLog
                                            && (side === 'left' ? !leftLogged : leftLogged);
                                        return (
                                            <View
                                                key={side}
                                                style={[
                                                    styles.sideTile,
                                                    { borderColor: isSideActive ? GradientMid : theme.borderDivider },
                                                    isSideActive && { backgroundColor: `${GradientMid}18` },
                                                ]}
                                            >
                                                <JempText type="caption" color={isSideActive ? GradientMid : theme.textMuted}>
                                                    {side === 'left' ? 'L' : 'R'}
                                                </JempText>
                                                <JempText type="body-sm" color={sideLog ? theme.text : theme.textMuted}>
                                                    {sideLog ? formatSingleSet(sideLog, unit) : tileTarget}
                                                </JempText>
                                            </View>
                                        );
                                    })}
                                </View>
                            ) : logged.length > 0 ? (
                                <JempText type="body-l" color={isDone ? theme.text : theme.textMuted}>
                                    {formatSingleSet(logged[0], unit)}
                                </JempText>
                            ) : isActive && suggestionHint ? (
                                // Progression-Empfehlung direkt am aktiven Satz
                                <View style={styles.suggestion}>
                                    <Ionicons name="trending-up" size={16} color={GradientMid} />
                                    <JempText type="body-l" color={GradientMid}>
                                        {suggestionHint}
                                    </JempText>
                                </View>
                            ) : (
                                <JempText type="body-l" color={theme.textMuted}>
                                    {targetLabel}
                                </JempText>
                            )}
                            {canOpenSheet && (
                                <Ionicons name="create-outline" size={18} color={GradientMid} />
                            )}
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    table: {
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    rowIdle: {
        borderColor: 'transparent',
    },
    rowUpcoming: {
        opacity: 0.55,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    suggestion: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    sideTiles: {
        flexDirection: 'row',
        gap: 6,
    },
    sideTile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 10,
        borderWidth: 1,
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
    numberBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
