// Gate-Fall-Logik selbst ist in lib/__tests__/injury-constraints.test.ts
// getestet (needsInjuryGate ist rein) — hier nur die Verdrahtungslogik:
// mocked needsInjuryGate entscheidet, der Store/Router-Teil wird geprüft.
jest.mock('@/services/supabase/client', () => ({
    supabase: {
        auth: { getSession: jest.fn() },
        from: jest.fn(),
    },
}));

jest.mock('@/lib/injury-constraints', () => ({
    needsInjuryGate: jest.fn(),
    fetchActiveConstraints: jest.fn(),
}));

import { needsInjuryGate, fetchActiveConstraints } from '@/lib/injury-constraints';
import { supabase } from '@/services/supabase/client';
import { ensureInjuryGate, useInjuryGateStore } from '@/stores/injury-gate-store';

const mockedNeedsInjuryGate = needsInjuryGate as jest.Mock;
const mockedFetchActiveConstraints = fetchActiveConstraints as jest.Mock;
const mockedSupabase = supabase as unknown as {
    auth: { getSession: jest.Mock };
    from: jest.Mock;
};

function mockRouter() {
    return { push: jest.fn(), back: jest.fn(), navigate: jest.fn() } as any;
}

function setupProfileFetch(profile: Record<string, unknown>) {
    mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockedSupabase.from.mockReturnValue({
        select: () => ({
            eq: () => ({
                single: () => Promise.resolve({ data: profile, error: null }),
            }),
        }),
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    useInjuryGateStore.setState({ gateCase: null, sourceNote: null, activeConstraints: [], onPassed: null });
});

describe('ensureInjuryGate', () => {
    test('needsInjuryGate → null: true zurück, kein push, kein Store-Write', async () => {
        setupProfileFetch({ schedule_notes: null, injury_extraction_status: 'confirmed', injury_confirmed_at: null });
        mockedFetchActiveConstraints.mockResolvedValue([]);
        mockedNeedsInjuryGate.mockReturnValue(null);
        const router = mockRouter();
        const onPassed = jest.fn();

        const result = await ensureInjuryGate(router, onPassed);

        expect(result).toBe(true);
        expect(router.push).not.toHaveBeenCalled();
        expect(useInjuryGateStore.getState().gateCase).toBeNull();
    });

    test("needsInjuryGate → 'extract': false zurück, push auf /injury-gate, Callback gespeichert", async () => {
        setupProfileFetch({ schedule_notes: 'Knie zwickt', injury_extraction_status: 'pending', injury_confirmed_at: null });
        mockedFetchActiveConstraints.mockResolvedValue([]);
        mockedNeedsInjuryGate.mockReturnValue('extract');
        const router = mockRouter();
        const onPassed = jest.fn();

        const result = await ensureInjuryGate(router, onPassed);

        expect(result).toBe(false);
        expect(router.push).toHaveBeenCalledWith('/injury-gate');
        const state = useInjuryGateStore.getState();
        expect(state.gateCase).toBe('extract');
        expect(state.sourceNote).toBe('Knie zwickt');
        expect(state.onPassed).toBe(onPassed);

        // pass() führt den gespeicherten Callback aus und räumt den Store
        state.pass();
        expect(onPassed).toHaveBeenCalledTimes(1);
        expect(useInjuryGateStore.getState().gateCase).toBeNull();
        expect(useInjuryGateStore.getState().onPassed).toBeNull();
    });

    test('kein Error-Schlucken: Profil-Fetch-Fehler wirft (fail-closed)', async () => {
        mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
        mockedSupabase.from.mockReturnValue({
            select: () => ({
                eq: () => ({
                    single: () => Promise.resolve({ data: null, error: new Error('boom') }),
                }),
            }),
        });

        await expect(ensureInjuryGate(mockRouter(), jest.fn())).rejects.toThrow('boom');
    });

    test('kein Error-Schlucken: getSession-Fehler wirft statt fail-open als "kein Gate" zu lesen (Fix Round 1, Finding 4)', async () => {
        mockedSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: new Error('session boom') });

        await expect(ensureInjuryGate(mockRouter(), jest.fn())).rejects.toThrow('session boom');
        // Darf trotz fehlender Session keinen "kein Gate nötig"-Pfad einschlagen
        expect(mockedSupabase.from).not.toHaveBeenCalled();
    });
});
