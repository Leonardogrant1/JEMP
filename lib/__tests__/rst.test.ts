import { rstDerive, shouldFeedSprintScore } from '@/lib/rst';

describe('rstDerive', () => {
    it('berechnet Drop-off (first2 vs last2) und Durchschnitt', () => {
        const r = rstDerive([4.0, 4.1, 4.3, 4.4, 4.5, 4.6])!;
        expect(r.dropOffPct).toBeCloseTo(12.3, 0);
        expect(r.meanTime).toBeCloseTo(4.32, 2);
        expect(r.run1).toBe(4.0);
    });
    it('null bei falscher Anzahl oder unplausiblen Zeiten', () => {
        expect(rstDerive([4, 4, 4, 4, 4])).toBeNull();
        expect(rstDerive([4, 4, 4, 4, 4, 99])).toBeNull();
        expect(rstDerive([4, 4, 4, 4, 4, 0])).toBeNull();
    });
});

describe('shouldFeedSprintScore (Prioritäts-Regel §4.4)', () => {
    const now = new Date('2026-10-08');
    it('frischer dedizierter Test blockiert — auch wenn er älter als der RST ist', () => {
        expect(shouldFeedSprintScore([{ assessmentSlug: 'sprint_30m', completedAt: '2026-08-01' }], now)).toBe(false);
    });
    it('veralteter dedizierter Test blockiert nicht; fremde Slugs ignoriert', () => {
        expect(shouldFeedSprintScore([{ assessmentSlug: 'sprint_30m', completedAt: '2026-01-01' }], now)).toBe(true);
        expect(shouldFeedSprintScore([{ assessmentSlug: 'cooper_test', completedAt: '2026-10-01' }], now)).toBe(true);
        expect(shouldFeedSprintScore([], now)).toBe(true);
    });
});

describe('review fixes I2/M8', () => {
    it('rstDerive lehnt rückwärts eingegebene Zeiten ab (last2 deutlich schneller als first2)', () => {
        expect(rstDerive([4.9, 4.8, 4.6, 4.5, 4.1, 4.0])).toBeNull();
    });
    it('shouldFeedSprintScore ignoriert RST-gespeiste (derived) Einträge', () => {
        const now = new Date('2026-10-08');
        expect(shouldFeedSprintScore([
            { assessmentSlug: 'sprint_30m', completedAt: '2026-09-01', sourceType: 'derived' },
        ], now)).toBe(true);
        expect(shouldFeedSprintScore([
            { assessmentSlug: 'sprint_30m', completedAt: '2026-09-01', sourceType: 'assessment' },
        ], now)).toBe(false);
    });
});
