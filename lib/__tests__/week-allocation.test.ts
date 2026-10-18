import { computeWeekComposition, WORKOUT_DAY_CAP, MIN_WORKOUT_DAYS, speedFocusWithoutSpeedDay } from '@/lib/week-allocation';

// ⚠️ Diese Vektoren replizieren die Worker-Tests (week-layout.test.ts, allocateDays) wörtlich —
// App-Spiegel und Engine MÜSSEN dieselben Zahlen liefern.
const base = { sprintsCoveredByClub: false };

describe('computeWeekComposition (Spiegel von allocateDays)', () => {
    it('Level 3 reserviert einen garantierten Speed-Tag', () => {
        expect(computeWeekComposition({ ...base, availableDayCount: 4, loadProfile: 'low', pillarLevels: { sprints: 3 } }))
            .toMatchObject({ workouts: 3, speedDays: 1, carrier: 'standalone' });
    });
    it('Level 2 nimmt nur Überschuss-Tage', () => {
        expect(computeWeekComposition({ ...base, availableDayCount: 4, loadProfile: 'medium', pillarLevels: { sprints: 2 } }))
            .toMatchObject({ workouts: 3, speedDays: 1, carrier: 'standalone' });
        expect(computeWeekComposition({ ...base, availableDayCount: 4, loadProfile: 'high', pillarLevels: { sprints: 2 } }))
            .toMatchObject({ workouts: 2, speedDays: 1 });
    });
    it('2-Tage-Edge: Level 3 fällt auf integriert zurück (Minimum 2 Workouts gewinnt)', () => {
        expect(computeWeekComposition({ ...base, availableDayCount: 2, loadProfile: 'high', pillarLevels: { sprints: 3 } }))
            .toMatchObject({ workouts: 2, speedDays: 0, carrier: 'integrated' });
    });
    it('Vereins-Dämpfung bremst Sprints, nie COD', () => {
        const c = computeWeekComposition({ availableDayCount: 4, loadProfile: 'low', pillarLevels: { sprints: 3, cod: 3 }, sprintsCoveredByClub: true });
        expect(c.speedDays).toBeGreaterThanOrEqual(1);
        const micro = computeWeekComposition({ availableDayCount: 2, loadProfile: 'low', pillarLevels: { sprints: 3 }, sprintsCoveredByClub: true });
        expect(micro.carrier).toBe('micro');
    });
    it('zweiter Speed-Tag nur aus zweitem Überschuss-Tag', () => {
        expect(computeWeekComposition({ ...base, availableDayCount: 4, loadProfile: 'high', pillarLevels: { sprints: 3 } }))
            .toMatchObject({ workouts: 2, speedDays: 2 });
    });
    it('Conditioning: Stufe 3 durchbricht die Dämpfung, Stufe 2 nur bei low', () => {
        expect(computeWeekComposition({ ...base, availableDayCount: 4, loadProfile: 'medium', pillarLevels: { conditioning: 3 } }).conditioningDay).toBe(true);
        expect(computeWeekComposition({ ...base, availableDayCount: 5, loadProfile: 'high', pillarLevels: { conditioning: 2 } }).conditioningDay).toBe(false);
        expect(computeWeekComposition({ ...base, availableDayCount: 6, loadProfile: 'low', pillarLevels: { conditioning: 2 } }).conditioningDay).toBe(true);
    });
    it('Mobility ab Stufe 2, kostet keinen Tag', () => {
        expect(computeWeekComposition({ ...base, availableDayCount: 2, loadProfile: 'low', pillarLevels: { mobility: 2 } }))
            .toMatchObject({ workouts: 2, mobilityDay: true });
    });
    it('Cap low = 5', () => {
        expect(WORKOUT_DAY_CAP.low).toBe(5);
        expect(MIN_WORKOUT_DAYS).toBe(2);
        expect(computeWeekComposition({ ...base, availableDayCount: 5, loadProfile: 'low', pillarLevels: {} }).workouts).toBe(5);
    });
});

describe('extraSessionAllowance (review fix I4: surplus days reachable)', () => {
    const { extraSessionAllowance } = require('@/lib/week-allocation');
    it('speed level 3 allows up to 2 extra days, level 2 one', () => {
        expect(extraSessionAllowance({ loadProfile: 'medium', pillarLevels: { sprints: 3 }, sprintsCoveredByClub: false })).toBe(2);
        expect(extraSessionAllowance({ loadProfile: 'medium', pillarLevels: { sprints: 2 }, sprintsCoveredByClub: false })).toBe(1);
    });
    it('conditioning adds a day at level 3 (any load) or level 2 at low', () => {
        expect(extraSessionAllowance({ loadProfile: 'high', pillarLevels: { conditioning: 3 }, sprintsCoveredByClub: false })).toBe(1);
        expect(extraSessionAllowance({ loadProfile: 'low', pillarLevels: { conditioning: 2 }, sprintsCoveredByClub: false })).toBe(1);
        expect(extraSessionAllowance({ loadProfile: 'medium', pillarLevels: { conditioning: 2 }, sprintsCoveredByClub: false })).toBe(0);
    });
    it('club-damped sprints grant nothing without cod', () => {
        expect(extraSessionAllowance({ loadProfile: 'low', pillarLevels: { sprints: 3 }, sprintsCoveredByClub: true })).toBe(0);
    });
    it('combines speed and conditioning allowances', () => {
        expect(extraSessionAllowance({ loadProfile: 'low', pillarLevels: { sprints: 2, conditioning: 2 }, sprintsCoveredByClub: false })).toBe(2);
    });
});

describe('speedFocusWithoutSpeedDay (QA 18.10.: COD-Fokus ohne Speed-Tag sichtbar machen)', () => {
    it('warnt bei Level-2-Fokus ohne Überschuss-Tag', () => {
        expect(speedFocusWithoutSpeedDay({ availableDayCount: 3, loadProfile: 'medium', pillarLevels: { cod: 2 }, sprintsCoveredByClub: false })).toBe(true);
    });
    it('kein Hinweis, wenn ein Überschuss-Tag die Speed-Session ermöglicht', () => {
        expect(speedFocusWithoutSpeedDay({ availableDayCount: 4, loadProfile: 'medium', pillarLevels: { cod: 2 }, sprintsCoveredByClub: false })).toBe(false);
    });
    it('Level 3 bekommt die Session aus dem Cap heraus — kein Hinweis; bei 2 Tagen aber doch', () => {
        expect(speedFocusWithoutSpeedDay({ availableDayCount: 4, loadProfile: 'low', pillarLevels: { sprints: 3 }, sprintsCoveredByClub: false })).toBe(false);
        expect(speedFocusWithoutSpeedDay({ availableDayCount: 2, loadProfile: 'high', pillarLevels: { sprints: 3 }, sprintsCoveredByClub: false })).toBe(true);
    });
    it('Level <= 1 oder club-gedeckte Sprints ohne COD: nie ein Hinweis', () => {
        expect(speedFocusWithoutSpeedDay({ availableDayCount: 2, loadProfile: 'medium', pillarLevels: { sprints: 1 }, sprintsCoveredByClub: false })).toBe(false);
        expect(speedFocusWithoutSpeedDay({ availableDayCount: 3, loadProfile: 'medium', pillarLevels: { sprints: 3 }, sprintsCoveredByClub: true })).toBe(false);
    });
});
