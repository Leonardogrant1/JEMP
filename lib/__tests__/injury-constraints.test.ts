// needsInjuryGate ist rein, aber lib/injury-constraints.ts importiert den
// Supabase-Client auf Modul-Ebene (für die async Wrapper) — dessen
// createClient() wirft ohne EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY, die unter
// Jest (anders als beim Expo-Bundler) nicht inlined werden. Mock, damit der
// reine Funktionstest den Client nicht tatsächlich instanziiert.
jest.mock('@/services/supabase/client', () => ({ supabase: {} }));

import { needsInjuryGate, resolveSourceNote, selectStrippable } from '@/lib/injury-constraints';

describe('needsInjuryGate (Plan B Intake, Spec §5 Fälle a/b/c)', () => {
    test('notes + pending → extract', () => {
        expect(needsInjuryGate(
            { schedule_notes: 'Knie seit letzter Saison nicht ganz dicht', injury_extraction_status: 'pending', injury_confirmed_at: null },
            false,
        )).toBe('extract');
    });

    test('failed → retry', () => {
        expect(needsInjuryGate(
            { schedule_notes: null, injury_extraction_status: 'failed', injury_confirmed_at: null },
            false,
        )).toBe('retry');
    });

    test('active constraints + confirmed_at 8 Tage alt → recheck', () => {
        const now = new Date('2026-11-09T00:00:00Z');
        const confirmedAt = new Date('2026-11-01T00:00:00Z').toISOString(); // 8 Tage alt
        expect(needsInjuryGate(
            { schedule_notes: null, injury_extraction_status: 'confirmed', injury_confirmed_at: confirmedAt },
            true,
            now,
        )).toBe('recheck');
    });

    test('active constraints + confirmed_at 6 Tage alt → null', () => {
        const now = new Date('2026-11-07T00:00:00Z');
        const confirmedAt = new Date('2026-11-01T00:00:00Z').toISOString(); // 6 Tage alt
        expect(needsInjuryGate(
            { schedule_notes: null, injury_extraction_status: 'confirmed', injury_confirmed_at: confirmedAt },
            true,
            now,
        )).toBeNull();
    });

    test('keine notes + pending + keine constraints → null', () => {
        expect(needsInjuryGate(
            { schedule_notes: null, injury_extraction_status: 'pending', injury_confirmed_at: null },
            false,
        )).toBeNull();
    });

    test('confirmed + keine constraints + frisch → null', () => {
        const now = new Date('2026-11-01T12:00:00Z');
        const confirmedAt = new Date('2026-11-01T00:00:00Z').toISOString();
        expect(needsInjuryGate(
            { schedule_notes: null, injury_extraction_status: 'confirmed', injury_confirmed_at: confirmedAt },
            false,
            now,
        )).toBeNull();
    });
});

describe('resolveSourceNote (Task 5 Fix Round 1, Finding 2 — Recheck darf Provenienz nicht löschen)', () => {
    test('incoming null + Vorgänger-Row vorhanden → übernimmt Vorgänger-source_note', () => {
        expect(resolveSourceNote(null, 'Knie seit letzter Saison nicht ganz dicht')).toBe('Knie seit letzter Saison nicht ganz dicht');
    });

    test('incoming non-null → überschreibt, Vorgänger wird ignoriert', () => {
        expect(resolveSourceNote('Neue Notiz', 'Alte Notiz')).toBe('Neue Notiz');
    });

    test('neuer Tag ohne Vorgänger-Row (undefined) → incoming-Wert', () => {
        expect(resolveSourceNote(null, undefined)).toBeNull();
        expect(resolveSourceNote('Neue Notiz', undefined)).toBe('Neue Notiz');
    });

    test('incoming null + Vorgänger-Row mit source_note null → bleibt null', () => {
        expect(resolveSourceNote(null, null)).toBeNull();
    });
});

