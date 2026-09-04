export type PerformedSet = {
    set_number: number;
    performed_reps: number | null;
    performed_load_value: number | null;
    performed_duration_seconds: number | null;
};

export type ProgressionSuggestion = {
    suggestedLoad: string | null;
    suggestedReps: string | null;
    previousLoad: number | null;
    previousReps: number | null;
};

function getSetForNumber(sets: PerformedSet[], setNumber: number): PerformedSet | null {
    return sets.find(s => s.set_number === setNumber) ?? sets[sets.length - 1] ?? null;
}

export function calculateProgression(
    loadType: string | null,
    previousSets: PerformedSet[],
    currentSetNumber: number,
    targetRepsMax: number | null,
): ProgressionSuggestion | null {
    if (!previousSets.length) return null;

    const prevSet = getSetForNumber(previousSets, currentSetNumber);
    if (!prevSet) return null;

    if (loadType === 'kg') {
        const prevLoad = prevSet.performed_load_value;
        const prevReps = prevSet.performed_reps;
        // Double Progression: Mehrgewicht erst vorschlagen, wenn dieser Satz
        // letztes Mal das OBERE Ende des Wiederholungsfensters erreicht hat.
        // Wer bei 4×4–6 nur 4 geschafft hat, baut erst Reps auf — kein Hint.
        const hitTopOfRange = prevReps != null
            && targetRepsMax != null && targetRepsMax > 0
            && prevReps >= targetRepsMax;
        return {
            suggestedLoad: hitTopOfRange && prevLoad != null ? String(prevLoad + 2.5) : null,
            suggestedReps: prevReps != null ? String(prevReps) : null,
            previousLoad: prevLoad,
            previousReps: prevReps,
        };
    }

    // Bodyweight / reps-only
    const prevReps = prevSet.performed_reps;
    return {
        suggestedLoad: null,
        suggestedReps: prevReps != null ? String(prevReps + 1) : null,
        previousLoad: null,
        previousReps: prevReps,
    };
}
