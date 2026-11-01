// Task 7: Sichtbarkeitsdaten (Spec §5). detectPriorityConflicts und
// computeInjuryAdjusted sind pure — prepare-v2 selbst (IO-lastig) ruft sie
// genau einmal auf (vor/nach filterRowsByInjury), threaded aber hier nicht getestet.
import { describe, it, expect } from 'vitest'
import { detectPriorityConflicts, computeInjuryAdjusted, type V2ExerciseRow } from '../injury-constraints'
import type { InjuryExclusions } from '../injury-constraints'
import type { PillarLevels } from '../../week-layout'

const sprintRow = (): V2ExerciseRow => ({ sprint_type: 'acceleration', plyo_type: null, strength_pattern: null })
const lowerPlyoRow = (): V2ExerciseRow => ({ sprint_type: null, plyo_type: 'lower', strength_pattern: null })
const upperPlyoRow = (): V2ExerciseRow => ({ sprint_type: null, plyo_type: 'upper', strength_pattern: null })
const strengthRow = (): V2ExerciseRow => ({ sprint_type: null, plyo_type: null, strength_pattern: 'squat' })
const neutralRow = (): V2ExerciseRow => ({ sprint_type: null, plyo_type: null, strength_pattern: null })

describe('detectPriorityConflicts', () => {
  it('sprints=3 + alle Sprints blockiert → pool_emptied', () => {
    const before = [sprintRow(), sprintRow(), sprintRow(), neutralRow()]
    const after = [neutralRow()]
    const pillarLevels: PillarLevels = { sprints: 3 }

    expect(detectPriorityConflicts(before, after, pillarLevels)).toEqual([
      { pillar: 'sprints', reason: 'pool_emptied' },
    ])
  })

  it('sprints=2 (keine Prio-1-Säule) + Pool leer → KEIN Konflikt', () => {
    const before = [sprintRow(), sprintRow()]
    const after: V2ExerciseRow[] = []
    const pillarLevels: PillarLevels = { sprints: 2 }

    expect(detectPriorityConflicts(before, after, pillarLevels)).toEqual([])
  })

  it('strength=3 + 40% entfernt (60% bleiben) → kein Konflikt (über 50%-Schwelle)', () => {
    const before = [strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow()]
    // 5 → 3 (40% raus, 60% bleiben, afterCount 3 ist nicht < 3 und 3 > 2.5)
    const after = [strengthRow(), strengthRow(), strengthRow()]
    const pillarLevels: PillarLevels = { strength: 3 }

    expect(detectPriorityConflicts(before, after, pillarLevels)).toEqual([])
  })

  it('strength=3 + Pool auf unter 3 reduziert → pool_reduced', () => {
    const before = [strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow()]
    const after = [strengthRow(), strengthRow()]
    const pillarLevels: PillarLevels = { strength: 3 }

    expect(detectPriorityConflicts(before, after, pillarLevels)).toEqual([
      { pillar: 'strength', reason: 'pool_reduced' },
    ])
  })

  it('strength=3 + genau die Hälfte entfernt (≤ 50%-Schwelle inklusiv) → pool_reduced', () => {
    const before = [strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow(), strengthRow()]
    const after = [strengthRow(), strengthRow(), strengthRow(), strengthRow()]
    const pillarLevels: PillarLevels = { strength: 3 }

    expect(detectPriorityConflicts(before, after, pillarLevels)).toEqual([
      { pillar: 'strength', reason: 'pool_reduced' },
    ])
  })

  it('lower/upper_body_plyometrics: eigene plyo_type-Prädikate, nicht gegenseitig betroffen', () => {
    const before = [lowerPlyoRow(), lowerPlyoRow(), lowerPlyoRow(), upperPlyoRow(), upperPlyoRow(), upperPlyoRow()]
    const after = [upperPlyoRow(), upperPlyoRow(), upperPlyoRow()] // lower komplett raus, upper unverändert
    const pillarLevels: PillarLevels = { lower_body_plyometrics: 3, upper_body_plyometrics: 3 }

    expect(detectPriorityConflicts(before, after, pillarLevels)).toEqual([
      { pillar: 'lower_body_plyometrics', reason: 'pool_emptied' },
    ])
  })

  it('Pool war schon vorher leer (Datenloch) → kein constraint-bedingter Konflikt', () => {
    const before: V2ExerciseRow[] = []
    const after: V2ExerciseRow[] = []
    const pillarLevels: PillarLevels = { sprints: 3 }

    expect(detectPriorityConflicts(before, after, pillarLevels)).toEqual([])
  })

  it('leere pillarLevels → nie ein Konflikt', () => {
    const before = [sprintRow()]
    const after: V2ExerciseRow[] = []

    expect(detectPriorityConflicts(before, after, {})).toEqual([])
  })
})

describe('computeInjuryAdjusted', () => {
  const makeExclusions = (over: Partial<InjuryExclusions> = {}): InjuryExclusions => ({
    blockedIds: new Set(),
    lightOnlyIds: new Set(),
    acute: false,
    ...over,
  })

  it('Exclusions schneiden das Universum (blockedIds trifft eine Row) → true', () => {
    const exclusions = makeExclusions({ blockedIds: new Set(['ex1']) })
    const rows = [{ id: 'ex1' }, { id: 'ex2' }]

    expect(computeInjuryAdjusted(exclusions, rows)).toBe(true)
  })

  it('leere Exclusions → false (Referenz-No-Op bleibt)', () => {
    const exclusions = makeExclusions()
    const rows = [{ id: 'ex1' }, { id: 'ex2' }]

    expect(computeInjuryAdjusted(exclusions, rows)).toBe(false)
  })

  it('light_only trifft eine Row → true (zählt genauso wie block)', () => {
    const exclusions = makeExclusions({ lightOnlyIds: new Set(['ex2']) })
    const rows = [{ id: 'ex1' }, { id: 'ex2' }]

    expect(computeInjuryAdjusted(exclusions, rows)).toBe(true)
  })

  it('Exclusions nicht leer, aber treffen keine Row im Universum → false', () => {
    const exclusions = makeExclusions({ blockedIds: new Set(['unrelated_id']) })
    const rows = [{ id: 'ex1' }, { id: 'ex2' }]

    expect(computeInjuryAdjusted(exclusions, rows)).toBe(false)
  })
})
