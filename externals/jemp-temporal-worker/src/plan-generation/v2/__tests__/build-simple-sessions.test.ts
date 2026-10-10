import { describe, it, expect } from 'vitest'
import { buildMobilitySession, buildConditioningSession, buildConditioningFinisherBlock, conditioningPoolSlugs } from '../build-simple-sessions'
import { ex, day } from './fixtures'

describe('buildMobilitySession', () => {
  const pool = ['hip_cars', 'shoulder_cars', 'ankle_cars', 'childs_pose', 'supine_twist']
    .map((slug) => ex({ slug, category_slug: 'mobility', measurement_type: 'duration' }))
  it('builds one mobility block with duration prescriptions', () => {
    const r = buildMobilitySession({ day: day({ session_type: 'mobility', minutes: 20 }), exercises: pool, orderIndex: 0 })!
    expect(r.session.session_type).toBe('mobility')
    const blockOut = r.session.blocks.find((b: any) => b.block_type === 'mobility')!
    expect(blockOut.exercises.length).toBeGreaterThanOrEqual(5)
    expect(blockOut.exercises.every((e: any) => e.target_duration_seconds > 0)).toBe(true)
  })
  it('returns null below 3 pool exercises', () => {
    expect(buildMobilitySession({ day: day(), exercises: pool.slice(0, 2), orderIndex: 0 })).toBeNull()
  })
})

describe('buildConditioningSession', () => {
  const pool = ['burpee', 'jumping_jacks', 'jump_rope_standard', 'bear_crawl']
    .map((slug) => ex({ slug, category_slug: 'lower_body_plyometrics', measurement_type: 'reps_or_duration', intensity_score: 4 }))
  it('prescribes the interval format on every exercise', () => {
    const r = buildConditioningSession({ day: day({ session_type: 'conditioning', minutes: 30 }), exercises: pool, orderIndex: 0 })!
    const blockOut = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(blockOut.exercises.every((e: any) => e.target_rounds > 0 && e.target_duration_seconds > 0 && e.target_rest_seconds >= 0)).toBe(true)
  })
  it('picks the circuit format when enough intense exercises exist', () => {
    const intense = pool.map((p, i) => ({ ...p, intensity_score: 6, slug: p.slug + '_i' + i }))
    const r = buildConditioningSession({ day: day(), exercises: intense, orderIndex: 0 })!
    const blockOut = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(blockOut.exercises[0].target_duration_seconds).toBe(40) // circuit_40_20
  })
  it('returns null and a note when the pool is empty', () => {
    const r = buildConditioningSession({ day: day(), exercises: [ex({ slug: 'bench_press', category_slug: 'strength' })], orderIndex: 0 })
    expect(r).toBeNull()
  })
})

