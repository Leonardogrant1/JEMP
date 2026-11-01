// Rest-Gate (Spec §5, Plan B Intake — Task 5): blockiert jeden
// Plan-Generierungs-Trigger, bis offene Verletzungs-Constraints geklärt
// sind. Store hält nur, was das Sheet (app/injury-gate.tsx) nach dem
// router.push braucht — es wird nicht mit Props instanziiert.
import { fetchActiveConstraints, needsInjuryGate, type InjuryConstraint } from '@/lib/injury-constraints';
import { supabase } from '@/services/supabase/client';
import type { ImperativeRouter } from 'expo-router';
import { create } from 'zustand';

export type InjuryGateCase = 'extract' | 'retry' | 'recheck';

type InjuryGateState = {
    gateCase: InjuryGateCase | null;
    sourceNote: string | null;
    activeConstraints: InjuryConstraint[];
    onPassed: (() => void) | null;
    // Vom Sheet nach erfolgreichem Abschluss gerufen: führt den
    // ursprünglichen Trigger aus und räumt den Store für den nächsten Gate-Lauf.
    pass: () => void;
    clear: () => void;
};

export const useInjuryGateStore = create<InjuryGateState>((set, get) => ({
    gateCase: null,
    sourceNote: null,
    activeConstraints: [],
    onPassed: null,
    pass: () => {
        const onPassed = get().onPassed;
        set({ gateCase: null, sourceNote: null, activeConstraints: [], onPassed: null });
        onPassed?.();
    },
    clear: () => set({ gateCase: null, sourceNote: null, activeConstraints: [], onPassed: null }),
}));

/**
 * Rest-Gate vor jedem Plan-Generierungs-Trigger.
 * true  = kein Gate nötig, Aufrufer fährt sofort fort.
 * false = Gate nötig: onPassed im Store hinterlegt, '/injury-gate' gepusht,
 *         Aufrufer bricht ab (`return`). Das Sheet ruft onPassed() nach
 *         erfolgreichem Abschluss auf.
 *
 * Profil + aktive Constraints werden hier frisch über Supabase geholt statt
 * aus einem Provider gelesen — der könnte seit dem letzten confirm/revoke
 * stale sein (Review Focus 3 aus Task 2: frisch bestätigt darf NICHT erneut
 * gaten).
 */
export async function ensureInjuryGate(
    router: ImperativeRouter,
    onPassed: () => void,
): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return true; // kein User (sollte vom Auth-Guard schon abgefangen sein)

    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('schedule_notes, injury_extraction_status, injury_confirmed_at')
        .eq('id', session.user.id)
        .single();
    if (profileError) throw profileError;

    const activeConstraints = await fetchActiveConstraints();
    const gateCase = needsInjuryGate(profile, activeConstraints.length > 0);
    if (!gateCase) return true;

    useInjuryGateStore.setState({
        gateCase,
        sourceNote: profile.schedule_notes,
        activeConstraints,
        onPassed,
    });
    router.push('/injury-gate');
    return false;
}
