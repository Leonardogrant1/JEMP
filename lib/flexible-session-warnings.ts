export type FlexibleDayWarning = 'workout_same_day' | 'near_heavy_lower';

type Input = {
    /** session_type der flexiblen Session — Warnungen gibt es nur für 'speed' */
    sessionType: string;
    /** Ziel-Wochentag (ISO 1=Mo … 7=So) */
    targetDow: number;
    /** Wochentage mit geplantem Workout (Training-Sessions) */
    workoutDows: number[];
    /** Tag mit Lower-Body als heavy Primary — null bei Alt-Plänen ohne Emphasis */
    heavyLowerDow: number | null;
};

/**
 * Weiche Warnungen beim Verschieben flexibler Sessions (Spec 2026-10-09):
 * Sprints kollidieren mit Workouts am selben Tag und brauchen Abstand zum
 * harten Beintag (±1 Tag, zyklisch über die Wochengrenze). Harte Sperren
 * (<72h vor Spiel) regelt weiterhin das flexible_window.
 */
export function getFlexibleDayWarnings({ sessionType, targetDow, workoutDows, heavyLowerDow }: Input): FlexibleDayWarning[] {
    if (sessionType !== 'speed') return [];
    const warnings: FlexibleDayWarning[] = [];
    if (workoutDows.includes(targetDow)) warnings.push('workout_same_day');
    if (heavyLowerDow !== null) {
        const dist = Math.abs(targetDow - heavyLowerDow);
        if (Math.min(dist, 7 - dist) <= 1) warnings.push('near_heavy_lower');
    }
    return warnings;
}
