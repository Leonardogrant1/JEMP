import { describe, it, expect } from 'vitest'
import { circularDayDistance, effectiveSpeedLevel, allocateDays, placeWeek, planWorkoutBlocks, estimateMinutes, applyScalingLevers, buildWeekLayout } from '../week-layout'
import { BLOCK_MINUTES } from '../week-layout-constants'

// Module-scope helper — Task 5's tests reuse it.
const placedWeek = (days: number[], heavy: number) => ({
  carrier: 'none' as const, notes: [] as string[],
  days: days.map((d) => ({
    day_of_week: d, session_type: 'training' as const, minutes: 90, dose: 'normal' as const,
    carries_sprint_block: false, carries_conditioning_finisher: false, heavy_lower: d === heavy, suppress_micro_dose: false,
  })),
})

const schedule = (sessions: Array<{ day_of_week: number; type: 'team_training' | 'game' | 'tournament' | 'individual_training'; intensity: number }>) =>
  ({ sessions, notes: null })

describe('circularDayDistance', () => {
  it('measures forward distance across the week boundary', () => {
    expect(circularDayDistance(7, 2)).toBe(2) // Sun -> Tue
    expect(circularDayDistance(1, 7)).toBe(6) // Mon -> Sun
    expect(circularDayDistance(3, 3)).toBe(0)
  })
})

describe('effectiveSpeedLevel', () => {
  it('is the max of sprints and cod', () => {
    expect(effectiveSpeedLevel({ sprints: 1, cod: 3 }, false)).toBe(3)
  })
  it('club coverage damps sprints but not cod', () => {
    expect(effectiveSpeedLevel({ sprints: 3, cod: 2 }, true)).toBe(2)
    expect(effectiveSpeedLevel({ sprints: 3, cod: 1 }, true)).toBe(1)
  })
  it('absent pillars count as zero', () => {
    expect(effectiveSpeedLevel({}, false)).toBe(0)
  })
})

describe('allocateDays (§2.1a)', () => {
  const base = { weekly_schedule: schedule([]), sprints_covered_by_club: false, session_minutes: 60 }

  it('level 3 reserves a guaranteed speed day', () => {
    const a = allocateDays({ ...base, available_days: [1, 3, 5, 7], load_profile: 'low', pillar_levels: { sprints: 3 } })
    expect(a).toMatchObject({ workouts: 3, speed_days: 1, carrier: 'standalone' })
  })
  it('level 2 only takes a surplus day over the cap', () => {
    const surplus = allocateDays({ ...base, available_days: [1, 3, 5, 7], load_profile: 'medium', pillar_levels: { sprints: 2 } })
    expect(surplus).toMatchObject({ workouts: 3, speed_days: 1, carrier: 'standalone' })
    const noSurplus = allocateDays({ ...base, available_days: [1, 3, 5, 7], load_profile: 'low', pillar_levels: { sprints: 2 } })
    expect(noSurplus).toMatchObject({ workouts: 4, speed_days: 0, carrier: 'integrated' })
  })
  it('level 3 with only 2 days falls back to an integrated block (min 2 workouts wins)', () => {
    const a = allocateDays({ ...base, available_days: [2, 5], load_profile: 'high', pillar_levels: { sprints: 3 } })
    expect(a).toMatchObject({ workouts: 2, speed_days: 0, carrier: 'integrated' })
  })
  it('level 1 is micro-dose only; level 0 is none', () => {
    expect(allocateDays({ ...base, available_days: [1, 4], load_profile: 'low', pillar_levels: { sprints: 1 } }).carrier).toBe('micro')
    expect(allocateDays({ ...base, available_days: [1, 4], load_profile: 'low', pillar_levels: {} }).carrier).toBe('none')
  })
  it('level 3 gets a second speed day only from a second surplus day', () => {
    const a = allocateDays({ ...base, available_days: [1, 2, 4, 6], load_profile: 'high', pillar_levels: { sprints: 3 } })
    // cap high = 2 workouts; 4 days: 1 guaranteed speed + 1 surplus -> 2 speed days
    expect(a).toMatchObject({ workouts: 2, speed_days: 2 })
  })
  it('conditioning level 2 gets an own day only at low load with a day to spare', () => {
    const yes = allocateDays({ ...base, available_days: [1, 2, 3, 4, 6, 7], load_profile: 'low', pillar_levels: { conditioning: 2 } })
    expect(yes.conditioning_day).toBe(true)
    const highLoad = allocateDays({ ...base, available_days: [1, 2, 4, 6, 7], load_profile: 'high', pillar_levels: { conditioning: 2 } })
    expect(highLoad.conditioning_day).toBe(false)
  })
  it('mobility day flag from level >= 2 (consumes no available day)', () => {
    const a = allocateDays({ ...base, available_days: [1, 4], load_profile: 'low', pillar_levels: { mobility: 2 } })
    expect(a).toMatchObject({ workouts: 2, mobility_day: true })
  })
})

