// Verschreibungs-Helfer (Phase 4): Conditioning-Blöcke tragen Intervall-Format
// (Runden × Arbeit/Pause) statt Sätze×Wiederholungen — und die Runden laufen
// in der Active Session als Duration-Sätze über die bestehende Maschinerie.

export type IntervalPrescription = { rounds: number; workSeconds: number; restSeconds: number };

/** null, wenn keine Intervall-Verschreibung (target_rounds leer) — dann gilt Sätze×Wdh wie bisher. */
export function intervalPrescription(ex: {
    target_rounds?: number | null;
    target_duration_seconds?: number | null;
    target_rest_seconds?: number | null;
}): IntervalPrescription | null {
    if (!ex.target_rounds || ex.target_rounds <= 0) return null;
    if (!ex.target_duration_seconds || ex.target_duration_seconds <= 0) return null;
    return {
        rounds: ex.target_rounds,
        workSeconds: ex.target_duration_seconds,
        restSeconds: ex.target_rest_seconds && ex.target_rest_seconds > 0 ? ex.target_rest_seconds : 0,
    };
}

/** Geplante Satz-Anzahl: Conditioning-Runden = Duration-Sätze (kein neuer Timer). */
export function plannedSetCount(ex: { target_sets?: number | null; target_rounds?: number | null }): number {
    if (ex.target_rounds && ex.target_rounds > 0) return ex.target_rounds;
    return ex.target_sets && ex.target_sets > 0 ? ex.target_sets : 1;
}

/** Duration-Modus: echtes duration-measurement ODER Intervall-Verschreibung —
 *  EIN Prädikat für use-log-set, SetTable und TimerAutoStopper (Review I1/I2). */
export function isDurationMode(
    measurementType: string | null | undefined,
    ex: { target_rounds?: number | null; target_duration_seconds?: number | null; target_rest_seconds?: number | null },
): boolean {
    return measurementType === 'duration' || intervalPrescription(ex) !== null;
}

export type DistancePrescription = { attempts: number; meters: number };

/** Sprint-Verschreibung (Spec §5.2): Distanz + Versuche — nur ohne Intervall-Format. */
export function distancePrescription(ex: {
    target_sets?: number | null;
    target_distance_meters?: number | null;
    target_rounds?: number | null;
    target_duration_seconds?: number | null;
}): DistancePrescription | null {
    if (intervalPrescription(ex) !== null) return null;
    if (!ex.target_distance_meters || ex.target_distance_meters <= 0) return null;
    return { attempts: ex.target_sets && ex.target_sets > 0 ? ex.target_sets : 1, meters: ex.target_distance_meters };
}
