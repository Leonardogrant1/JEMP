import { describe, it, expect } from 'vitest'
import { composeWeek, gameProtectionFor, DEFAULT_GAME_PROTECTION, type GameProtection } from '../composition'

// Game-aware Lead-Zuweisung (Spec 31.10., Survey-Befund Dario): die Lead-
// Rotation darf keine schweren Tabu-Region-Leads ins Spielfenster legen.
// Harte Regeln: 48h (gleiche Region nie heavy an Nachbartagen, zirkulär) und
// Tabu-Region nie heavy im Spielfenster. Demote nur, wenn keine legale
// Anordnung existiert.

const trainingDay = (dow: number, minutes = 60, heavy = false): any => ({
  day_of_week: dow, session_type: 'training', minutes, dose: 'normal',
  carries_sprint_block: false, carries_conditioning_finisher: false, heavy_lower: heavy, suppress_micro_dose: false,
})
const contentOf = (blocks: any[]) => blocks.filter((b) => b.block_type !== 'warmup' && b.block_type !== 'cooldown')
const isStrength = (b: any) => b.block_type === 'lower_strength' || b.block_type === 'upper_strength'

const circularFwd = (from: number, to: number) => ((to - from) % 7 + 7) % 7
const calDist = (a: number, b: number) => { const f = circularFwd(a, b); return Math.min(f, 7 - f) }
const gameFwd = (day: number, gameDays: number[]) =>
  gameDays.length === 0 ? Infinity : Math.min(...gameDays.map((g) => circularFwd(day, g)))

/** [dow, region] aller schweren Kraftblöcke (Lead UND Begleit — beide zählen). */
const heavyStrength = (week: Map<number, any[]>) => [...week.entries()].flatMap(([dow, blocks]) =>
  blocks.filter((b) => isStrength(b) && b.emphasis === 'heavy').map((b) => [dow, b.block_type] as [number, string]))

/** Heavy-Lead-Tage einer Region (nur der Lead — genau ein heavy Kraftblock existiert sonst pro Tag). */
const heavyDaysOf = (week: Map<number, any[]>, region: string) =>
  [...week.entries()].filter(([, bl]) => contentOf(bl).some((b) => b.block_type === region && b.emphasis === 'heavy')).map(([d]) => d)

const invariantNoAdjacentSameRegion = (week: Map<number, any[]>) => {
  const hs = heavyStrength(week)
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
    if (hs[i][1] === hs[j][1] && calDist(hs[i][0], hs[j][0]) <= 1) return false
  }
  return true
}

const invariantNoTabooHeavyInWindow = (week: Map<number, any[]>, gameDays: number[], protection: GameProtection) => {
  for (const [dow, region] of heavyStrength(week)) {
    if (protection.taboo_regions.includes(region as any) && gameFwd(dow, gameDays) < protection.window_days) return false
  }
  return true
}

/** Unabhängiger Checker: existiert eine Lead-Zuweisung, die OHNE Demote beide
 *  harten Regeln erfüllt? (Nur Leads — der Begleitblock ist ohne strength 3 nie heavy.) */
const legalAssignmentExists = (dows: number[], gameDays: number[], protection: GameProtection) => {
  const n = dows.length
  for (let mask = 0; mask < (1 << n); mask++) {
    const leads = dows.map((_, i) => ((mask >> i) & 1) ? 'upper_strength' : 'lower_strength')
    let ok = true
    for (let i = 0; i < n && ok; i++) {
      if (protection.taboo_regions.includes(leads[i] as any) && gameFwd(dows[i], gameDays) < protection.window_days) ok = false
      for (let j = i + 1; j < n && ok; j++) {
        if (leads[i] === leads[j] && calDist(dows[i], dows[j]) <= 1) ok = false
      }
    }
    if (ok) return true
  }
  return false
}

