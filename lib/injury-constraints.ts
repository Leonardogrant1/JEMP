// Injury-Constraints Service-Schicht (App, Plan B Intake — Task 2).
//
// ExtractionProposal/ExtractionResult sind hier als App-Typen dupliziert:
// jemp-api ist aus der App nicht importierbar (eigenständiges Backend-Paket),
// die Shapes müssen Byte für Byte zu
// externals/jemp-api/src/injury-extraction/extract.ts passen (Task 1).
//
// Fail-closed-Disziplin wie bei Plan A: Supabase-Fehler werden NIE
// stillschweigend geschluckt (kein `?? []`-Fallback bei error), sondern
// geworfen — ein verschluckter Fehler sähe hier wie "keine Constraints" aus,
// was die Übungsauswahl unbemerkt falsch füttern würde.
import { supabase } from '@/services/supabase/client';

export type ExtractionProposal = {
    tag_slug: string;
    mode: 'block' | 'light_only';
    acute: boolean;
    reason: string;
};

export type ExtractionResult = {
    constraints: ExtractionProposal[];
    unmapped: string[]; // erkannte Verletzungsinhalte ohne passenden Tag
    scheduling: string[]; // erkannte Scheduling-Inhalte (werden gespiegelt, nicht verarbeitet)
    noise: string[];
};

export type InjuryConstraint = {
    id: string;
    tag_slug: string;
    mode: 'block' | 'light_only';
    acute: boolean;
    source_note: string | null;
    confirmed_at: string;
};

// 'ok' = User lehnt den Vorschlag ab → keine Row wird angelegt.
export type ConfirmedChoice = {
    tag_slug: string;
    mode: 'block' | 'light_only' | 'ok';
    acute: boolean;
};

const EXTRACTION_TIMEOUT_MS = 15_000;
const RECHECK_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // Spec §5: "älter als 7 Tage"

export async function fetchContraindicationTags(): Promise<{ id: string; slug: string }[]> {
    const { data, error } = await supabase.from('contraindication_tags').select('id, slug');
    if (error) throw error;
    return data ?? [];
}

// revoked_at IS NULL (aktive Rows), Slug über die FK-Relation eingebettet —
// die DB speichert nur contraindication_tag_id, nicht den Slug selbst.
export async function fetchActiveConstraints(): Promise<InjuryConstraint[]> {
    const { data, error } = await supabase
        .from('user_injury_constraints')
        .select('id, mode, acute, source_note, confirmed_at, contraindication_tags(slug)')
        .is('revoked_at', null);
    if (error) throw error;

    return (data ?? []).map((row) => {
        const tag = row.contraindication_tags as unknown as { slug: string } | null;
        return {
            id: row.id,
            tag_slug: tag?.slug ?? '',
            mode: row.mode as 'block' | 'light_only',
            acute: row.acute,
            source_note: row.source_note,
            confirmed_at: row.confirmed_at,
        };
    });
}

// POST /api/injury-extraction — Muster aus lib/fetch-swap-alternatives.ts:15-31
// (Session-Token, EXPO_PUBLIC_BACKEND_URL, Bearer-Header), + 15s-Client-Timeout.
export async function requestExtraction(note: string): Promise<ExtractionResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No auth session');

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    const res = await fetch(`${backendUrl}/api/injury-extraction`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
        signal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    return res.json();
}

// Review Fix 1 (Task 5, Finding 2): confirmInjuryConstraints überschreibt
// source_note batch-weit mit dem EINEN übergebenen sourceNote-Argument — der
// Recheck-Ein-Tap-Pfad hat aber gar keinen neuen Freitext (übergibt null),
// würde also die Provenienz jeder unveränderten Row für immer auf null
// setzen. Pure Merge-Funktion: ein non-null incoming gewinnt immer (neuer
// Freitext überschreibt bewusst); ein null incoming übernimmt die
// source_note der Vorgänger-Row (per tag_slug), oder bleibt null, wenn es
// gar keine Vorgänger-Row gab (neuer Tag ohne Vorgeschichte).
export function resolveSourceNote(
    incoming: string | null,
    predecessorSourceNote: string | null | undefined,
): string | null {
    if (incoming !== null) return incoming;
    return predecessorSourceNote ?? null;
}

