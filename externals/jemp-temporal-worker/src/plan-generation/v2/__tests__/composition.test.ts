import { describe, it, expect } from 'vitest'
import { focusBlockBudget, composeWeek } from '../composition'

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

const trainingDay = (dow: number, minutes = 60): any => ({
  day_of_week: dow, session_type: 'training', minutes, dose: 'normal',
  carries_sprint_block: false, carries_conditioning_finisher: false, heavy_lower: false, suppress_micro_dose: false,
})
const contentOf = (blocks: any[]) => blocks.filter((b) => b.block_type !== 'warmup' && b.block_type !== 'cooldown')
const KRAFT = new Set(['knee_dominant', 'hinge', 'push_horizontal', 'push_vertical', 'pull_horizontal', 'pull_vertical'])

/** grobe Mustergruppen aus den Pattern-Anforderungen des Blocks (Spec 2026-10-10) */
const coarse = (b: any): string[] => (b.patterns ?? []).map((p: any) =>
  p.pattern === 'knee_dominant' ? 'squat' : p.pattern === 'hinge' ? 'hinge' : p.pattern.startsWith('push') ? 'push' : 'pull')
const isStrength = (b: any) => b.block_type === 'lower_strength' || b.block_type === 'upper_strength'

describe('composeWeek Lead-Rotation (Spec 2026-10-10 §2)', () => {
  it('alterniert Lower/Upper-Lead über die Woche, je genau ein heavy Lead', () => {
    const week = composeWeek({ trainingDays: [1, 3, 5].map((d) => trainingDay(d)), pillarLevels: {}, hasSpeedSession: false })
    const leads = [1, 3, 5].map((d) => contentOf(week.get(d)!).find((b) => b.emphasis === 'heavy'))
    expect(leads.map((b) => b!.block_type)).toEqual(['lower_strength', 'upper_strength', 'lower_strength'])
    for (const d of [1, 3, 5]) {
      expect(contentOf(week.get(d)!).filter((b) => b.emphasis === 'heavy').length).toBe(1)
    }
  })

  it('jede Session enthält beide Kraftblöcke (lange Tage); Begleitblock ist normal', () => {
    const week = composeWeek({ trainingDays: [trainingDay(2), trainingDay(4)], pillarLevels: {}, hasSpeedSession: false })
    for (const blocks of week.values()) {
      const strength = contentOf(blocks).filter(isStrength)
      expect(strength).toHaveLength(2)
      expect(strength.filter((b) => b.emphasis === 'heavy')).toHaveLength(1)
      expect(strength.filter((b) => b.emphasis === 'normal')).toHaveLength(1)
    }
  })

  it('Upper-Lead fordert Push UND Pull; heavy-Seite alterniert über Upper-Leads (Pull zuerst, §1.2-Bias)', () => {
    const days = [1, 2, 3, 4].map((d) => trainingDay(d)) // leads: L,U,L,U
    const week = composeWeek({ trainingDays: days, pillarLevels: {}, hasSpeedSession: false })
    const upperLead = (dow: number) => week.get(dow)!.find((b) => b.block_type === 'upper_strength' && b.emphasis === 'heavy')!
    const p1 = upperLead(2).patterns!
    expect(p1.map((p: any) => p.pattern.split('_')[0]).sort()).toEqual(['pull', 'push'])
    expect(p1.find((p: any) => p.emphasis === 'heavy')!.pattern).toMatch(/^pull/)
    expect(upperLead(4).patterns!.find((p: any) => p.emphasis === 'heavy')!.pattern).toMatch(/^push/)
  })

  it('Lower-LEADS alternieren hinge → knee; Begleit-Lower zählt separat (Review 10.10.)', () => {
    const days = [1, 2, 3, 4].map((d) => trainingDay(d)) // lower-leads: Tag 1 + 3
    const week = composeWeek({ trainingDays: days, pillarLevels: {}, hasSpeedSession: false })
    const lowerLead = (dow: number) => week.get(dow)!.find((b) => b.block_type === 'lower_strength' && b.emphasis === 'heavy')!
    expect(lowerLead(1).patterns![0].pattern).toBe('hinge')          // hintere Kette zuerst
    expect(lowerLead(3).patterns![0].pattern).toBe('knee_dominant')
    const companion = week.get(2)!.find((b) => b.block_type === 'lower_strength' && b.emphasis === 'normal')!
    expect(companion.patterns![0].pattern).toBe('knee_dominant')     // gegenläufiger Start
  })

  it('Kompakt-Session: Begleit-Upper schrumpft auf Pull (Push fällt zuerst)', () => {
    const week = composeWeek({ trainingDays: [trainingDay(1, 40), trainingDay(3, 40)], pillarLevels: {}, hasSpeedSession: false })
    const companionUpper = [...week.values()].flat()
      .find((b) => b.block_type === 'upper_strength' && b.emphasis === 'normal')!
    expect(companionUpper.patterns).toHaveLength(1)
    expect(companionUpper.patterns![0].pattern).toMatch(/^pull/)
  })

  it('1-Tages-Woche: Lower-Lead heavy, Kraft nie weggeschnitten (Floor §3.2)', () => {
    const week = composeWeek({ trainingDays: [trainingDay(3, 30)], pillarLevels: { lower_body_plyometrics: 2 }, hasSpeedSession: false })
    const strength = contentOf(week.get(3)!).filter(isStrength)
    expect(strength.length).toBeGreaterThanOrEqual(1)
    expect(strength[0]).toMatchObject({ block_type: 'lower_strength', emphasis: 'heavy' })
  })
})

