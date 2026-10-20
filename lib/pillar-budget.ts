// Säulen-Budget-Logik für den Pillar-Stepper (Spec §1.5):
// Stufen 1-3 pro sichtbarer Säule, Budget = sichtbare Säulen + 4.
// Effektive Nullen setzt nur das System (Preset) — nie der User.

export type PillarPreset = { categoryId: string; slug: string; level: number };
export type PillarLevel = { categoryId: string; slug: string; level: 1 | 2 | 3 };

export const PILLAR_ORDER = [
    'strength', 'lower_body_plyometrics', 'upper_body_plyometrics',
    'sprints', 'cod', 'conditioning', 'mobility',
] as const;

const orderIndex = (slug: string) => {
    const i = (PILLAR_ORDER as readonly string[]).indexOf(slug);
    return i === -1 ? PILLAR_ORDER.length : i;
};

export function visiblePillars(presets: PillarPreset[]): PillarPreset[] {
    return presets
        .filter((p) => p.level > 0)
        .sort((a, b) => orderIndex(a.slug) - orderIndex(b.slug));
}

export function pillarBudget(visibleCount: number): number {
    return visibleCount + 4;
}

export function budgetSpent(levels: PillarLevel[]): number {
    return levels.reduce((sum, l) => sum + l.level, 0);
}

export function canIncrement(levels: PillarLevel[], categoryId: string, budget: number): boolean {
    const current = levels.find((l) => l.categoryId === categoryId);
    if (!current || current.level >= 3) return false;
    return budgetSpent(levels) + 1 <= budget;
}

export function clampLevelsToVisible(levels: PillarLevel[], presets: PillarPreset[]): PillarLevel[] {
    const visible = new Set(visiblePillars(presets).map((p) => p.slug));
    return levels.filter((l) => visible.has(l.slug));
}

/** Gespeicherte Levels gewinnen für sichtbare Säulen; sonst Preset (nie unter 1). */
export function initialLevels(presets: PillarPreset[], stored: PillarLevel[] | null): PillarLevel[] {
    const storedBySlug = new Map((stored ?? []).map((l) => [l.slug, l.level]));
    return visiblePillars(presets).map((p) => ({
        categoryId: p.categoryId,
        slug: p.slug,
        level: (storedBySlug.get(p.slug) ?? Math.max(1, Math.min(3, p.level))) as 1 | 2 | 3,
    }));
}

/** Höchste Levels zuerst reduzieren, bis die Summe ins Budget passt (stabil). */
export function normalizeToBudget(levels: PillarLevel[], budget: number): PillarLevel[] {
    const result = levels.map((l) => ({ ...l }));
    let guard = 50;
    while (budgetSpent(result) > budget && guard-- > 0) {
        const highest = [...result].sort((a, b) => b.level - a.level || orderIndex(b.slug) - orderIndex(a.slug))[0];
        if (!highest || highest.level <= 1) break;
        highest.level = (highest.level - 1) as 1 | 2 | 3;
    }
    return result;
}
