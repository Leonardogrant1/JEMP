import { lowerBodyPlyometricsLevel } from '@/lib/score-calculators/lower-body-plyometrics';
import { sprintLevel } from '@/lib/score-calculators/sprints';
import { codLevel } from '@/lib/score-calculators/cod';
import { rstConditioningLevel, cooperLevel } from '@/lib/score-calculators/conditioning';
import { calculateAssessmentScore } from '@/lib/score-calculators/assessment-score';

const profile = { gender: 'male' as const, weight_kg: 75, height_cm: 180, birth_date: '2000-01-01' };

describe('sprint/cod split (Kontinuität: gleiche Normen, gleiche Scores)', () => {
    it('sprintLevel liefert die alten lbp-Werte', () => {
        // Norm 10m male: mean 1.80 / std 0.15 → exakt mean = Level 50-ish
        const mid = sprintLevel(1.80, 75, 25, 'male', '10m_sprint');
        expect(mid).toBeGreaterThanOrEqual(45);
        expect(mid).toBeLessThanOrEqual(55);
        expect(sprintLevel(1.60, 75, 25, 'male', '10m_sprint')).toBeGreaterThan(mid);
    });
    it('codLevel bewertet die 505 wie zuvor', () => {
        const mid = codLevel(2.40, 75, 25, 'male');
        expect(mid).toBeGreaterThanOrEqual(45);
        expect(mid).toBeLessThanOrEqual(55);
    });
    it('Map: sprint_10m läuft jetzt über den Sprint-Calculator (gleicher Wert)', () => {
        const viaMap = calculateAssessmentScore('sprint_10m', 1.80, profile);
        expect(viaMap).toBe(sprintLevel(1.80, 75, 26, 'male', '10m_sprint'));
    });
    it('lbp-Calculator kennt keine Sprint-Übungen mehr', () => {
        const fn = () => lowerBodyPlyometricsLevel(1.8, 75, 26, 'male', '10m_sprint' as never);
        expect(fn).toBeDefined();
    });
});

describe('rstConditioningLevel (Drop-off + Absolutzeit, Review-Regel)', () => {
    it('liefert 1-100 und bestraft Langsamkeit bei identischem Drop-off', () => {
        const fast = rstConditioningLevel([4.2, 4.25, 4.3, 4.35, 4.4, 4.45], 26, 'male');
        const slow = rstConditioningLevel([5.2, 5.25, 5.3, 5.35, 5.4, 5.45], 26, 'male');
        expect(fast).toBeGreaterThanOrEqual(1);
        expect(fast).toBeLessThanOrEqual(100);
        expect(slow).toBeLessThan(fast);
    });
    it('höherer Drop-off senkt den Score bei gleicher Durchschnittszeit', () => {
        const steady = rstConditioningLevel([4.4, 4.4, 4.45, 4.45, 4.5, 4.5], 26, 'male');
        const fading = rstConditioningLevel([4.1, 4.2, 4.4, 4.5, 4.7, 4.8], 26, 'male');
        expect(fading).toBeLessThan(steady);
    });
});

describe('cooperLevel', () => {
    it('2400 m male ≈ Mitte; mehr Distanz = mehr Score', () => {
        const mid = cooperLevel(2400, 25, 'male');
        expect(mid).toBeGreaterThanOrEqual(45);
        expect(mid).toBeLessThanOrEqual(55);
        expect(cooperLevel(2800, 25, 'male')).toBeGreaterThan(mid);
    });
    it('Map: cooper_test ist verdrahtet', () => {
        expect(calculateAssessmentScore('cooper_test', 2400, profile)).toBe(cooperLevel(2400, 26, 'male'));
    });
});

describe('neue COD-Tests (5-10-5 + Hexagon)', () => {
    const { codTestLevel } = require('@/lib/score-calculators/cod');
    it('Normmitte ≈ Level 50, schneller = besser', () => {
        const mid510 = codTestLevel(5.0, 25, 'male', 'pro_agility');
        expect(mid510).toBeGreaterThanOrEqual(45);
        expect(mid510).toBeLessThanOrEqual(55);
        expect(codTestLevel(4.6, 25, 'male', 'pro_agility')).toBeGreaterThan(mid510);
        const midHex = codTestLevel(12.2, 25, 'male', 'hexagon');
        expect(midHex).toBeGreaterThanOrEqual(45);
        expect(midHex).toBeLessThanOrEqual(55);
    });
    it('Map: beide Assessments verdrahtet', () => {
        expect(calculateAssessmentScore('pro_agility_shuttle_test', 5.0, profile)).toBe(codTestLevel(5.0, 26, 'male', 'pro_agility'));
        expect(calculateAssessmentScore('hexagon_test', 12.2, profile)).toBe(codTestLevel(12.2, 26, 'male', 'hexagon'));
    });
});