// 1) bestehende aktive Rows des Users schließen (revoked_at=now), damit der
//    Unique-Index (user_id, contraindication_tag_id) WHERE revoked_at IS NULL
//    nicht mit den neuen Rows kollidiert, 2) pro choice.mode!=='ok' eine Row
//    inserten (confirmed_at=now), 3) user_profiles-Status auf 'confirmed'.
export async function confirmInjuryConstraints(
    choices: ConfirmedChoice[],
    sourceNote: string | null,
    origin: 'onboarding' | 'recheck' | 'manual',
): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No auth session');
    const userId = session.user.id;
    const now = new Date().toISOString();

    // Vorgänger-Rows VOR dem Revoke lesen — danach sind sie per revoked_at
    // nicht mehr "aktiv" und über fetchActiveConstraints nicht mehr auffindbar.
    const predecessors = await fetchActiveConstraints();
    const predecessorSourceNoteByTag = new Map(predecessors.map((c) => [c.tag_slug, c.source_note]));

    const { error: revokeError } = await supabase
        .from('user_injury_constraints')
        .update({ revoked_at: now })
        .eq('user_id', userId)
        .is('revoked_at', null);
    if (revokeError) throw revokeError;

    const toInsert = choices.filter((c) => c.mode !== 'ok');
    if (toInsert.length > 0) {
        const tags = await fetchContraindicationTags();
        const slugToId = new Map(tags.map((t) => [t.slug, t.id]));
        const rows = toInsert.map((c) => {
            const tagId = slugToId.get(c.tag_slug);
            if (!tagId) throw new Error(`confirmInjuryConstraints: unknown tag_slug "${c.tag_slug}"`);
            return {
                user_id: userId,
                contraindication_tag_id: tagId,
                mode: c.mode as 'block' | 'light_only',
                acute: c.acute,
                source_note: resolveSourceNote(sourceNote, predecessorSourceNoteByTag.get(c.tag_slug)),
                origin,
                confirmed_at: now,
            };
        });
        const { error: insertError } = await supabase.from('user_injury_constraints').insert(rows);
        if (insertError) throw insertError;
    }

    const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ injury_extraction_status: 'confirmed', injury_confirmed_at: now })
        .eq('id', userId);
    if (profileError) throw profileError;
}

export type StrippableExercise = { id: string; exercise_id: string };
export type StrippableBlock = { id: string; exercises: StrippableExercise[] };
export type StrippableSession = {
    id: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
    blocks: StrippableBlock[];
};

// Reiner Selektions-Kern für Task 6 (Strip-on-Change): welche
// workout_session_block_exercises/-_blocks dürfen gelöscht werden, wenn ein
// neuer/verschärfter `block`-Constraint eine Exercise ausschließt.
// Review Focus 4: geloggte/abgeschlossene Sessions oder Exercises mit
// performed sets werden NIE angefasst — die Session-Historie darf
// nachträglich nicht anders aussehen, als tatsächlich geloggt wurde (gleiche
// Disziplin wie die Swap-Sperre in mutations/use-swap-exercise.ts:17-22).
// performedSetCounts ist auf block_exercise.id keyed (>0 = gesperrt).
export function selectStrippable(
    sessions: StrippableSession[],
    blockedExerciseIds: Set<string>,
    performedSetCounts: Record<string, number>,
): { exerciseIdsToDelete: string[]; blockIdsToDelete: string[]; removedExercises: number; removedBlocks: number } {
    const exerciseIdsToDelete: string[] = [];
    const blockIdsToDelete: string[] = [];

    for (const session of sessions) {
        // Nur zukünftige, noch nicht begonnene Sessions sind fair game —
        // in_progress/completed/skipped/cancelled bleiben unberührt.
        if (session.status !== 'scheduled') continue;

        for (const block of session.blocks) {
            if (block.exercises.length === 0) continue;

            const remaining = block.exercises.filter((ex) => {
                const blocked = blockedExerciseIds.has(ex.exercise_id);
                const locked = (performedSetCounts[ex.id] ?? 0) > 0;
                if (blocked && !locked) {
                    exerciseIdsToDelete.push(ex.id);
                    return false;
                }
                return true;
            });

            if (remaining.length === 0) {
                blockIdsToDelete.push(block.id);
            }
        }
    }

    return {
        exerciseIdsToDelete,
        blockIdsToDelete,
        removedExercises: exerciseIdsToDelete.length,
        removedBlocks: blockIdsToDelete.length,
    };
}

export async function markExtractionFailed(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No auth session');

    const { error } = await supabase
        .from('user_profiles')
        .update({ injury_extraction_status: 'failed' })
        .eq('id', session.user.id);
    if (error) throw error;
}

// Rest-Gate (Spec §5): Gate-Priorität extract > retry > recheck.
// - 'extract': Bestandsuser mit Freitext-Note, aber Extraktion noch nicht
//   gelaufen (Fall a) — kein separater Backfill-Job, läuft über dieses Gate.
// - 'retry': letzte Extraktion ist fehlgeschlagen (Fall b).
// - 'recheck': aktive Constraints vorhanden UND letzte Bestätigung älter als
//   7 Tage (Fall c) — frisch bestätigt oder keine aktiven Constraints lösen
//   NICHT aus (Review Focus 3).
export function needsInjuryGate(
    p: { schedule_notes: string | null; injury_extraction_status: string; injury_confirmed_at: string | null },
    hasActiveConstraints: boolean,
    now: Date = new Date(),
): 'extract' | 'retry' | 'recheck' | null {
    if (p.schedule_notes && p.schedule_notes.trim() !== '' && p.injury_extraction_status === 'pending') {
        return 'extract';
    }
    if (p.injury_extraction_status === 'failed') {
        return 'retry';
    }
    if (hasActiveConstraints && p.injury_confirmed_at) {
        const ageMs = now.getTime() - new Date(p.injury_confirmed_at).getTime();
        if (ageMs > RECHECK_AFTER_MS) return 'recheck';
    }
    return null;
}
