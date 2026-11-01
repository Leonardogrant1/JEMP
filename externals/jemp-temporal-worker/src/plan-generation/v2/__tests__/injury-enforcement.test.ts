// Task 5: Pool-Enforcement. prepareGenerationV2 ist IO-lastig (Supabase-Calls) —
// statt die ganze Pipeline zu mocken, testen wir die beiden tragenden reinen
// Bausteine direkt: filterRowsByInjury (der einmalige Chokepoint-Filter, aus
// dem Basis-/Env-/Speed-Pool abgeleitet werden) und patternSlugWindow (Review
// Focus 2: ein durch Constraints komplett leeres Fenster darf nie crashen).
import { describe, it, expect } from 'vitest'
import { buildInjuryExclusions, filterRowsByInjury } from '../injury-constraints'
import { patternSlugWindow } from '../pool'

describe('filterRowsByInjury (Task 5 Chokepoint)', () => {
  it('blockierte Übung fehlt in Basis-Pool, Env-Pool und Speed-Pool', () => {
    const rows = [
      { id: 'ex1', slug: 'blocked_lift' },
      { id: 'ex2', slug: 'safe_lift' },
      { id: 'ex3', slug: 'gym_only_lift' },
    ]
    const tagsByExercise = new Map([['ex1', new Set(['shoulder_impingement'])]])
    const exclusions = buildInjuryExclusions(
      [{ tag_slug: 'shoulder_impingement', mode: 'block', acute: false }],
      tagsByExercise,
    )

    // In prepare-v2.ts werden Basis-Pool (exercises), Env-Pool (byEnvCache)
    // und Speed-Pool (speedExercises) ALLE aus derselben, einmal gefilterten
    // Row-Liste abgeleitet — hier simuliert über drei unabhängige
    // "Pool"-Projektionen derselben allowedRows.
    const allowedRows = filterRowsByInjury(rows, exclusions)
    const basisPool = allowedRows.map((r) => r.slug)
    const envPool = allowedRows.filter((r) => r.slug !== 'gym_only_lift').map((r) => r.slug)
    const speedPool = allowedRows.map((r) => r.slug)

    expect(basisPool).not.toContain('blocked_lift')
    expect(envPool).not.toContain('blocked_lift')
    expect(speedPool).not.toContain('blocked_lift')
    expect(basisPool).toEqual(expect.arrayContaining(['safe_lift', 'gym_only_lift']))
  })
})

describe('patternSlugWindow (Review Focus 2): leeres Fenster statt Throw', () => {
  it('Fenster komplett leer durch Constraints → patternSlugWindow liefert leeres Fenster, kein Throw', () => {
    // Knie+Knöchel-Constraints können ein Pattern-Fenster vollständig leeren
    // (block entfernt alle Pool-Übungen, bevor patternSlugWindow überhaupt
    // aufgerufen wird) — der Aufrufer in prepare-v2.ts fängt das bereits über
    // "Anforderung entfällt" ab. Hier die Garantie auf der reinen Funktion:
    // ein leerer Pool darf nie werfen, in keinem emphasis-Zweig.
    expect(() => patternSlugWindow([], 'heavy', 0)).not.toThrow()
    expect(patternSlugWindow([], 'heavy', 0)).toEqual([])
    expect(() => patternSlugWindow([], 'normal', 0)).not.toThrow()
    expect(patternSlugWindow([], 'normal', 0)).toEqual([])
  })
})
