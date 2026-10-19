import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSwapPool } from './swap-pool'
import type { V2Exercise } from '../../../jemp-temporal-worker/src/plan-generation/v2/pool'
import type { ExerciseFilterMaps } from '../../../jemp-temporal-worker/src/plan-generation/v2/exercise-filter'

let n = 0
function mkEx(over: Partial<V2Exercise>): V2Exercise {
  n += 1
  return {
    id: `id_${n}`, slug: `ex_${n}`, name: `Ex ${n}`, category_slug: 'strength',
    body_region: 'chest', dominant_region: null, strength_pattern: 'push_horizontal',
    plyo_type: null, core_type: null, sprint_type: null, covered_patterns: null,
    laterality: 'bilateral', min_level: 1, max_level: 100, intensity_score: 6,
    measurement_type: 'reps', exercise_type: null, legacy_block_slugs: null,
    movement_type: 'sagittal', is_explosive: false, regions: null,
    is_sport_specific: false, preferred: false, ...over,
  }
}
function mkMaps(over: Partial<ExerciseFilterMaps> = {}): ExerciseFilterMaps {
  return {
    envByExercise: new Map(), equipByExercise: new Map(),
    userEnvs: new Set(), userEquip: new Set(), equipmentEnvs: new Map(),
    levelByCategoryId: new Map([['cat_strength', 50]]), hasLevelData: true, ...over,
  }
}
const gate = () => true
// Hinweis: makeExerciseFilter prüft Level über row.categories.id — der Handler
// (Task 6) hängt categories an die V2Exercise-Rows an; die Tests tun dasselbe:
function withCat(e: V2Exercise): V2Exercise & { categories: { id: string } } {
  return { ...e, categories: { id: 'cat_strength' } }
}

