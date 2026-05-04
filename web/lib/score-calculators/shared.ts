export function ageFactor(age: number): number {
    if (age <= 20) return 0.95;
    if (age <= 25) return 1.00;
    if (age <= 30) return 0.97;
    if (age <= 35) return 0.93;
    if (age <= 40) return 0.88;
    if (age <= 45) return 0.82;
    if (age <= 50) return 0.75;
    return 0.68;
}

export function toLevel(z: number): number {
    const clamped = Math.max(-3, Math.min(3, z));
    const normalized = (clamped + 3) / 6;
    return Math.round(1 + normalized * 99);
}
