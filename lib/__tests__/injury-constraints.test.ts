// needsInjuryGate/resolveSourceNote/selectStrippable sind rein, aber
// lib/injury-constraints.ts importiert den Supabase-Client auf Modul-Ebene
// (für die async Wrapper) — dessen createClient() wirft ohne
// EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY, die unter Jest (anders als beim
// Expo-Bundler) nicht inlined werden. confirmInjuryConstraints braucht ein
// chainbares Mock (Muster aus stores/__tests__/injury-gate-store.test.ts),
// die reinen Funktionstests oben lesen supabase nie.
jest.mock('@/services/supabase/client', () => ({
    supabase: {
        auth: { getSession: jest.fn() },
        from: jest.fn(),
    },
}));

import {
    confirmInjuryConstraints,
    needsInjuryGate,
    resolveSourceNote,
    selectStrippable,
} from '@/lib/injury-constraints';
import { supabase } from '@/services/supabase/client';

const mockedSupabase = supabase as unknown as {
    auth: { getSession: jest.Mock };
    from: jest.Mock;
};

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

// ── confirmInjuryConstraints (Plan B whole-branch review, Finding 2 + Bonus) ──
// Chainbares Mock pro Supabase-Call-Shape, Muster aus
// stores/__tests__/injury-gate-store.test.ts. Jede Hilfsfunktion baut nur die
// Methodenkette, die confirmInjuryConstraints an genau dieser Stelle
// tatsächlich aufruft — kein Generic-Proxy, damit ein falscher Call (z.B.
// eine unerwartete zusätzliche .eq()) laut mit einem TypeError auffällt statt
// stillschweigend "funktioniert".
describe('confirmInjuryConstraints (Plan B whole-branch review)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    function selectIsChain(result: { data: unknown; error: unknown }) {
        return { select: jest.fn(() => ({ is: jest.fn(() => Promise.resolve(result)) })) };
    }
    function updateEqIsChain(result: { error: unknown }, captureRevokedAt?: (v: unknown) => void) {
        return {
            update: jest.fn((payload: { revoked_at: unknown }) => {
                captureRevokedAt?.(payload.revoked_at);
                return { eq: jest.fn(() => ({ is: jest.fn(() => Promise.resolve(result)) })) };
            }),
        };
    }
    function selectChain(result: { data: unknown; error: unknown }) {
        return { select: jest.fn(() => Promise.resolve(result)) };
    }
    function insertChain(result: { error: unknown }) {
        return { insert: jest.fn(() => Promise.resolve(result)) };
    }
    function updateEqChain(result: { error: unknown }, captureUpdatePayload?: (v: unknown) => void) {
        return {
            update: jest.fn((payload: unknown) => {
                captureUpdatePayload?.(payload);
                return { eq: jest.fn(() => Promise.resolve(result)) };
            }),
        };
    }
    function updateEqEqChain(
        result: { error: unknown },
        captureArgs?: (args: { payload: unknown; userId: unknown; revokedAt: unknown }) => void,
    ) {
        return {
            update: jest.fn((payload: unknown) => ({
                eq: jest.fn((_userIdKey: string, userIdVal: unknown) => ({
                    eq: jest.fn((_revokedKey: string, revokedVal: unknown) => {
                        captureArgs?.({ payload, userId: userIdVal, revokedAt: revokedVal });
                        return Promise.resolve(result);
                    }),
                })),
            })),
        };
    }

    test('leere/all-ok choices: Insert wird übersprungen, injury_extraction_status wird trotzdem confirmed gesetzt (Bonus, Review Focus 2)', async () => {
        mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });

        let profilePayload: any = null;
        mockedSupabase.from
            .mockImplementationOnce(() => selectIsChain({ data: [], error: null })) // predecessors
            .mockImplementationOnce(() => updateEqIsChain({ error: null })) // revoke
            .mockImplementationOnce(() => updateEqChain({ error: null }, (p) => { profilePayload = p; })); // profile status update

        await confirmInjuryConstraints([{ tag_slug: 'knee', mode: 'ok', acute: false }], null, 'manual');

        expect(mockedSupabase.from.mock.calls.map((c) => c[0])).toEqual([
            'user_injury_constraints', // predecessors
            'user_injury_constraints', // revoke
            'user_profiles', // status update — kein Insert-Call dazwischen
        ]);
        expect(profilePayload.injury_extraction_status).toBe('confirmed');
        expect(profilePayload.injury_confirmed_at).toBeTruthy();
    });

    test('Insert-Fehler NACH erfolgreichem Revoke: kompensierendes Un-Revoke + Rethrow, profile-Status wird NICHT erreicht (Finding 2)', async () => {
        mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });

        let revokedAtUsed: unknown = null;
        let compensationArgs: { payload: unknown; userId: unknown; revokedAt: unknown } | null = null;

        mockedSupabase.from
            .mockImplementationOnce(() => selectIsChain({ data: [], error: null })) // predecessors
            .mockImplementationOnce(() => updateEqIsChain({ error: null }, (v) => { revokedAtUsed = v; })) // revoke succeeds
            .mockImplementationOnce(() => selectChain({ data: [{ id: 'tag-1', slug: 'knee' }], error: null })) // contraindication_tags
            .mockImplementationOnce(() => insertChain({ error: new Error('insert boom') })) // insert fails
            .mockImplementationOnce(() => updateEqEqChain({ error: null }, (args) => { compensationArgs = args; })); // compensation

        await expect(
            confirmInjuryConstraints([{ tag_slug: 'knee', mode: 'block', acute: false }], null, 'manual'),
        ).rejects.toThrow('insert boom');

        expect(mockedSupabase.from).toHaveBeenCalledTimes(5);
        expect(mockedSupabase.from.mock.calls.map((c) => c[0])).not.toContain('user_profiles');
        expect(compensationArgs).not.toBeNull();
        expect(compensationArgs!.payload).toEqual({ revoked_at: null });
        expect(compensationArgs!.userId).toBe('u1');
        // exakter Zeitstempel kompensiert, kein blanket revoked_at IS NULL —
        // sonst würden fremde Rows eines parallelen Laufs mit-reaktiviert.
        expect(compensationArgs!.revokedAt).toBe(revokedAtUsed);
    });
});
