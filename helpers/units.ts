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

// Epley formula: estimated 1RM from weight lifted for N reps
export function estimateOneRepMax(weightKg: number, reps: number): number {
    return Math.round(weightKg * (1 + reps / 30));
}

export function formatHeight(cm: number, unit: 'cm' | 'ft'): string {
    if (unit === 'cm') return `${cm}`;
    const { ft, in: inches } = cmToFt(cm);
    return `${ft}'${inches}"`;
}
