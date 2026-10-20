import {
    visiblePillars, pillarBudget, budgetSpent, canIncrement,
    initialLevels, clampLevelsToVisible, normalizeToBudget, PILLAR_ORDER,
} from '@/lib/pillar-budget';

const preset = (slug: string, level: number, categoryId = slug) => ({ categoryId, slug, level });
const lvl = (slug: string, level: 1 | 2 | 3, categoryId = slug) => ({ categoryId, slug, level });

// Fußball-Preset aus der 3a-Matrix: STR2 LBP2 SPR2 COD2 CON1 MOB1, UBP versteckt.
const soccer = [
    preset('strength', 2), preset('lower_body_plyometrics', 2), preset('upper_body_plyometrics', 0),
    preset('sprints', 2), preset('cod', 2), preset('conditioning', 1), preset('mobility', 1),
];

describe('visiblePillars', () => {
    it('filtert Preset-0-Säulen raus und sortiert nach PILLAR_ORDER', () => {
        const visible = visiblePillars([soccer[3], soccer[0], soccer[2], soccer[1], soccer[4], soccer[5], soccer[6]]);
        expect(visible.map((p) => p.slug)).toEqual(
            ['strength', 'lower_body_plyometrics', 'sprints', 'cod', 'conditioning', 'mobility']);
    });
});

describe('pillarBudget / budgetSpent / canIncrement', () => {
    it('Budget = sichtbare Säulen + 4', () => {
        expect(pillarBudget(6)).toBe(10);
        expect(pillarBudget(4)).toBe(8);
    });
    it('Fußball-Preset füllt sein Budget exakt — kein Increment möglich', () => {
        const levels = initialLevels(soccer, null);
        expect(budgetSpent(levels)).toBe(10);
        for (const l of levels) expect(canIncrement(levels, l.categoryId, 10)).toBe(false);
    });
    it('Increment bei Level 3 gesperrt, auch mit freiem Budget', () => {
        const levels = [lvl('strength', 3), lvl('mobility', 1)];
        expect(canIncrement(levels, 'strength', 10)).toBe(false);
        expect(canIncrement(levels, 'mobility', 10)).toBe(true);
    });
});

describe('initialLevels', () => {
    it('übernimmt gespeicherte Levels für sichtbare Säulen, Preset als Fallback', () => {
        const stored = [lvl('sprints', 3), lvl('upper_body_plyometrics', 2)];
        const levels = initialLevels(soccer, stored);
        expect(levels.find((l) => l.slug === 'sprints')!.level).toBe(3);
        expect(levels.find((l) => l.slug === 'strength')!.level).toBe(2);
        // UBP ist für Fußball versteckt — gespeicherter Wert fällt raus
        expect(levels.some((l) => l.slug === 'upper_body_plyometrics')).toBe(false);
    });
    it('hebt Preset-Level nie unter 1 (User kann nie auf 0)', () => {
        const levels = initialLevels([preset('strength', 2), preset('mobility', 1)], null);
        expect(levels.every((l) => l.level >= 1)).toBe(true);
    });
});

describe('normalizeToBudget', () => {
    it('reduziert die höchsten Levels zuerst bis die Summe passt', () => {
        const over = [lvl('strength', 3), lvl('lower_body_plyometrics', 3), lvl('sprints', 3), lvl('cod', 1), lvl('conditioning', 1), lvl('mobility', 1)];
        const result = normalizeToBudget(over, 10); // Summe 12 → 10
        expect(budgetSpent(result)).toBeLessThanOrEqual(10);
        expect(result.every((l) => l.level >= 1)).toBe(true);
        expect(result.filter((l) => l.level === 3).length).toBeLessThan(3);
    });
});

describe('clampLevelsToVisible', () => {
    it('entfernt Levels versteckter Säulen', () => {
        const levels = [lvl('strength', 2), lvl('upper_body_plyometrics', 3)];
        expect(clampLevelsToVisible(levels, soccer).map((l) => l.slug)).toEqual(['strength']);
    });
});
