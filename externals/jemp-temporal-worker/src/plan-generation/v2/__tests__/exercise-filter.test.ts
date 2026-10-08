import { describe, it, expect } from 'vitest'
import { makeExerciseFilter, type ExerciseFilterMaps } from '../prepare-v2'

const row = (id: string) => ({ id, min_level: 1, max_level: 100, categories: { id: 'cat1' } })

function maps(overrides: Partial<ExerciseFilterMaps> = {}): ExerciseFilterMaps {
  return {
    envByExercise: new Map([['sprint30', new Set(['env_outdoor'])], ['sled', new Set(['env_gym', 'env_outdoor'])]]),
    equipByExercise: new Map([['sled', new Set(['eq_sled'])]]),
    userEnvs: new Set(['env_gym', 'env_outdoor']),
    userEquip: new Set(['eq_sled']),
    equipmentEnvs: new Map([['eq_sled', new Set(['env_gym'])]]),
    levelByCategoryId: new Map([['cat1', 50]]),
    hasLevelData: true,
    ...overrides,
  }
}

describe('makeExerciseFilter (per-day environments)', () => {
  it('global filter (no day env) keeps any-env match — bisheriges Verhalten', () => {
    const passes = makeExerciseFilter(maps(), null)
    expect(passes(row('sprint30'))).toBe(true) // outdoor ∈ userEnvs
    expect(passes(row('sled'))).toBe(true)
  })

  it('day env restricts exercises to that environment', () => {
    const gymDay = makeExerciseFilter(maps(), 'env_gym')
    expect(gymDay(row('sprint30'))).toBe(false) // outdoor-only am Gym-Tag
    const outdoorDay = makeExerciseFilter(maps(), 'env_outdoor')
    expect(outdoorDay(row('sprint30'))).toBe(true)
  })

  it('location-bound equipment only counts in its environment', () => {
    // Sled-Übung erlaubt gym+outdoor, aber das Sled-Equipment hängt im Gym.
    const outdoorDay = makeExerciseFilter(maps(), 'env_outdoor')
    expect(outdoorDay(row('sled'))).toBe(false)
    const gymDay = makeExerciseFilter(maps(), 'env_gym')
    expect(gymDay(row('sled'))).toBe(true)
  })

  it('equipment without location mapping is usable everywhere', () => {
    const m = maps({ equipmentEnvs: new Map() })
    expect(makeExerciseFilter(m, 'env_outdoor')(row('sled'))).toBe(true)
  })

  it('empty user equipment skips the equipment check (bisheriges Verhalten)', () => {
    const m = maps({ userEquip: new Set<string>() })
    expect(makeExerciseFilter(m, 'env_gym')(row('sled'))).toBe(true)
  })
})
