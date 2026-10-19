// Vorgaben-Ableitung beim Swap (Spec 2026-10-19 §3): Satzschema/Pause bleiben
// vom Slot, Last + Mess-Typ werden übungsgerecht gesetzt — Parität zu
// fixInvalidLoads im Worker (Kraft RPE 7, Rest RPE 6, bodyweight = -1).
const STRENGTH_BLOCK_TYPES = new Set(['lower_strength', 'upper_strength', 'push', 'pull', 'lower_body'])

export type CurrentPrescription = {
  target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null
  target_duration_seconds: number | null; target_distance_meters: number | null
  target_rest_seconds: number | null; target_load_type: string | null; target_load_value: number | null
  is_amrap: boolean; target_rounds: number | null
}
export type SwapCandidateMeta = { measurement_type: string | null; requiresEquipment: boolean }

export function derivePrescription(
  current: CurrentPrescription, candidate: SwapCandidateMeta, blockType: string,
): CurrentPrescription {
  const p: CurrentPrescription = {
    ...current,
    target_reps_min: null, target_reps_max: null,
    target_duration_seconds: null, target_distance_meters: null,
  }
  const m = candidate.measurement_type ?? 'reps'
  const currentIsTimed = (current.target_duration_seconds ?? 0) > 0
  if (m === 'duration' || (m === 'reps_or_duration' && currentIsTimed)) {
    p.target_duration_seconds = currentIsTimed ? current.target_duration_seconds : 30
  } else if (m === 'distance') {
    p.target_distance_meters = (current.target_distance_meters ?? 0) > 0 ? current.target_distance_meters : 20
  } else {
    p.target_reps_min = current.target_reps_min ?? 8
    p.target_reps_max = current.target_reps_max ?? 12
  }
  if (!candidate.requiresEquipment) {
    p.target_load_type = 'bodyweight'; p.target_load_value = -1
  } else if (current.target_load_type !== 'rpe') {
    // Finding 3: jeder Nicht-RPE-Ausgangswert (bodyweight/kg/percent_1rm/pace/null)
    // ist für einen Geräte-Kandidaten bedeutungslos (z.B. Plank → Kurzhantel-
    // Übung darf nicht als "bodyweight" stehen bleiben) — auf RPE normalisieren.
    // Ist die aktuelle Zeile schon RPE, bleibt ihr Wert erhalten (kein Downgrade).
    p.target_load_type = 'rpe'
    p.target_load_value = STRENGTH_BLOCK_TYPES.has(blockType) ? 7 : 6
  }
  return p
}