describe('selectStrippable (Task 6, Review Focus 4 — Strip darf geloggte/abgeschlossene Sessions nie anfassen)', () => {
    test('blockierte Exercise in scheduled Session ohne performed sets wird entfernt', () => {
        const sessions = [
            {
                id: 's1',
                status: 'scheduled' as const,
                blocks: [
                    { id: 'b1', exercises: [{ id: 'be1', exercise_id: 'ex-blocked' }, { id: 'be2', exercise_id: 'ex-ok' }] },
                ],
            },
        ];
        const result = selectStrippable(sessions, new Set(['ex-blocked']), {});
        expect(result.exerciseIdsToDelete).toEqual(['be1']);
        expect(result.blockIdsToDelete).toEqual([]);
        expect(result.removedExercises).toBe(1);
        expect(result.removedBlocks).toBe(0);
    });

    test('geloggte Exercise (performed sets > 0) bleibt trotz blockiertem Tag', () => {
        const sessions = [
            {
                id: 's1',
                status: 'scheduled' as const,
                blocks: [
                    { id: 'b1', exercises: [{ id: 'be1', exercise_id: 'ex-blocked' }] },
                ],
            },
        ];
        const result = selectStrippable(sessions, new Set(['ex-blocked']), { be1: 2 });
        expect(result.exerciseIdsToDelete).toEqual([]);
        expect(result.removedExercises).toBe(0);
        expect(result.removedBlocks).toBe(0);
    });

    test('completed Session bleibt komplett unberührt, auch mit blockierter Exercise', () => {
        const sessions = [
            {
                id: 's1',
                status: 'completed' as const,
                blocks: [
                    { id: 'b1', exercises: [{ id: 'be1', exercise_id: 'ex-blocked' }] },
                ],
            },
        ];
        const result = selectStrippable(sessions, new Set(['ex-blocked']), {});
        expect(result.exerciseIdsToDelete).toEqual([]);
        expect(result.blockIdsToDelete).toEqual([]);
        expect(result.removedExercises).toBe(0);
        expect(result.removedBlocks).toBe(0);
    });

    test('geleerter Block (alle Exercises entfernt) wird gemeldet', () => {
        const sessions = [
            {
                id: 's1',
                status: 'scheduled' as const,
                blocks: [
                    { id: 'b1', exercises: [{ id: 'be1', exercise_id: 'ex-blocked' }, { id: 'be2', exercise_id: 'ex-blocked' }] },
                ],
            },
        ];
        const result = selectStrippable(sessions, new Set(['ex-blocked']), {});
        expect(result.exerciseIdsToDelete.sort()).toEqual(['be1', 'be2']);
        expect(result.blockIdsToDelete).toEqual(['b1']);
        expect(result.removedExercises).toBe(2);
        expect(result.removedBlocks).toBe(1);
    });

    test('Block mit teils blockierten, teils übrigen Exercises bleibt bestehen (nicht leer)', () => {
        const sessions = [
            {
                id: 's1',
                status: 'scheduled' as const,
                blocks: [
                    { id: 'b1', exercises: [{ id: 'be1', exercise_id: 'ex-blocked' }, { id: 'be2', exercise_id: 'ex-ok' }] },
                ],
            },
        ];
        const result = selectStrippable(sessions, new Set(['ex-blocked']), {});
        expect(result.blockIdsToDelete).toEqual([]);
        expect(result.removedBlocks).toBe(0);
    });

    test('keine blockierten Tags → nichts wird entfernt', () => {
        const sessions = [
            {
                id: 's1',
                status: 'scheduled' as const,
                blocks: [
                    { id: 'b1', exercises: [{ id: 'be1', exercise_id: 'ex-ok' }] },
                ],
            },
        ];
        const result = selectStrippable(sessions, new Set<string>(), {});
        expect(result.exerciseIdsToDelete).toEqual([]);
        expect(result.blockIdsToDelete).toEqual([]);
    });
});
