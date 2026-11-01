import { describe, it, expect } from 'vitest'
import {
  buildInjuryExclusions,
  applyInjuryExclusions,
  type InjuryConstraintInput,
} from '../injury-constraints'

const constraint = (over: Partial<InjuryConstraintInput> = {}): InjuryConstraintInput => ({
  tag_slug: 'shoulder_impingement',
  mode: 'block',
  acute: false,
  ...over,
})

describe('buildInjuryExclusions', () => {
  it('block entfernt Übungen mit dem Tag, andere bleiben', () => {
    const tagsByExercise = new Map([
      ['ex1', new Set(['shoulder_impingement'])],
      ['ex2', new Set(['knee_pain'])],
    ])
    const result = buildInjuryExclusions(
      [constraint({ tag_slug: 'shoulder_impingement', mode: 'block' })],
      tagsByExercise,
    )
    expect(result.blockedIds).toEqual(new Set(['ex1']))
    expect(result.lightOnlyIds).toEqual(new Set())
  })

  it('light_only landet in lightOnlyIds, nicht in blockedIds', () => {
    const tagsByExercise = new Map([['ex1', new Set(['knee_pain'])]])
    const result = buildInjuryExclusions(
      [constraint({ tag_slug: 'knee_pain', mode: 'light_only' })],
      tagsByExercise,
    )
    expect(result.lightOnlyIds).toEqual(new Set(['ex1']))
    expect(result.blockedIds).toEqual(new Set())
  })

  it('block gewinnt, wenn dieselbe Übung block- und light_only-Tags trägt', () => {
    const tagsByExercise = new Map([
      ['ex1', new Set(['shoulder_impingement', 'knee_pain'])],
    ])
    const result = buildInjuryExclusions(
      [
        constraint({ tag_slug: 'shoulder_impingement', mode: 'block' }),
        constraint({ tag_slug: 'knee_pain', mode: 'light_only' }),
      ],
      tagsByExercise,
    )
    expect(result.blockedIds.has('ex1')).toBe(true)
    expect(result.lightOnlyIds.has('ex1')).toBe(false)
  })

  it('Übung ohne Tags ist nie betroffen', () => {
    const tagsByExercise = new Map([['ex1', new Set<string>()]])
    const result = buildInjuryExclusions(
      [constraint({ tag_slug: 'shoulder_impingement', mode: 'block' })],
      tagsByExercise,
    )
    expect(result.blockedIds.has('ex1')).toBe(false)
    expect(result.lightOnlyIds.has('ex1')).toBe(false)
  })

  it('acute ist true, sobald ein Constraint acute ist', () => {
    const tagsByExercise = new Map<string, Set<string>>()
    const result = buildInjuryExclusions(
      [
        constraint({ tag_slug: 'a', mode: 'block', acute: false }),
        constraint({ tag_slug: 'b', mode: 'light_only', acute: true }),
      ],
      tagsByExercise,
    )
    expect(result.acute).toBe(true)
  })

  it('acute ist false, wenn kein Constraint acute ist', () => {
    const tagsByExercise = new Map<string, Set<string>>()
    const result = buildInjuryExclusions(
      [constraint({ tag_slug: 'a', mode: 'block', acute: false })],
      tagsByExercise,
    )
    expect(result.acute).toBe(false)
  })
})

describe('applyInjuryExclusions', () => {
  it('entfernt blockierte vor jeder weiteren Verarbeitung', () => {
    const pool = [{ id: 'ex1' }, { id: 'ex2' }, { id: 'ex3' }]
    const exclusions = {
      blockedIds: new Set(['ex2']),
      lightOnlyIds: new Set(['ex3']),
      acute: false,
    }
    const result = applyInjuryExclusions(pool, exclusions)
    // blockiert raus, lightOnly bleibt im Pool (Heavy-Ausschluss macht der Aufrufer)
    expect(result).toEqual([{ id: 'ex1' }, { id: 'ex3' }])
  })
})