describe('buildConditioningSession — Formate (Spec 2026-10-10)', () => {
  const circuitPool = ['burpee', 'jumping_jacks', 'jump_rope_standard', 'bear_crawl']
    .map((slug) => ex({ slug, category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 4 }))
  const runAnchor = ex({ slug: 'easy_jog', category_slug: 'sprints', measurement_type: 'duration', intensity_score: 2 })
  const machine = ex({ slug: 'rowing_erg', category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 5 })

  it('extensiv + runAnchor → Dauerlauf mit 35-min-Deckel (Review Focus 2/Spec §1.1)', () => {
    const r = buildConditioningSession({ day: day({ session_type: 'conditioning', minutes: 60 }), exercises: circuitPool, orderIndex: 0, format: 'extensive', runAnchor })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises).toHaveLength(1)
    expect(block.exercises[0].exercise_slug).toBe('easy_jog')
    expect(block.exercises[0].target_duration_seconds).toBe(35 * 60)
    expect(r.session.estimated_duration_minutes).toBe(43)
    expect(r.session.name).toBe('Conditioning — Basis')
    expect(r.session.description).toContain('bewusst kürzer')
  })
  it('extensiv ohne Deckel: 30-min-Tag → 22 min Lauf, keine Deckel-Erklärung', () => {
    const r = buildConditioningSession({ day: day({ session_type: 'conditioning', minutes: 30 }), exercises: circuitPool, orderIndex: 0, format: 'extensive', runAnchor })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises[0].target_duration_seconds).toBe(22 * 60)
    expect(r.session.description).not.toContain('bewusst kürzer')
  })
  it('extensiv ohne Outdoor → Maschine (3×7 min / 90 s), Pool-Präsenz = Verfügbarkeit (Review Focus 1)', () => {
    const r = buildConditioningSession({ day: day({ minutes: 45 }), exercises: [...circuitPool, machine], orderIndex: 0, format: 'extensive', runAnchor: null })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises).toHaveLength(1)
    expect(block.exercises[0].exercise_slug).toBe('rowing_erg')
    expect(block.exercises[0].target_duration_seconds).toBe(420)
    expect(block.exercises[0].target_rounds).toBe(3)
  })
  it('extensiv ohne Outdoor und Maschine → Zirkel 3×180 s, Rotation über planCount', () => {
    const r0 = buildConditioningSession({ day: day({ minutes: 45 }), exercises: circuitPool, orderIndex: 0, format: 'extensive', runAnchor: null, planCount: 0 })!
    const r1 = buildConditioningSession({ day: day({ minutes: 45 }), exercises: circuitPool, orderIndex: 0, format: 'extensive', runAnchor: null, planCount: 1 })!
    const slugs = (r: any) => r.session.blocks.find((b: any) => b.block_type === 'conditioning')!.exercises.map((e: any) => e.exercise_slug)
    expect(slugs(r0)).toHaveLength(3)
    expect(slugs(r0)[0]).not.toBe(slugs(r1)[0]) // Offset rotiert
    const first = r0.session.blocks.find((b: any) => b.block_type === 'conditioning')!.exercises[0]
    expect(first.target_duration_seconds).toBe(180)
    expect(first.target_rounds).toBe(2)
  })
  it('extensiv unfüllbar → degradiert auf intensiv mit Note', () => {
    const tiny = circuitPool.slice(0, 2).map((e) => ({ ...e, intensity_score: 7 })) // Zirkel braucht ≤5 und ≥3
    const r = buildConditioningSession({ day: day({ minutes: 30 }), exercises: [...tiny, ...circuitPool.slice(0, 1)], orderIndex: 0, format: 'extensive', runAnchor: null })!
    expect(r.notes.some((n) => n.includes('degradiert'))).toBe(true)
    expect(r.session.name).toBe('Conditioning — Intervalle')
  })
  it('default-Format bleibt intensiv (Back-Compat)', () => {
    const r = buildConditioningSession({ day: day({ minutes: 30 }), exercises: circuitPool, orderIndex: 0 })!
    expect(r.session.name).toBe('Conditioning — Intervalle')
  })
})

describe('buildConditioningSession — Rounds (Spec §1.3)', () => {
  const pool = ['burpee', 'jumping_jacks', 'bear_crawl']
    .map((slug) => ex({ slug, category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 4 }))
  const bag = ex({ slug: 'heavy_bag_work', category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 6 })
  const shadow = ex({ slug: 'shadow_boxing', category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 5 })

  it('Standard: EINE Übung à 180 s / 60 s Rundenpause; combat bevorzugt heavy_bag', () => {
    const r = buildConditioningSession({ day: day({ minutes: 30 }), exercises: [...pool, bag, shadow], orderIndex: 0, format: 'rounds', sportGroup: 'combat_sports' })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises[0].exercise_slug).toBe('heavy_bag_work')
    expect(block.exercises[0].target_duration_seconds).toBe(180)
    expect(block.exercises[0].target_rest_seconds).toBe(60)
    expect(r.session.name).toBe('Conditioning — Rounds')
  })
  it('Rundenzahl folgt day.minutes: 20-min-Tag → 3 Runden, 45-min-Tag → 5 (Review Focus 2)', () => {
    const rounds = (minutes: number) => {
      const r = buildConditioningSession({ day: day({ minutes }), exercises: [bag, ...pool], orderIndex: 0, format: 'rounds' })!
      const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
      return block.exercises.reduce((s: number, e: any) => s + e.target_rounds, 0)
    }
    expect(rounds(20)).toBe(3)
    expect(rounds(45)).toBe(5)
  })
  it('n ≥ 4 mit 2 Kandidaten → zwei alternierende Einträge mit geteilter Rundenzahl', () => {
    const r = buildConditioningSession({ day: day({ minutes: 45 }), exercises: [bag, shadow, ...pool], orderIndex: 0, format: 'rounds', sportGroup: 'combat_sports' })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises).toHaveLength(2)
    expect(block.exercises.map((e: any) => e.exercise_slug)).toEqual(['heavy_bag_work', 'shadow_boxing'])
    expect(block.exercises.reduce((s: number, e: any) => s + e.target_rounds, 0)).toBe(5)
  })
  it('Fallback-Dreiteilung ohne rundentaugliche Übung: 3×60 s, Pause an letzter Station', () => {
    const r = buildConditioningSession({ day: day({ minutes: 30 }), exercises: pool, orderIndex: 0, format: 'rounds' })!
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises).toHaveLength(3)
    expect(block.exercises.map((e: any) => e.target_rest_seconds)).toEqual([0, 0, 60])
    expect(block.exercises.every((e: any) => e.target_duration_seconds === 60)).toBe(true)
  })
})

