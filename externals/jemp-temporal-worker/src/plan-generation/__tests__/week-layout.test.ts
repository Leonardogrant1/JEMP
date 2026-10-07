import { describe, it, expect } from 'vitest'
import { circularDayDistance, effectiveSpeedLevel, allocateDays, placeWeek } from '../week-layout'

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
  it('conditioning gets an own day only at low load, level >= 2, with a day to spare', () => {
    const yes = allocateDays({ ...base, available_days: [1, 2, 4, 6, 7], load_profile: 'low', pillar_levels: { conditioning: 2 } })
    expect(yes.conditioning_day).toBe(true)
    const highLoad = allocateDays({ ...base, available_days: [1, 2, 4, 6, 7], load_profile: 'high', pillar_levels: { conditioning: 3 } })
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