test('Pattern-Bindung: Pull-Zeile liefert keine Push-Kandidaten (Coverage-Garantie)', () => {
  const pull = withCat(mkEx({ slug: 'barbell_row', strength_pattern: 'pull_horizontal' }))
  const push = withCat(mkEx({ slug: 'bench_press', strength_pattern: 'push_horizontal' }))
  const pull2 = withCat(mkEx({ slug: 'cable_row', strength_pattern: 'pull_horizontal' }))
  const r = buildSwapPool({
    exercises: [pull, push, pull2], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'upper_strength', currentExercise: pull,
    assignedPattern: 'pull_horizontal', patternEmphasis: 'normal',
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['cable_row'])
})
test('Pattern-Ableitung bei Alt-Plan (assignedPattern null): strength_pattern der Übung zählt', () => {
  const pull = withCat(mkEx({ slug: 'barbell_row', strength_pattern: 'pull_horizontal' }))
  const push = withCat(mkEx({ slug: 'bench_press', strength_pattern: 'push_horizontal' }))
  const pull2 = withCat(mkEx({ slug: 'cable_row', strength_pattern: 'pull_horizontal' }))
  const r = buildSwapPool({
    exercises: [pull, push, pull2], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'upper_strength', currentExercise: pull,
    assignedPattern: null, patternEmphasis: null,
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['cable_row'])
})
test('Heavy-Filter über pattern_emphasis: frontal/Activation fliegt raus', () => {
  const cur = withCat(mkEx({ slug: 'back_squat', strength_pattern: 'knee_dominant', intensity_score: 8 }))
  const strong = withCat(mkEx({ slug: 'front_squat', strength_pattern: 'knee_dominant', intensity_score: 7 }))
  const weak = withCat(mkEx({ slug: 'lateral_lunge', strength_pattern: 'knee_dominant', movement_type: 'frontal', intensity_score: 4 }))
  const r = buildSwapPool({
    exercises: [cur, strong, weak], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'lower_strength', currentExercise: cur,
    assignedPattern: 'knee_dominant', patternEmphasis: 'heavy',
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['front_squat'])
})
test('Accessory ohne Pattern: Region-Bindung statt voller Block-Pool (QA 19.10.)', () => {
  const cur = withCat(mkEx({ slug: 'calf_raise', strength_pattern: null, body_region: 'calf' }))
  const sameRegion = withCat(mkEx({ slug: 'seated_calf_raise', strength_pattern: null, body_region: 'calf' }))
  const otherRegion = withCat(mkEx({ slug: 'tib_raise', strength_pattern: null, body_region: 'ankle' }))
  const r = buildSwapPool({
    exercises: [cur, sameRegion, otherRegion], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'accessory', currentExercise: cur,
    assignedPattern: null, patternEmphasis: null,
  })
  // ankle liegt zwar im Accessory-Block-Pool, trifft aber nicht die Region
  // der getauschten Übung — Waden tauschen nur gegen Waden.
  assert.deepEqual(r.alternatives.map(a => a.slug), ['seated_calf_raise'])
})
test('Region-Joker: full_body-Drills passen zu jeder Region, Fremd-Region bleibt draußen', () => {
  const cur = withCat(mkEx({ slug: 'cossack_squat', strength_pattern: null, category_slug: 'mobility', body_region: 'groin', legacy_block_slugs: ['warmup'] }))
  // dominant_region gesetzt: effectiveRegion wäre 'hip' — der Joker muss
  // trotzdem über das rohe body_region='full_body' greifen.
  const fullBody = withCat(mkEx({ slug: 'worlds_greatest_stretch', strength_pattern: null, category_slug: 'mobility', body_region: 'full_body', dominant_region: 'hip', legacy_block_slugs: ['warmup'] }))
  const foreign = withCat(mkEx({ slug: 'arm_circle', strength_pattern: null, category_slug: 'mobility', body_region: 'shoulder', legacy_block_slugs: ['warmup'] }))
  const r = buildSwapPool({
    exercises: [cur, fullBody, foreign], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'warmup', currentExercise: cur,
    assignedPattern: null, patternEmphasis: null,
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['worlds_greatest_stretch'])
})
test('Session-Dedupe: bereits verplante Übungen sind keine Alternativen (QA 19.10.)', () => {
  const cur = withCat(mkEx({ slug: 'barbell_row', strength_pattern: 'pull_horizontal' }))
  const inSession = withCat(mkEx({ slug: 'cable_row', strength_pattern: 'pull_horizontal' }))
  const fresh = withCat(mkEx({ slug: 'db_row', strength_pattern: 'pull_horizontal' }))
  const r = buildSwapPool({
    exercises: [cur, inSession, fresh], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'upper_strength', currentExercise: cur,
    assignedPattern: 'pull_horizontal', patternEmphasis: 'normal',
    excludeExerciseIds: new Set([inSession.id]),
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['db_row'])
})
test('Warmup: Mobility tauscht nur innerhalb derselben Region (QA 19.10.)', () => {
  const cur = withCat(mkEx({ slug: 'ankle_cars', strength_pattern: null, category_slug: 'mobility', body_region: 'ankle', legacy_block_slugs: ['warmup'] }))
  const sameRegion = withCat(mkEx({ slug: 'ankle_rocks', strength_pattern: null, category_slug: 'mobility', body_region: 'ankle', legacy_block_slugs: ['warmup'] }))
  const otherRegion = withCat(mkEx({ slug: 'thoracic_rotation', strength_pattern: null, category_slug: 'mobility', body_region: 'thoracic', legacy_block_slugs: ['warmup'] }))
  const r = buildSwapPool({
    exercises: [cur, sameRegion, otherRegion], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'warmup', currentExercise: cur,
    assignedPattern: null, patternEmphasis: null,
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['ankle_rocks'])
})
test('Level-Lock: zu schwere Übung landet in locked mit unlock_level (nie in alternatives)', () => {
  const cur = withCat(mkEx({ slug: 'squat', strength_pattern: 'knee_dominant' }))
  const hard = withCat(mkEx({ slug: 'pistol_squat', strength_pattern: 'knee_dominant', min_level: 70 }))
  const easy = withCat(mkEx({ slug: 'goblet_squat', strength_pattern: 'knee_dominant' }))
  const r = buildSwapPool({
    exercises: [cur, hard, easy], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'lower_strength', currentExercise: cur,
    assignedPattern: 'knee_dominant', patternEmphasis: 'normal',
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['goblet_squat'])
  assert.deepEqual(r.locked, [{ exercise: hard, unlock_level: 70 }])
})
test('Ohne Level-Daten: alles in alternatives, locked leer (Review Focus 5)', () => {
  const cur = withCat(mkEx({ slug: 'squat', strength_pattern: 'knee_dominant' }))
  const hard = withCat(mkEx({ slug: 'pistol_squat', strength_pattern: 'knee_dominant', min_level: 70 }))
  const r = buildSwapPool({
    exercises: [cur, hard], maps: mkMaps({ hasLevelData: false, levelByCategoryId: new Map() }),
    sportGate: gate, dayEnvId: null, blockTypeSlug: 'lower_strength', currentExercise: cur,
    assignedPattern: 'knee_dominant', patternEmphasis: 'normal',
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['pistol_squat'])
  assert.equal(r.locked.length, 0)
})
test('dayEnvId null crasht nicht und nutzt Any-Env (Review Focus 4)', () => {
  const cur = withCat(mkEx({ slug: 'squat', strength_pattern: 'knee_dominant' }))
  const alt = withCat(mkEx({ slug: 'front_squat', strength_pattern: 'knee_dominant' }))
  const r = buildSwapPool({
    exercises: [cur, alt], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'lower_strength', currentExercise: cur,
    assignedPattern: 'knee_dominant', patternEmphasis: 'normal',
  })
  assert.equal(r.alternatives.length, 1)
})
test('Equipment-Fail und Sport-Gate halten Kandidaten draußen (Spec §6)', () => {
  const cur = withCat(mkEx({ slug: 'squat', strength_pattern: 'knee_dominant' }))
  const barbell = withCat(mkEx({ slug: 'back_squat', strength_pattern: 'knee_dominant' }))
  const sporty = withCat(mkEx({ slug: 'keeper_squat', strength_pattern: 'knee_dominant', is_sport_specific: true }))
  const maps = mkMaps({ equipByExercise: new Map([[barbell.id, new Set(['equip_barbell'])]]) })
  const r = buildSwapPool({
    exercises: [cur, barbell, sporty], maps, sportGate: (row) => !row.is_sport_specific,
    dayEnvId: null, blockTypeSlug: 'lower_strength', currentExercise: cur,
    assignedPattern: 'knee_dominant', patternEmphasis: 'normal',
  })
  // barbell: User besitzt kein Equipment → raus; sporty: Gate → raus (auch nicht in locked)
  assert.equal(r.alternatives.length, 0)
  assert.equal(r.locked.length, 0)
})
test('Ungetaggte Alt-Plan-Zeile (coarse push): getaggte Push-Kandidaten bleiben im Pool', () => {
  const cur = withCat(mkEx({ slug: 'old_press', strength_pattern: null, body_region: 'chest' }))
  const tagged = withCat(mkEx({ slug: 'bench_press', strength_pattern: 'push_horizontal' }))
  const pullEx = withCat(mkEx({ slug: 'barbell_row', strength_pattern: 'pull_horizontal' }))
  const r = buildSwapPool({
    exercises: [cur, tagged, pullEx], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'upper_strength', currentExercise: cur,
    assignedPattern: null, patternEmphasis: null,
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['bench_press'])
})
test('Ebenen-Sortierung: gleiche movement_type wie aktuelle Übung zuerst', () => {
  const cur = withCat(mkEx({ slug: 'rot_press', strength_pattern: 'push_horizontal', movement_type: 'transverse' }))
  const sag = withCat(mkEx({ slug: 'a_bench', strength_pattern: 'push_horizontal', movement_type: 'sagittal' }))
  const rot = withCat(mkEx({ slug: 'z_landmine', strength_pattern: 'push_horizontal', movement_type: 'transverse' }))
  const r = buildSwapPool({
    exercises: [cur, sag, rot], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'upper_strength', currentExercise: cur,
    assignedPattern: 'push_horizontal', patternEmphasis: 'normal',
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['z_landmine', 'a_bench'])
})
test('Legacy-Blocktyp "pull": getaggte pull_horizontal-Zeile liefert nur Pull-Kandidaten (Finding 2a)', () => {
  const pull = withCat(mkEx({ slug: 'cable_row', strength_pattern: 'pull_horizontal' }))
  const pull2 = withCat(mkEx({ slug: 'barbell_row', strength_pattern: 'pull_horizontal' }))
  const push = withCat(mkEx({ slug: 'bench_press', strength_pattern: 'push_horizontal' }))
  const r = buildSwapPool({
    exercises: [pull, pull2, push], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'pull', currentExercise: pull,
    assignedPattern: null, patternEmphasis: null,
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['barbell_row'])
})
test('Legacy-Blocktyp "lower_body": knee_dominant-Zeile liefert keine Hinge-Kandidaten (Finding 2a)', () => {
  const squat = withCat(mkEx({ slug: 'goblet_squat', strength_pattern: 'knee_dominant' }))
  const frontSquat = withCat(mkEx({ slug: 'front_squat', strength_pattern: 'knee_dominant' }))
  const deadlift = withCat(mkEx({ slug: 'rdl', strength_pattern: 'hinge' }))
  const r = buildSwapPool({
    exercises: [squat, frontSquat, deadlift], maps: mkMaps(), sportGate: gate, dayEnvId: null,
    blockTypeSlug: 'lower_body', currentExercise: squat,
    assignedPattern: null, patternEmphasis: null,
  })
  assert.deepEqual(r.alternatives.map(a => a.slug), ['front_squat'])
})
