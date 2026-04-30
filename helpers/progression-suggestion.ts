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
): ProgressionSuggestion | null {
    if (!previousSets.length) return null;

    const prevSet = getSetForNumber(previousSets, currentSetNumber);
    if (!prevSet) return null;

    if (loadType === 'weight_kg') {
        const prevLoad = prevSet.performed_load_value;
        const prevReps = prevSet.performed_reps;
        return {
            suggestedLoad: prevLoad != null ? String(prevLoad + 2.5) : null,
            suggestedReps: prevReps != null ? String(prevReps) : null,
            previousLoad: prevLoad,
            previousReps: prevReps,
        };
    }

    if (loadType === 'weight_lb') {
        const prevLoad = prevSet.performed_load_value;
        const prevReps = prevSet.performed_reps;
        return {
            suggestedLoad: prevLoad != null ? String(prevLoad + 5) : null,
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