describe('placeWeek (§2.1b)', () => {
  it('places the worked spec example: soccer, club Tue/Thu, game Sat', () => {
    const input = {
      available_days: [1, 3, 5, 7], load_profile: 'medium' as const,
      pillar_levels: { sprints: 2 as const, strength: 2 as const }, sprints_covered_by_club: false,
      session_minutes: 60,
      weekly_schedule: schedule([
        { day_of_week: 2, type: 'team_training', intensity: 6 },
        { day_of_week: 4, type: 'team_training', intensity: 6 },
        { day_of_week: 6, type: 'game', intensity: 10 },
      ]),
    }
    const placed = placeWeek(input, allocateDays(input))
    const byType = Object.fromEntries(placed.days.map((d) => [d.session_type + ':' + d.day_of_week, d]))
    expect(byType['speed:1']).toBeDefined()                       // Monday, MD-5
    const heavy = placed.days.find((d) => d.heavy_lower)
    expect(heavy?.day_of_week).toBe(3)                            // Wednesday
    expect(placed.days.find((d) => d.day_of_week === 5)?.heavy_lower).toBe(false) // Friday light
    expect(placed.days.find((d) => d.session_type === 'speed')?.dose).toBe('maintenance') // game week
  })

  it('places speed respecting 72h across the week boundary', () => {
    // Game Tuesday (2): Sunday (7) is 2 days before -> illegal; Wednesday (3) is fine.
    const input = {
      available_days: [3, 7], load_profile: 'high' as const,
      pillar_levels: { sprints: 3 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([{ day_of_week: 2, type: 'game', intensity: 10 }]),
    }
    const alloc = { workouts: 2, speed_days: 1, conditioning_day: false, mobility_day: false, carrier: 'standalone' as const }
    const placed = placeWeek(input, alloc)
    expect(placed.days.find((d) => d.session_type === 'speed')?.day_of_week).toBe(3)
  })

  it('english week degrades carrier to integrated', () => {
    const input = {
      available_days: [1, 4], load_profile: 'high' as const,
      pillar_levels: { sprints: 3 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([
        { day_of_week: 3, type: 'game', intensity: 10 },
        { day_of_week: 6, type: 'game', intensity: 10 },
      ]),
    }
    const alloc = { workouts: 1, speed_days: 1, conditioning_day: false, mobility_day: false, carrier: 'standalone' as const }
    const placed = placeWeek(input, alloc)
    expect(placed.carrier).not.toBe('standalone')
    expect(placed.notes.join(' ')).toMatch(/kein legales Fenster|no legal window/i)
  })

  it('suppresses the micro dose within 24h after a speed day', () => {
    const input = {
      available_days: [1, 2, 4, 6], load_profile: 'medium' as const,
      pillar_levels: { sprints: 2 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([]),
    }
    const placed = placeWeek(input, allocateDays(input))
    const speedDay = placed.days.find((d) => d.session_type === 'speed')!.day_of_week
    const nextDay = placed.days.find((d) => d.session_type === 'training' && circularDayDistance(speedDay, d.day_of_week) === 1)
    if (nextDay) expect(nextDay.suppress_micro_dose).toBe(true)
  })

  it('integrated carrier puts sprint block and heavy lower on the game-farthest day', () => {
    const input = {
      available_days: [1, 3], load_profile: 'high' as const,
      pillar_levels: { sprints: 3 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([{ day_of_week: 6, type: 'game', intensity: 10 }]),
    }
    const alloc = { workouts: 2, speed_days: 0, conditioning_day: false, mobility_day: false, carrier: 'integrated' as const }
    const placed = placeWeek(input, alloc)
    const carrierDay = placed.days.find((d) => d.carries_sprint_block)
    expect(carrierDay?.day_of_week).toBe(1) // Monday is farthest from Saturday's game
    expect(carrierDay?.heavy_lower).toBe(true) // one consolidated high day (spec §2.5)
  })

  it('per-day minutes override the global duration', () => {
    const input = {
      available_days: [1, 4], load_profile: 'low' as const,
      pillar_levels: {}, sprints_covered_by_club: false, session_minutes: 60,
      day_minutes: [{ day_of_week: 4, minutes: 30 }],
      weekly_schedule: schedule([]),
    }
    const placed = placeWeek(input, allocateDays(input))
    expect(placed.days.find((d) => d.day_of_week === 4)?.minutes).toBe(30)
    expect(placed.days.find((d) => d.day_of_week === 1)?.minutes).toBe(60)
  })
})

describe('planWorkoutBlocks (§2.4)', () => {
  it('emits the full block sequence for every workout', () => {
    const plan = planWorkoutBlocks(placedWeek([1, 4], 1))
    expect(plan.get(1)!.map((b) => b.block_type)).toEqual(
      ['warmup','push','pull','lower_body','rotation','core','plyo','accessory','optional','cooldown'])
  })

  it('rotates push/pull variants across the week and covers both axes', () => {
    const plan = planWorkoutBlocks(placedWeek([1, 4], 1))
    const pushes = [1, 4].map((d) => plan.get(d)!.find((b) => b.block_type === 'push')!.variant)
    expect(new Set(pushes)).toEqual(new Set(['push_vertical', 'push_horizontal']))
    const pulls = [1, 4].map((d) => plan.get(d)!.find((b) => b.block_type === 'pull')!.variant)
    expect(new Set(pulls)).toEqual(new Set(['pull_vertical', 'pull_horizontal']))
  })

  it('gives the heavy day knee_dominant with heavy emphasis, others hinge', () => {
    const plan = planWorkoutBlocks(placedWeek([1, 4], 4))
    const heavyLower = plan.get(4)!.find((b) => b.block_type === 'lower_body')!
    expect(heavyLower).toMatchObject({ variant: 'knee_dominant', emphasis: 'heavy' })
    expect(plan.get(1)!.find((b) => b.block_type === 'lower_body')!).toMatchObject({ variant: 'hinge', emphasis: 'light' })
  })

  it('rotates plyo and core variants', () => {
    const plan = planWorkoutBlocks(placedWeek([1, 3, 5], 1))
    const plyos = [1, 3, 5].map((d) => plan.get(d)!.find((b) => b.block_type === 'plyo')!.variant)
    expect(plyos).toEqual(['maximal', 'submaximal', 'maximal'])
    const cores = [1, 3, 5].map((d) => plan.get(d)!.find((b) => b.block_type === 'core')!.variant)
    expect(cores).toEqual(['stability', 'power', 'stability'])
  })

  it('only plans blocks for training days', () => {
    const input = {
      available_days: [1, 3, 5, 7], load_profile: 'medium' as const,
      pillar_levels: { sprints: 2 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([]),
    }
    const placement = placeWeek(input, allocateDays(input))
    const plan = planWorkoutBlocks(placement)
    const trainingDays = placement.days.filter((d) => d.session_type === 'training').map((d) => d.day_of_week)
    expect([...plan.keys()].sort()).toEqual(trainingDays.sort())
  })
})

describe('scaling levers (§2.9)', () => {
  const fullBlocks = () => planWorkoutBlocks(placedWeek([1], 1)).get(1)!

  it('estimates the full workout at the sum of block minutes', () => {
    expect(estimateMinutes(fullBlocks(), 'normal', false)).toBe(
      Object.values(BLOCK_MINUTES).reduce((a, b) => a + b, 0)) // 62
  })

  it('drops blocks until the budget fits, never warmup/cooldown/heavy lower', () => {
    const placement = placedWeek([1], 1)
    placement.days[0].minutes = 45
    const { workouts } = applyScalingLevers(placement, planWorkoutBlocks(placement))
    const w = workouts[0]
    expect(w.estimated_minutes).toBeLessThanOrEqual(45)
    const kept = w.blocks.map((b) => b.block_type)
    expect(kept).toContain('warmup'); expect(kept).toContain('cooldown'); expect(kept).toContain('lower_body')
    expect(w.dropped.length).toBeGreaterThan(0)
    expect(w.dropped.every((d) => d.reason === 'time')).toBe(true)
  })

  it('maintenance dose reduces drops', () => {
    const normal = placedWeek([1], 1); normal.days[0].minutes = 45
    const game = placedWeek([1], 1); game.days[0].minutes = 45; (game.days[0] as any).dose = 'maintenance'
    const nDropped = applyScalingLevers(normal, planWorkoutBlocks(normal)).workouts[0].dropped.length
    const gDropped = applyScalingLevers(game, planWorkoutBlocks(game)).workouts[0].dropped.length
    expect(gDropped).toBeLessThan(nDropped)
  })

  it('rotates drops across the week instead of always dropping the same block', () => {
    const placement = placedWeek([1, 4], 1)
    placement.days.forEach((d) => (d.minutes = 50))
    const { workouts } = applyScalingLevers(placement, planWorkoutBlocks(placement))
    const d1 = new Set(workouts[0].dropped.map((d) => d.block_type))
    const d2 = new Set(workouts[1].dropped.map((d) => d.block_type))
    const overlap = [...d1].filter((b) => d2.has(b))
    expect(overlap.length).toBeLessThan(Math.max(d1.size, d2.size)) // not identical drop sets
  })

  it('tiny budget stops at protected floor', () => {
    const placement = placedWeek([1], 1)
    placement.days[0].minutes = 20
    const { workouts, notes } = applyScalingLevers(placement, planWorkoutBlocks(placement))
    const kept = workouts[0].blocks.map((b) => b.block_type)
    expect(kept).toEqual(expect.arrayContaining(['warmup', 'lower_body', 'cooldown']))
    expect(notes.join(' ')).toMatch(/Budget|budget/)
  })

  it('adds the integrated sprint block minutes on the carrier day', () => {
    const blocks = fullBlocks()
    expect(estimateMinutes(blocks, 'normal', true) - estimateMinutes(blocks, 'normal', false)).toBe(12)
  })
})

describe('buildWeekLayout (golden: spec §2.1b example)', () => {
  const goldenInput = () => ({
    available_days: [1, 3, 5, 7], load_profile: 'medium' as const,
    pillar_levels: { sprints: 2 as const, cod: 1 as const, strength: 2 as const, lower_body_plyometrics: 2 as const, mobility: 2 as const },
    sprints_covered_by_club: false, session_minutes: 60,
    weekly_schedule: schedule([
      { day_of_week: 2, type: 'team_training', intensity: 6 },
      { day_of_week: 4, type: 'team_training', intensity: 6 },
      { day_of_week: 6, type: 'game', intensity: 10 },
    ]),
  })

  it('lays out the soccer week deterministically', () => {
    const layout = buildWeekLayout(goldenInput())
    expect(layout.carrier).toBe('standalone')
    const types = Object.fromEntries(layout.placement.days.map((d) => [d.day_of_week, d.session_type]))
    expect(types[1]).toBe('speed')
    expect(types[3]).toBe('training'); expect(types[5]).toBe('training'); expect(types[7]).toBe('training')
    expect(layout.placement.days.find((d) => d.heavy_lower)?.day_of_week).toBe(3)
    expect(layout.placement.days.some((d) => d.session_type === 'mobility')).toBe(true)
    expect(layout.workouts).toHaveLength(3)
    // Determinism: same input, same output.
    expect(buildWeekLayout(goldenInput())).toEqual(layout)
  })
})

describe('review fixes (phase 2a final review)', () => {
  it('C1: unplaceable speed days never become extra workouts beyond the cap', () => {
    // high load (cap 2), sprints 3, games Wed+Sun: only one legal speed window.
    const input = {
      available_days: [1, 2, 4, 6], load_profile: 'high' as const,
      pillar_levels: { sprints: 3 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([
        { day_of_week: 3, type: 'game', intensity: 10 },
        { day_of_week: 7, type: 'game', intensity: 10 },
      ]),
    }
    const alloc = allocateDays(input)
    const placed = placeWeek(input, alloc)
    const trainingCount = placed.days.filter((d) => d.session_type === 'training').length
    expect(trainingCount).toBeLessThanOrEqual(alloc.workouts)
    expect(placed.notes.join(' ')).toMatch(/bleibt frei|Cap/)
  })

  it('C2: game days inside available_days are never scheduled', () => {
    const input = {
      available_days: [1, 3, 6], load_profile: 'low' as const,
      pillar_levels: {}, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([{ day_of_week: 6, type: 'game', intensity: 10 }]),
    }
    const placed = placeWeek(input, allocateDays(input))
    expect(placed.days.some((d) => d.day_of_week === 6)).toBe(false)
  })

  it('I1: silent 72h heavy fallback now emits a note', () => {
    // Game Wednesday; training Mon+Tue are both <72h before it.
    const input = {
      available_days: [1, 2], load_profile: 'high' as const,
      pillar_levels: {}, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([{ day_of_week: 3, type: 'game', intensity: 10 }]),
    }
    const placed = placeWeek(input, allocateDays(input))
    expect(placed.days.some((d) => d.heavy_lower)).toBe(true)
    expect(placed.notes.join(' ')).toMatch(/Heavy-Lower/)
  })

  it('I2: english week with no 72h-safe workout day degrades to micro, not integrated', () => {
    const input = {
      available_days: [1, 4], load_profile: 'high' as const,
      pillar_levels: { sprints: 3 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([
        { day_of_week: 3, type: 'game', intensity: 10 },
        { day_of_week: 6, type: 'game', intensity: 10 },
      ]),
    }
    const alloc = { workouts: 2, speed_days: 1, conditioning_day: false, mobility_day: false, carrier: 'standalone' as const }
    const placed = placeWeek(input, alloc)
    expect(placed.carrier).toBe('micro')
    expect(placed.days.some((d) => d.carries_sprint_block)).toBe(false)
  })

  it('I3: integrated sprint block prefers the longest day', () => {
    const input = {
      available_days: [1, 4], load_profile: 'high' as const,
      pillar_levels: { sprints: 2 as const }, sprints_covered_by_club: false, session_minutes: 60,
      day_minutes: [{ day_of_week: 1, minutes: 45 }, { day_of_week: 4, minutes: 90 }],
      weekly_schedule: schedule([]),
    }
    const alloc = { workouts: 2, speed_days: 0, conditioning_day: false, mobility_day: false, carrier: 'integrated' as const }
    const placed = placeWeek(input, alloc)
    expect(placed.days.find((d) => d.carries_sprint_block)?.day_of_week).toBe(4)
  })

  it('I4: heavy lower avoids the morning after the match when alternatives exist, notes otherwise', () => {
    const input = {
      available_days: [5, 7], load_profile: 'high' as const,
      pillar_levels: {}, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([{ day_of_week: 6, type: 'game', intensity: 10 }]),
    }
    const placed = placeWeek(input, allocateDays(input))
    // Friday is <72h pre-game, Sunday is MD+1 — compromise is unavoidable, but it must be noted.
    expect(placed.notes.join(' ')).toMatch(/Heavy-Lower/)
  })

  it('I5: allocated mobility falls back to a training day instead of vanishing', () => {
    const input = {
      available_days: [1, 2, 3, 4, 5, 6, 7], load_profile: 'low' as const,
      pillar_levels: { mobility: 2 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([]),
    }
    const placed = placeWeek(input, allocateDays(input))
    expect(placed.days.some((d) => d.session_type === 'mobility')).toBe(true)
    expect(placed.notes.join(' ')).toMatch(/Mobility/)
  })

  it('I6: drop priority respects pillar levels — emphasized plyo survives over pull', () => {
    const placement = placedWeek([1], 1)
    placement.days[0].minutes = 45
    const noLevels = applyScalingLevers(placement, planWorkoutBlocks(placement))
    expect(noLevels.workouts[0].dropped.map((d) => d.block_type)).toContain('plyo')
    const withLevels = applyScalingLevers(placement, planWorkoutBlocks(placement), { lower_body_plyometrics: 3 })
    const droppedTypes = withLevels.workouts[0].dropped.map((d) => d.block_type)
    expect(droppedTypes).not.toContain('plyo')
  })
})

describe('review fix I4: pillar levels reach the drop lever', () => {
  it('buildWeekLayout lets an emphasized plyo pillar survive drops', () => {
    const input = {
      available_days: [1], load_profile: 'low' as const,
      pillar_levels: { lower_body_plyometrics: 3 as const }, sprints_covered_by_club: false,
      session_minutes: 45, weekly_schedule: schedule([]),
    }
    const layout = buildWeekLayout(input)
    const dropped = layout.workouts[0].dropped.map((d) => d.block_type)
    expect(dropped.length).toBeGreaterThan(0)
    expect(dropped).not.toContain('plyo')
  })
})

describe('conditioning finisher (integrated carrier)', () => {
  const base = {
    available_days: [1, 4], load_profile: 'medium' as const,
    sprints_covered_by_club: false, session_minutes: 60,
    weekly_schedule: schedule([]),
  }
  it('flags one training day when conditioning >= 2 has no own day', () => {
    const input = { ...base, pillar_levels: { conditioning: 2 as const } }
    const placed = placeWeek(input, allocateDays(input))
    expect(placed.days.filter((d) => (d as any).carries_conditioning_finisher).length).toBe(1)
  })
  it('level 2 never fires at high weekly load (club covers it); level 3 pierces', () => {
    const damped = { ...base, load_profile: 'high' as const, pillar_levels: { conditioning: 2 as const } }
    const placedDamped = placeWeek(damped, allocateDays(damped))
    expect(placedDamped.days.some((d) => (d as any).carries_conditioning_finisher)).toBe(false)
  })
  it('never lands on the sprint-carrier day', () => {
    const input = { ...base, pillar_levels: { conditioning: 2 as const, sprints: 2 as const } }
    const placed = placeWeek(input, allocateDays(input))
    const finisher = placed.days.find((d) => (d as any).carries_conditioning_finisher)
    expect(finisher?.carries_sprint_block).toBe(false)
  })
  it('keeps the session inside its minute budget via extra drops', () => {
    const input = { ...base, pillar_levels: { conditioning: 2 as const } }
    const layout = buildWeekLayout(input)
    for (const w of layout.workouts) {
      const day = layout.placement.days.find((d) => d.day_of_week === w.day_of_week)!
      expect(w.estimated_minutes).toBeLessThanOrEqual(day.minutes)
    }
    const finisherDay = layout.placement.days.find((d) => (d as any).carries_conditioning_finisher)!
    const finisherWorkout = layout.workouts.find((w) => w.day_of_week === finisherDay.day_of_week)!
    const otherWorkout = layout.workouts.find((w) => w.day_of_week !== finisherDay.day_of_week)!
    // The finisher's ~10 min must be part of the estimate, so its day drops
    // strictly MORE blocks — otherwise the session silently overruns the budget.
    expect(finisherWorkout.dropped.length).toBeGreaterThan(otherWorkout.dropped.length)
  })
})

describe('review follow-up: cap low=5 and level-3 conditioning pierces damping', () => {
  it('low load allows 5 workouts', () => {
    const input = {
      available_days: [1, 2, 3, 5, 6], load_profile: 'low' as const,
      pillar_levels: {}, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([]),
    }
    expect(allocateDays(input).workouts).toBe(5)
  })
  it('high-load fighter with conditioning level 3 gets at least the finisher', () => {
    const input = {
      available_days: [1, 4], load_profile: 'high' as const,
      pillar_levels: { conditioning: 3 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([
        { day_of_week: 2, type: 'team_training', intensity: 9 },
        { day_of_week: 5, type: 'team_training', intensity: 9 },
      ]),
    }
    const placed = placeWeek(input, allocateDays(input))
    expect(placed.days.some((d) => d.carries_conditioning_finisher)).toBe(true)
  })
  it('level-3 conditioning takes an own day from surplus even at medium load', () => {
    const input = {
      available_days: [1, 2, 4, 6], load_profile: 'medium' as const,
      pillar_levels: { conditioning: 3 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([]),
    }
    expect(allocateDays(input).conditioning_day).toBe(true)
  })
  it('level-2 conditioning stays damped at high load (no finisher, no day)', () => {
    const input = {
      available_days: [1, 4], load_profile: 'high' as const,
      pillar_levels: { conditioning: 2 as const }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([]),
    }
    const alloc = allocateDays(input)
    const placed = placeWeek(input, alloc)
    expect(alloc.conditioning_day).toBe(false)
    expect(placed.days.some((d) => d.carries_conditioning_finisher)).toBe(false)
  })
})
