// Weight
export function kgToLbs(kg: number): number {
    return Math.round(kg * 2.2046);
}

export function lbsToKg(lbs: number): number {
    return Math.round(lbs / 2.2046);
}

// Height
export function cmToFt(cm: number): { ft: number; in: number } {
    const totalInches = cm / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { ft, in: inches };
}

export function ftToCm(ft: number, inches: number): number {
    return Math.round((ft * 12 + inches) * 2.54);
}

// Brzycki formula: estimated 1RM from weight lifted for N reps.
// For weighted movements (e.g. pull-ups) pass bodyweightKg so the
// conversion runs over the total load, returning the added weight only.
export function estimateOneRepMax(weightKg: number, reps: number, bodyweightKg?: number): number {
    const factor = 36 / (37 - reps);
    if (bodyweightKg != null) {
        return Math.round((bodyweightKg + weightKg) * factor - bodyweightKg);
    }
    return Math.round(weightKg * factor);
}

export function formatHeight(cm: number, unit: 'cm' | 'ft'): string {
    if (unit === 'cm') return `${cm}`;
    const { ft, in: inches } = cmToFt(cm);
    return `${ft}'${inches}"`;
}

// ── Unit system (display preference — storage is always metric) ────────────

export type UnitSystem = 'metric' | 'imperial';

export function cmToIn(cm: number): number {
    return Math.round((cm / 2.54) * 10) / 10;
}

export function inToCm(inches: number): number {
    return Math.round(inches * 2.54);
}

/** Body weight for display, e.g. { value: '82', unit: 'kg' } / { value: '181', unit: 'lbs' } */
export function displayWeight(kg: number, system: UnitSystem): { value: string; unit: string } {
    if (system === 'imperial') return { value: String(kgToLbs(kg)), unit: 'lbs' };
    return { value: String(kg), unit: 'kg' };
}

/** Body height for display, e.g. { value: '186', unit: 'cm' } / { value: `6'1"`, unit: null } */
export function displayHeight(cm: number, system: UnitSystem): { value: string; unit: string | null } {
    if (system === 'imperial') return { value: formatHeight(cm, 'ft'), unit: null };
    return { value: String(cm), unit: 'cm' };
}

/**
 * Converts a metric measurement value (as stored) for display.
 * Only kg and cm units are affected by the imperial preference;
 * everything else (s, count, rating, …) passes through unchanged.
 */
export function displayMetricValue(
    value: number,
    unit: string | null | undefined,
    system: UnitSystem,
): { value: number; unit: string | null | undefined } {
    if (system !== 'imperial') return { value, unit };
    if (unit === 'kg') return { value: kgToLbs(value), unit: 'lbs' };
    if (unit === 'cm') return { value: cmToIn(value), unit: 'in' };
    return { value, unit };
}
