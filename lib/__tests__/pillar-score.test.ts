import { weightedOverall, overallSeries, pillarSourceStatus } from '@/lib/pillar-score';

const weights = [
    { slug: 'strength', weight: 1 }, { slug: 'sprints', weight: 2 },
    { slug: 'mobility', weight: 1 }, { slug: 'upper_body_plyometrics', weight: 0 },
];

describe('weightedOverall (§4.7/§4.3)', () => {
    it('renormalisiert über vorhandene Säulen', () => {
        // strength 40 (w1) + sprints 70 (w2) → (40 + 140) / 3 = 60
        expect(weightedOverall([{ slug: 'strength', level: 40 }, { slug: 'sprints', level: 70 }], weights)).toBe(60);
    });
    it('Gewicht 0 (versteckte Säule) zählt nie; leer → null', () => {
        expect(weightedOverall([{ slug: 'upper_body_plyometrics', level: 90 }], weights)).toBeNull();
        expect(weightedOverall([], weights)).toBeNull();
    });
});

describe('overallSeries (LOCF)', () => {
    it('trägt frühe Messungen weiter und renormalisiert fehlende Säulen', () => {
        const series = overallSeries([
            { slug: 'strength', level: 40, recordedAt: '2026-01-01' },
            { slug: 'sprints', level: 70, recordedAt: '2026-02-01' },
            { slug: 'strength', level: 50, recordedAt: '2026-03-01' },
        ], weights);
        expect(series).toEqual([
            { recordedAt: '2026-01-01', level: 40 },          // nur strength
            { recordedAt: '2026-02-01', level: 60 },          // strength 40 + sprints 70 gewichtet
            { recordedAt: '2026-03-01', level: 63 },          // strength 50 LOCF-sprints 70 → (50+140)/3
        ]);
    });
});

describe('pillarSourceStatus (120-Tage-Aging)', () => {
    const now = new Date('2026-10-08');
    it('frisch gemessen / veraltet / geschätzt', () => {
        expect(pillarSourceStatus('measured', '2026-09-01', now)).toBe('measured');
        expect(pillarSourceStatus('measured', '2026-05-01', now)).toBe('stale');
        expect(pillarSourceStatus('self_estimate', null, now)).toBe('estimated');
        expect(pillarSourceStatus('measured', null, now)).toBe('estimated');
    });
});