describe('conditioningPoolSlugs — kein Maximal-Plyo im Intervall (QA 10.10.)', () => {
  const base = { category_slug: 'lower_body_plyometrics', measurement_type: 'reps_or_duration' as const }
  const pool = [
    ex({ ...base, slug: 'bulgarian_split_squat_high_knee_jump', plyo_type: 'maximal', intensity_score: 8 }),
    ex({ ...base, slug: 'single_leg_reactive_box_jump', plyo_type: 'submaximal', intensity_score: 9 }),
    ex({ ...base, slug: 'pogos', plyo_type: 'submaximal', intensity_score: 5 }),
    ex({ slug: 'burpee', category_slug: 'conditioning', measurement_type: 'reps_or_duration', intensity_score: 6 }),
    ex({ slug: 'burpee_broad_jump', category_slug: 'conditioning', measurement_type: 'reps_or_duration', intensity_score: 8 }),
  ]
  it('schließt plyo_type maximal aus', () => {
    expect(conditioningPoolSlugs(pool)).not.toContain('bulgarian_split_squat_high_knee_jump')
  })
  it('schließt Intensität > 7 aus (auch submaximal/conditioning)', () => {
    const slugs = conditioningPoolSlugs(pool)
    expect(slugs).not.toContain('single_leg_reactive_box_jump')
    expect(slugs).not.toContain('burpee_broad_jump')
  })
  it('behält zyklische submaximale Plyos und Conditioning-Übungen', () => {
    expect(conditioningPoolSlugs(pool)).toEqual(expect.arrayContaining(['pogos', 'burpee']))
  })
  it('buildConditioningSession nutzt denselben Filter', () => {
    const filler = ['jumping_jacks', 'bear_crawl', 'mountain_climber']
      .map((slug) => ex({ slug, category_slug: 'conditioning', measurement_type: 'duration', intensity_score: 4 }))
    const r = buildConditioningSession({ day: day({ session_type: 'conditioning', minutes: 30 }), exercises: [...pool, ...filler], orderIndex: 0 })!
    const blockOut = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    const chosen = blockOut.exercises.map((e: any) => e.exercise_slug)
    expect(chosen).not.toContain('bulgarian_split_squat_high_knee_jump')
    expect(chosen).not.toContain('single_leg_reactive_box_jump')
  })
})

describe('buildConditioningFinisherBlock — Format + Rotation (Spec §3.4)', () => {
  const pool = ['burpee', 'jump_rope_standard', 'bear_crawl', 'mountain_climber', 'jumping_jacks']
  it('Offset rotiert den Startpunkt — Monotonie-Regression', () => {
    const p0 = buildConditioningFinisherBlock(pool, 7, 'intensive', 0)!
    const p2 = buildConditioningFinisherBlock(pool, 7, 'intensive', 2)!
    expect(p0.exercises[0].exercise_slug).not.toBe(p2.exercises[0].exercise_slug)
    expect(p2.exercises).toHaveLength(3)
  })
  it('Pool-Länge 2 + Offset: keine Duplikate (Review Focus 5)', () => {
    const b = buildConditioningFinisherBlock(['burpee', 'bear_crawl'], 7, 'intensive', 1)!
    const slugs = b.exercises.map((e: any) => e.exercise_slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('rounds-Finisher: eine Übung, 180/60, 2 Runden, bevorzugt heavy_bag_work', () => {
    const b = buildConditioningFinisherBlock([...pool, 'heavy_bag_work', 'shadow_boxing'], 7, 'rounds', 0)!
    expect(b.exercises).toHaveLength(1)
    expect(b.exercises[0].exercise_slug).toBe('heavy_bag_work')
    expect(b.exercises[0].target_duration_seconds).toBe(180)
    expect(b.exercises[0].target_rounds).toBe(2)
  })
  it('rounds ohne rundentaugliche Übung → intensive-Verhalten', () => {
    const b = buildConditioningFinisherBlock(['burpee', 'bear_crawl', 'mountain_climber'], 7, 'rounds', 0)!
    expect(b.exercises.length).toBeGreaterThanOrEqual(2)
    expect(b.exercises[0].target_duration_seconds).toBe(30)
  })
})

describe('buildConditioningFinisherBlock', () => {
  it('builds a compact interval block before the cooldown', () => {
    const block = buildConditioningFinisherBlock(['burpee', 'jump_rope_standard', 'bear_crawl'], 7)!
    expect(block.block_type).toBe('conditioning')
    expect(block.order_index).toBe(7)
    expect(block.exercises.length).toBeLessThanOrEqual(3)
    expect(block.exercises.every((e: any) => e.target_rounds > 0 && e.target_duration_seconds === 30)).toBe(true)
  })
  it('returns null below 2 slugs', () => {
    expect(buildConditioningFinisherBlock(['burpee'], 7)).toBeNull()
  })
})