describe('Dario-Konstellation (Soccer: Tage 1/3/5, Spiel Tag 6, heavy_lower Tag 1)', () => {
  const input = () => ({
    trainingDays: [trainingDay(1, 60, true), trainingDay(3), trainingDay(5)],
    pillarLevels: {}, hasSpeedSession: false, loadProfile: 'high' as const,
    gameDays: [6], notes: [] as string[],
  })

  it('kein schwerer Lower-Lead im 72h-Spielfenster — Tag 5 wird Upper', () => {
    const week = composeWeek(input())
    expect(heavyDaysOf(week, 'lower_strength')).not.toContain(5)
    expect(heavyDaysOf(week, 'upper_strength')).toContain(5)
  })

  it('beide schweren Lower-Reize bleiben erhalten (Tag 1 + Tag 3) — Platzierung vor Abschwächung', () => {
    const week = composeWeek(input())
    expect(heavyDaysOf(week, 'lower_strength').sort()).toEqual([1, 3])
  })

  it('kein Demote nötig — keine Spielfenster-Note', () => {
    const i = input()
    composeWeek(i)
    expect(i.notes.some((n) => n.includes('Erhaltungsdosis'))).toBe(false)
  })

  it('flaggt zwei schwere Lower-Tage im 48h-Abstand vor einem Spiel (Punkt 4: nur Hinweis, kein Eingriff)', () => {
    const i = input()
    composeWeek(i)
    expect(i.notes.some((n) => n.includes('48h'))).toBe(true)
  })
})

describe('Fallback: Demote nur, wenn keine legale Anordnung existiert', () => {
  it('Tage 4/5/6 mit Spiel Tag 7: keine legale Anordnung — genau dort Demote + Note', () => {
    // gameFwd: Tag 4→3, Tag 5→2, Tag 6→1. Jede Zuweisung verletzt 48h oder Fenster.
    expect(legalAssignmentExists([4, 5, 6], [7], DEFAULT_GAME_PROTECTION)).toBe(false)
    const notes: string[] = []
    const week = composeWeek({
      trainingDays: [trainingDay(4, 60, true), trainingDay(5), trainingDay(6)],
      pillarLevels: {}, hasSpeedSession: false, gameDays: [7], notes,
    })
    expect(invariantNoAdjacentSameRegion(week)).toBe(true)
    expect(invariantNoTabooHeavyInWindow(week, [7], DEFAULT_GAME_PROTECTION)).toBe(true)
    expect(notes.some((n) => n.includes('Erhaltungsdosis'))).toBe(true)
  })
})

describe('Sportart-Konfiguration', () => {
  it('Default (unbekannte Sportart): nur Lower tabu, Fenster 3 Tage', () => {
    expect(gameProtectionFor(undefined)).toEqual({ taboo_regions: ['lower_strength'], window_days: 3 })
    expect(gameProtectionFor('team_sports')).toEqual({ taboo_regions: ['lower_strength'], window_days: 3 })
  })

  it('combat_sports: Lower UND Upper tabu', () => {
    const p = gameProtectionFor('combat_sports')
    expect(p.taboo_regions).toContain('lower_strength')
    expect(p.taboo_regions).toContain('upper_strength')
  })

  it('Kampfsport: Upper-Lead im Kampf-Fenster wird demotiert (kein legaler Ausweich-Tag)', () => {
    const notes: string[] = []
    const week = composeWeek({
      trainingDays: [trainingDay(1), trainingDay(3)], pillarLevels: {}, hasSpeedSession: false,
      gameDays: [5], gameProtection: gameProtectionFor('combat_sports'), notes,
    })
    // Tag 3 (gameFwd 2) darf weder lower noch upper heavy sein; Tag 1 (gameFwd 4) bleibt heavy.
    const heavy = heavyStrength(week)
    expect(heavy.map(([d]) => d)).toEqual([1])
    expect(notes.some((n) => n.includes('Erhaltungsdosis'))).toBe(true)
  })

  it('Fenster ist pro Konfiguration überschreibbar (window_days 1: der 4/5/6-Fallback-Fall wird legal)', () => {
    // Mit Default-Fenster 3 existiert für Tage 4/5/6 vor Spiel Tag 7 keine
    // legale Anordnung (siehe Fallback-Test) — mit Fenster 1 schon: kein Demote.
    const notes: string[] = []
    const week = composeWeek({
      trainingDays: [trainingDay(4, 60, true), trainingDay(5), trainingDay(6)],
      pillarLevels: {}, hasSpeedSession: false, gameDays: [7], notes,
      gameProtection: { taboo_regions: ['lower_strength'], window_days: 1 },
    })
    expect(notes.some((n) => n.includes('Erhaltungsdosis'))).toBe(false)
    expect(heavyStrength(week)).toHaveLength(3)
  })
})

