import { test } from 'node:test'
import assert from 'node:assert/strict'
import { derivePrescription, type CurrentPrescription } from './prescription'

const base: CurrentPrescription = {
  target_sets: 4, target_reps_min: 6, target_reps_max: 8,
  target_duration_seconds: null, target_distance_meters: null,
  target_rest_seconds: 120, target_load_type: 'kg', target_load_value: 80,
  is_amrap: false, target_rounds: null,
}

test('kg-Last wird nie übernommen: Gerät-Kandidat bekommt RPE 7 im Kraftblock', () => {
  const p = derivePrescription(base, { measurement_type: 'reps', requiresEquipment: true }, 'lower_strength')
  assert.equal(p.target_load_type, 'rpe'); assert.equal(p.target_load_value, 7)
  assert.equal(p.target_sets, 4); assert.equal(p.target_reps_min, 6); assert.equal(p.target_reps_max, 8)
})
test('Bodyweight-Kandidat bekommt bodyweight/-1', () => {
  const p = derivePrescription(base, { measurement_type: 'reps', requiresEquipment: false }, 'lower_strength')
  assert.equal(p.target_load_type, 'bodyweight'); assert.equal(p.target_load_value, -1)
})
test('Mess-Typ-Wechsel reps→duration: Dauer gesetzt, Reps genullt', () => {
  const p = derivePrescription(base, { measurement_type: 'duration', requiresEquipment: false }, 'core')
  assert.equal(p.target_duration_seconds, 30)
  assert.equal(p.target_reps_min, null); assert.equal(p.target_reps_max, null)
})
test('reps_or_duration folgt der aktuellen Zeile: zeitbasiert bleibt zeitbasiert', () => {
  const cur = { ...base, target_reps_min: null, target_reps_max: null, target_duration_seconds: 45, target_load_type: 'bodyweight', target_load_value: -1 }
  const p = derivePrescription(cur, { measurement_type: 'reps_or_duration', requiresEquipment: false }, 'core')
  assert.equal(p.target_duration_seconds, 45); assert.equal(p.target_reps_max, null)
})
test('rpe/bodyweight der aktuellen Zeile bleibt erhalten (kein Downgrade)', () => {
  const cur = { ...base, target_load_type: 'rpe', target_load_value: 8 }
  const p = derivePrescription(cur, { measurement_type: 'reps', requiresEquipment: true }, 'upper_strength')
  assert.equal(p.target_load_type, 'rpe'); assert.equal(p.target_load_value, 8)
})
test('Nicht-Kraftblock-Default ist RPE 6 (fixInvalidLoads-Parität)', () => {
  const p = derivePrescription(base, { measurement_type: 'reps', requiresEquipment: true }, 'accessory')
  assert.equal(p.target_load_value, 6)
})
test('Bodyweight-Zeile → Geräte-Kandidat bekommt RPE 7 im Kraftblock (Finding 3)', () => {
  const cur = { ...base, target_load_type: 'bodyweight', target_load_value: -1 }
  const p = derivePrescription(cur, { measurement_type: 'reps', requiresEquipment: true }, 'lower_strength')
  assert.equal(p.target_load_type, 'rpe'); assert.equal(p.target_load_value, 7)
})
