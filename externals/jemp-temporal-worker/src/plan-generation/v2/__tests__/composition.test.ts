import { describe, it, expect } from 'vitest'
import { focusBlockBudget, composeWeek } from '../composition'

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

const trainingDay = (dow: number, minutes = 60): any => ({
  day_of_week: dow, session_type: 'training', minutes, dose: 'normal',
  carries_sprint_block: false, carries_conditioning_finisher: false, heavy_lower: false, suppress_micro_dose: false,
})
const contentOf = (blocks: any[]) => blocks.filter((b) => b.block_type !== 'warmup' && b.block_type !== 'cooldown')
const KRAFT = new Set(['knee_dominant', 'hinge', 'push_horizontal', 'push_vertical', 'pull_horizontal', 'pull_vertical'])

/** grobe Mustergruppe aus Block+Variant */
const coarse = (b: any): string | null => {
  if (b.block_type === 'lower_body') return b.variant === 'hinge' ? 'hinge' : 'squat'
  if (b.block_type === 'push') return 'push'
  if (b.block_type === 'pull') return 'pull'
  return null
}

describe('composeWeek (§1.1–1.3)', () => {
  it('rotiert Primary lower/push/pull über die Woche, je genau einer, heavy', () => {
    const week = composeWeek({ trainingDays: [1, 3, 5].map((d) => trainingDay(d)), pillarLevels: {}, hasSpeedSession: false })
    const primaries = [1, 3, 5].map((d) => contentOf(week.get(d)!).find((b) => b.emphasis === 'heavy'))
    expect(primaries.map((b) => b!.block_type)).toEqual(['lower_body', 'push', 'pull'])
    for (const d of [1, 3, 5]) {
      expect(contentOf(week.get(d)!).filter((b) => b.emphasis === 'heavy').length).toBe(1)
    }
  })

  it('deckt über die Woche alle vier Kraftmuster ab (squat/hinge/push/pull)', () => {
    const week = composeWeek({ trainingDays: [1, 3, 5].map((d) => trainingDay(d)), pillarLevels: {}, hasSpeedSession: false })
    const covered = new Set<string>()
    for (const d of [1, 3, 5]) for (const b of contentOf(week.get(d)!)) { const c = coarse(b); if (c) covered.add(c) }
    expect(covered).toEqual(new Set(['squat', 'hinge', 'push', 'pull']))
  })

  it('begrenzt jede Session auf contentBlockCount (30min→3, 60min→5)', () => {
    const week = composeWeek({
      trainingDays: [trainingDay(1, 30), trainingDay(3, 60), trainingDay(5, 60)],
      pillarLevels: { lower_body_plyometrics: 3, upper_body_plyometrics: 3, conditioning: 3 }, hasSpeedSession: false,
    })
    expect(contentOf(week.get(1)!).length).toBeLessThanOrEqual(3)
    expect(contentOf(week.get(3)!).length).toBeLessThanOrEqual(5)
    // Primary überlebt die Begrenzung immer
    expect(contentOf(week.get(1)!).some((b) => b.emphasis === 'heavy')).toBe(true)
  })

  it('Review Focus 4: kein Plyo-Fokus → kein Plyo-Block, Kraft trotzdem komplett', () => {
    const week = composeWeek({ trainingDays: [1, 3, 5].map((d) => trainingDay(d)), pillarLevels: { conditioning: 1 }, hasSpeedSession: false })
    const allBlocks = [1, 3, 5].flatMap((d) => contentOf(week.get(d)!))
    expect(allBlocks.some((b) => b.block_type === 'plyo')).toBe(false)
    const covered = new Set(allBlocks.map(coarse).filter(Boolean))
    expect(covered).toEqual(new Set(['squat', 'hinge', 'push', 'pull']))
  })

  it('Review Focus 2: alle Content-Säulen Level 3, 2 Tage → keine Session über contentBlockCount', () => {
    const week = composeWeek({
      trainingDays: [trainingDay(1, 60), trainingDay(4, 60)],
      pillarLevels: { lower_body_plyometrics: 3, upper_body_plyometrics: 3, conditioning: 3 }, hasSpeedSession: false,
    })
    for (const d of [1, 4]) expect(contentOf(week.get(d)!).length).toBeLessThanOrEqual(5)
  })

  it('Core taucht 2–3× pro Woche auf', () => {
    const week = composeWeek({ trainingDays: [1, 3, 5].map((d) => trainingDay(d)), pillarLevels: {}, hasSpeedSession: false })
    const coreDays = [1, 3, 5].filter((d) => contentOf(week.get(d)!).some((b) => b.block_type === 'core'))
    expect(coreDays.length).toBeGreaterThanOrEqual(2)
    expect(coreDays.length).toBeLessThanOrEqual(3)
  })
})

