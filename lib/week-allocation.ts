// ⚠️ SYNC MIRROR von externals/jemp-temporal-worker/src/plan-generation/week-layout.ts
// (allocateDays + effectiveSpeedLevel + Caps). Beide Seiten ändern — sonst
// verspricht der Tage-Step eine Woche, die der Generator nicht baut.

export type AllocationInput = {
    availableDayCount: number;
    loadProfile: 'low' | 'medium' | 'high';
    pillarLevels: Partial<Record<string, 1 | 2 | 3>>;
    sprintsCoveredByClub: boolean;
};

export type WeekComposition = {
    workouts: number;
    speedDays: number;
    conditioningDay: boolean;
    mobilityDay: boolean;
    carrier: 'standalone' | 'integrated' | 'micro' | 'none';
};

export const WORKOUT_DAY_CAP = { low: 5, medium: 3, high: 2 } as const;
export const MIN_WORKOUT_DAYS = 2;

function effectiveSpeedLevel(levels: AllocationInput['pillarLevels'], club: boolean): number {
    const sprint = Math.min(levels.sprints ?? 0, club ? 1 : 3);
    return Math.max(sprint, levels.cod ?? 0);
}

export function computeWeekComposition(input: AllocationInput): WeekComposition {
    const cap = WORKOUT_DAY_CAP[input.loadProfile];
    const days = input.availableDayCount;
    let workouts = Math.min(cap, days);
    let spare = days - workouts;

    const speedLevel = effectiveSpeedLevel(input.pillarLevels, input.sprintsCoveredByClub);
    let speedDays = 0;
    let carrier: WeekComposition['carrier'] = speedLevel === 0 ? 'none' : 'micro';

    if (speedLevel === 3) {
        if (workouts - 1 >= MIN_WORKOUT_DAYS) {
            workouts -= 1;
            spare += 1;
        }
        if (spare > 0) { speedDays = 1; spare -= 1; carrier = 'standalone'; }
        else carrier = 'integrated';
        if (carrier === 'standalone' && spare > 0) { speedDays += 1; spare -= 1; }
    } else if (speedLevel === 2) {
        if (spare > 0) { speedDays = 1; spare -= 1; carrier = 'standalone'; }
        else carrier = 'integrated';
    }

    const conditioningLevel = input.pillarLevels.conditioning ?? 0;
    let conditioningDay = false;
    if (spare > 0 && (conditioningLevel === 3 || (conditioningLevel === 2 && input.loadProfile === 'low'))) {
        conditioningDay = true;
        spare -= 1;
    }

    const mobilityDay = (input.pillarLevels.mobility ?? 0) >= 2;

    return { workouts, speedDays, conditioningDay, mobilityDay, carrier };
}

/** Review fix I4 (Spec §3.1): Wie viele Tage ÜBER dem Workout-Cap darf der
 *  User anbieten, damit Speed-/Conditioning-Sessions überhaupt entstehen
 *  können? Macht die Überschuss-Zustände der Zuteilung im UI erreichbar. */
export function extraSessionAllowance(input: Omit<AllocationInput, 'availableDayCount'>): number {
    const speedLevel = Math.max(
        Math.min(input.pillarLevels.sprints ?? 0, input.sprintsCoveredByClub ? 1 : 3),
        input.pillarLevels.cod ?? 0,
    );
    const speedExtra = speedLevel === 3 ? 2 : speedLevel === 2 ? 1 : 0;
    const condLevel = input.pillarLevels.conditioning ?? 0;
    const condExtra = (condLevel === 3 || (condLevel === 2 && input.loadProfile === 'low')) ? 1 : 0;
    return speedExtra + condExtra;
}