describe('Zusammenspiel mit Säulen-Lead und Doppel-heavy-Tag', () => {
  it('strength 3: der heavy Begleitblock respektiert das Spielfenster (kein heavy Lower-Begleit Tag 5)', () => {
    const week = composeWeek({
      trainingDays: [trainingDay(1, 60, true), trainingDay(3), trainingDay(5)],
      pillarLevels: { strength: 3 }, hasSpeedSession: false, loadProfile: 'medium', gameDays: [6],
    })
    expect(invariantNoTabooHeavyInWindow(week, [6], DEFAULT_GAME_PROTECTION)).toBe(true)
    expect(invariantNoAdjacentSameRegion(week)).toBe(true)
  })

  it('Kampfsport + Upper-Plyo 3: kein heavy Plyo-Block im Kampf-Fenster', () => {
    const week = composeWeek({
      trainingDays: [trainingDay(1), trainingDay(3)], pillarLevels: { upper_body_plyometrics: 3 }, hasSpeedSession: false,
      gameDays: [5], gameProtection: gameProtectionFor('combat_sports'),
    })
    for (const [dow, blocks] of week.entries()) {
      const heavyPlyo = contentOf(blocks).some((b) => b.block_type === 'plyo' && b.emphasis === 'heavy')
      if (heavyPlyo) expect(gameFwd(dow, [5])).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('Invarianten-Sweep: alle Tagesmuster × Spieltag-Positionen', () => {
  // Alle Teilmengen von 1..7 mit 1–5 Trainingstagen × {kein Spiel, 1 Spiel an
  // jedem Wochentag, 2 Spiele}. heavy_lower liegt wie im Layout auf dem
  // spielfernsten Tag (bzw. ohne Spiele auf dem ersten).
  const subsets: number[][] = []
  for (let mask = 1; mask < (1 << 7); mask++) {
    const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => (mask >> (d - 1)) & 1)
    if (days.length >= 1 && days.length <= 5) subsets.push(days)
  }
  const gameConfigs: number[][] = [[], ...[1, 2, 3, 4, 5, 6, 7].map((g) => [g]), [2, 6], [1, 4], [3, 7]]

  it('nie gleiche Region heavy an Nachbartagen; nie Tabu-Region heavy im Spielfenster; Demote nur ohne legale Anordnung', () => {
    for (const dows of subsets) {
      for (const games of gameConfigs) {
        // wie placeWeek: Spieltage sind nie Trainingstage
        const pool = dows.filter((d) => !games.includes(d))
        if (pool.length === 0) continue
        const heavyDow = games.length === 0 ? pool[0]
          : [...pool].sort((a, b) => gameFwd(b, games) - gameFwd(a, games) || a - b)[0]
        const notes: string[] = []
        const week = composeWeek({
          trainingDays: pool.map((d) => trainingDay(d, 60, d === heavyDow)),
          pillarLevels: {}, hasSpeedSession: false, gameDays: games, notes,
        })
        const label = `Tage [${pool}] Spiele [${games}]`
        expect(invariantNoAdjacentSameRegion(week), `48h verletzt: ${label}`).toBe(true)
        expect(invariantNoTabooHeavyInWindow(week, games, DEFAULT_GAME_PROTECTION), `Spielfenster verletzt: ${label}`).toBe(true)
        const demoted = notes.some((n) => n.includes('Erhaltungsdosis'))
        if (demoted) {
          expect(legalAssignmentExists(pool, games, DEFAULT_GAME_PROTECTION), `unnötiger Demote: ${label}`).toBe(false)
        }
      }
    }
  })

  it('ohne Spiele: gameDays [] verhält sich wie ein Aufruf ganz ohne gameDays', () => {
    for (const dows of subsets.filter((s) => s.length <= 4)) {
      const mk = (extra: object) => composeWeek({
        trainingDays: dows.map((d, i) => trainingDay(d, 60, i === 0)),
        pillarLevels: {}, hasSpeedSession: false, ...extra,
      })
      expect(mk({ gameDays: [] })).toEqual(mk({}))
    }
  })
})
