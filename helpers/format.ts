// ── Reps formatting ──────────────────────────────────────────────────────

export function formatTargetReps(min: number | null, max: number | null): string {
    if (min && max) return min === max ? `${min}` : `${min}–${max}`;
    if (min) return `${min}+`;
    if (max) return `≤${max}`;
    return '–';
}

type ExerciseWithTargets = {
    target_reps_min: number | null;
    target_reps_max: number | null;
    target_duration_seconds: number | null;
    target_load_type: string | null;
    target_load_value: number | null;
};

export function formatReps(ex: ExerciseWithTargets, t: (key: string) => string): string {
    if (ex.target_reps_min && ex.target_reps_max) {
        return ex.target_reps_min === ex.target_reps_max
            ? `${ex.target_reps_min} ${t('ui.reps')}`
            : `${ex.target_reps_min}–${ex.target_reps_max} ${t('ui.reps')}`;
    }
    if (ex.target_reps_min) return `${ex.target_reps_min}+ ${t('ui.reps')}`;
    if (ex.target_reps_max) return `≤${ex.target_reps_max} ${t('ui.reps')}`;
    if (ex.target_duration_seconds) return `${ex.target_duration_seconds}s`;
    return '';
}

// ── Load formatting ─────────────────────────────────────────────────────

export function formatLoad(ex: ExerciseWithTargets, t: (key: string) => string): string | null {
    if (!ex.target_load_type || ex.target_load_value == null) return null;
    switch (ex.target_load_type) {
        case 'kg': return `${ex.target_load_value} kg`;
        case 'bodyweight': return t('load_type.bodyweight');
        case 'percent_1rm': return `${ex.target_load_value}% 1RM`;
        case 'rpe': return `RPE ${ex.target_load_value}`;
        case 'pace': return `${ex.target_load_value} ${t('load_type.pace')}`;
        default: return null;
    }
}

export function loadUnit(type: string | null): string {
    switch (type) {
        case 'kg': return 'kg';
        case 'percent_1rm': return '% 1RM';
        case 'rpe': return 'RPE';
        default: return '';
    }
}

// ── Rest formatting ─────────────────────────────────────────────────────

export function formatRest(seconds: number | null): string | null {
    if (!seconds) return null;
    return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds}s`;
}

// ── Level labels ────────────────────────────────────────────────────────

export function levelLabel(level: number, t: (key: string) => string): string {
    if (level <= 30) return t('ui.beginner');
    if (level <= 60) return t('ui.intermediate');
    return t('ui.advanced');
}