describe('composeWeek Plyo-Platzierung (§1.6.1, Review Focus 1)', () => {
  const dayOfPrimary = (blocks: any[], bt: string) => contentOf(blocks).find((b) => b.block_type === bt && b.emphasis !== undefined)

  it('4 Tage, upper-Plyo 2: liegt auf Nicht-Push-Tagen, Push-Primary bleibt heavy', () => {
    const week = composeWeek({
      trainingDays: [1, 2, 4, 6].map((d) => trainingDay(d)),
      pillarLevels: { upper_body_plyometrics: 2 }, hasSpeedSession: false,
    })
    for (const [, blocks] of week) {
      const hasUpperPlyo = contentOf(blocks).some((b) => b.block_type === 'plyo' && b.variant === 'upper')
      const pushPrimary = contentOf(blocks).find((b) => b.block_type === 'push' && b.emphasis === 'heavy')
      // Wo Upper-Plyo liegt, ist kein heavy Push-Primary (Platzierung weicht aus)
      if (hasUpperPlyo && pushPrimary) expect(pushPrimary.emphasis).not.toBe('heavy')
    }
    // Push-Primaries bleiben grundsätzlich heavy, wenn kein Upper-Plyo am Tag
    const heavyPush = [...week.values()].some((bl) => contentOf(bl).some((b) => b.block_type === 'push' && b.emphasis === 'heavy'))
    expect(heavyPush).toBe(true)
  })

  it('2 Tage, upper-Plyo 3: Kollision unvermeidbar → Deckel (Push-Primary normal) + Säule nicht verloren', () => {
    const week = composeWeek({
      trainingDays: [trainingDay(1), trainingDay(4)],
      pillarLevels: { upper_body_plyometrics: 3 }, hasSpeedSession: false,
    })
    const upperPlyoBlocks = [...week.values()].flatMap((bl) => contentOf(bl).filter((b) => b.block_type === 'plyo' && b.variant === 'upper'))
    expect(upperPlyoBlocks.length).toBeGreaterThanOrEqual(1) // Hauptsäule nicht verloren
    // Der Tag mit Push-Primary UND Upper-Plyo hat den Primary auf 'normal' gedämpft
    for (const [, blocks] of week) {
      const c = contentOf(blocks)
      const hasUpperPlyo = c.some((b) => b.block_type === 'plyo' && b.variant === 'upper')
      const push = c.find((b) => b.block_type === 'push')
      if (hasUpperPlyo && push) expect(push.emphasis).toBe('normal')
    }
  })
})

describe('focusBlockBudget (§1.4)', () => {
  it('erfüllt alle Wünsche, wenn das Budget reicht', () => {
    const b = focusBlockBudget({ lower_body_plyometrics: 3, upper_body_plyometrics: 2 }, 6, false)
    expect(b).toEqual({ lower_body_plyometrics: 3, upper_body_plyometrics: 2 })
  })

  it('min 1 pro gesetzter Säule', () => {
    const b = focusBlockBudget({ lower_body_plyometrics: 1, upper_body_plyometrics: 1 }, 2, false)
    expect(b).toEqual({ lower_body_plyometrics: 1, upper_body_plyometrics: 1 })
  })

  it('Clamp: knappes Budget kürzt niedrigste zuerst, Schwerpunkt überlebt', () => {
    // Wünsche 3+2 = 5, Budget 3: min-1 je (2 verbraucht), Rest 1 → lower(+1→2), upper bleibt 1.
    const b = focusBlockBudget({ lower_body_plyometrics: 3, upper_body_plyometrics: 2 }, 3, false)
    expect(sum(b)).toBe(3)
    expect(b.lower_body_plyometrics ?? 0).toBeGreaterThan(b.upper_body_plyometrics ?? 0)
  })

  it('sehr knappes Budget: nur die höchsten Level bekommen ihren Block', () => {
    const b = focusBlockBudget({ lower_body_plyometrics: 3, upper_body_plyometrics: 1 }, 1, false)
    expect(sum(b)).toBeLessThanOrEqual(1)
    expect(b.lower_body_plyometrics ?? 0).toBeGreaterThanOrEqual(b.upper_body_plyometrics ?? 0)
  })

  it('ignoriert Nicht-Content-Säulen (sprints/cod/mobility/conditioning)', () => {
    // conditioning läuft über carries_conditioning_finisher, nicht über composeWeek.
    const b = focusBlockBudget({ sprints: 3, cod: 2, mobility: 2, conditioning: 2, lower_body_plyometrics: 1 }, 6, false)
    expect(b).toEqual({ lower_body_plyometrics: 1 })
  })

  it('ZNS-Schutz: Plyo −1 bei Speed-Session, aber min 1 wenn gesetzt', () => {
    const withSpeed = focusBlockBudget({ lower_body_plyometrics: 3 }, 6, true)
    expect(withSpeed.lower_body_plyometrics).toBe(2)
    const level1 = focusBlockBudget({ upper_body_plyometrics: 1 }, 6, true)
    expect(level1.upper_body_plyometrics).toBe(1)
  })
})

describe('composeWeek Alignment-Fixes (Task 12 E2E-Befunde)', () => {
  it('Lower-Primary liegt auf dem heavy_lower-Tag des Placements', () => {
    const days = [trainingDay(1), trainingDay(5), trainingDay(6)]
    ;(days[2] as any).heavy_lower = true // Placement hat Samstag gewählt (Spieltags-Schutz)
    const week = composeWeek({ trainingDays: days, pillarLevels: {}, hasSpeedSession: false })
    const heavyLowerDay = [...week.entries()].find(([, bl]) =>
      contentOf(bl).some((b) => b.block_type === 'lower_body' && b.emphasis === 'heavy'))?.[0]
    expect(heavyLowerDay).toBe(6)
  })

  it('lower- und upper-Plyo kollidieren nie am selben Tag — upper geht nicht verloren', () => {
    const week = composeWeek({
      trainingDays: [1, 3, 5].map((d) => trainingDay(d, 75)),
      pillarLevels: { lower_body_plyometrics: 1, upper_body_plyometrics: 1 }, hasSpeedSession: true,
    })
    const plyoBlocks = [...week.values()].flatMap((bl) => contentOf(bl).filter((b) => b.block_type === 'plyo'))
    const variants = plyoBlocks.map((b) => b.variant).sort()
    expect(variants).toEqual(['lower', 'upper'])
    for (const [, bl] of week) {
      expect(contentOf(bl).filter((b) => b.block_type === 'plyo').length).toBeLessThanOrEqual(1)
    }
  })
})