describe('composeWeek (§1.1–1.3)', () => {
  it('deckt über die Woche alle vier Kraftmuster ab (squat/hinge/push/pull)', () => {
    const week = composeWeek({ trainingDays: [1, 3, 5].map((d) => trainingDay(d)), pillarLevels: {}, hasSpeedSession: false })
    const covered = new Set<string>()
    for (const d of [1, 3, 5]) for (const b of contentOf(week.get(d)!)) for (const c of coarse(b)) covered.add(c)
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
    const covered = new Set(allBlocks.flatMap(coarse))
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

describe('composeWeek Plyo-Platzierung (§1.6.1 übersetzt, Spec 2026-10-10 §2.3)', () => {
  const pushHeavyIn = (blocks: any[]) => contentOf(blocks).some((b) =>
    b.block_type === 'upper_strength' && (b.patterns ?? []).some((p: any) => p.pattern.startsWith('push') && p.emphasis === 'heavy'))

  it('Deckel: wo Upper-Plyo liegt, ist kein Push-Pattern heavy — und mind. ein Upper-Plyo-Block existiert', () => {
    // 4 Tage: Upper-Leads Tag 2 (pull-heavy) und Tag 4 (push-heavy). Lower-Plyo
    // belegt die Lower-Lead-Tage; Upper-Plyo 3 muss damit auch auf Tag 4 (push-
    // heavy) ausweichen → Dämpfung greift dort.
    const week = composeWeek({
      trainingDays: [1, 2, 3, 4].map((d) => trainingDay(d)),
      pillarLevels: { lower_body_plyometrics: 2, upper_body_plyometrics: 3 }, hasSpeedSession: false,
    })
    const upperPlyoBlocks = [...week.values()].flatMap((bl) => contentOf(bl).filter((b) => b.block_type === 'plyo' && b.variant === 'upper'))
    expect(upperPlyoBlocks.length).toBeGreaterThanOrEqual(1) // Säule nie verloren
    for (const [, blocks] of week) {
      const hasUpperPlyo = contentOf(blocks).some((b) => b.block_type === 'plyo' && b.variant === 'upper')
      if (hasUpperPlyo) expect(pushHeavyIn(blocks)).toBe(false)
    }
  })

  it('ohne Upper-Plyo am Tag bleibt der Push-heavy Upper-Lead unangetastet', () => {
    const week = composeWeek({
      trainingDays: [1, 2, 3, 4].map((d) => trainingDay(d)),
      pillarLevels: { upper_body_plyometrics: 1 }, hasSpeedSession: false,
    })
    // Ein Block reicht für Tag ohne Push-heavy — Tag 4 (push-heavy) bleibt frei und heavy
    const day4 = week.get(4)!
    const hasPlyo = contentOf(day4).some((b) => b.block_type === 'plyo')
    if (!hasPlyo) expect(pushHeavyIn(day4)).toBe(true)
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
  it('Lower-Lead liegt auf dem heavy_lower-Tag des Placements', () => {
    const days = [trainingDay(1), trainingDay(5), trainingDay(6)]
    ;(days[1] as any).heavy_lower = true // Placement hat Freitag gewählt (Spieltags-Schutz)
    const week = composeWeek({ trainingDays: days, pillarLevels: {}, hasSpeedSession: false })
    const lowerLeadDays = [...week.entries()].filter(([, bl]) =>
      contentOf(bl).some((b) => b.block_type === 'lower_strength' && b.emphasis === 'heavy')).map(([d]) => d)
    expect(lowerLeadDays).toContain(5)
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

describe('composeWeek Füller: accessory + optional (User-Feature Arm-Block)', () => {
  it('lange Sessions füllen Rest-Slots mit accessory, dann optional', () => {
    const week = composeWeek({ trainingDays: [1, 3, 5].map((d) => trainingDay(d, 75)), pillarLevels: {}, hasSpeedSession: false })
    const all = [1, 3, 5].flatMap((d) => contentOf(week.get(d)!))
    expect(all.some((b) => b.block_type === 'accessory')).toBe(true)
    expect(all.some((b) => b.block_type === 'optional')).toBe(true)
  })
  it('kurze Sessions (30min) haben keine Füller — Primary/Komplement/Core gehen vor', () => {
    const week = composeWeek({ trainingDays: [trainingDay(1, 30)], pillarLevels: {}, hasSpeedSession: false })
    const c = contentOf(week.get(1)!)
    expect(c.some((b) => b.block_type === 'optional')).toBe(false)
    expect(c.length).toBeLessThanOrEqual(3)
  })
})

describe('Core-Varianten-Rotation (Review-Fix #1, §1.5/§1.7)', () => {
  it('rotiert die Core-Ebene über die Woche: transverse und sagittal kommen vor', () => {
    const week = composeWeek({ trainingDays: [1, 3, 5].map((d) => trainingDay(d)), pillarLevels: {}, hasSpeedSession: false })
    const coreVariants = [1, 3, 5]
      .map((d) => contentOf(week.get(d)!).find((b) => b.block_type === 'core')?.variant)
      .filter((v) => v !== undefined)
    expect(coreVariants).toContain('transverse')
    expect(coreVariants).toContain('sagittal')
  })
})
