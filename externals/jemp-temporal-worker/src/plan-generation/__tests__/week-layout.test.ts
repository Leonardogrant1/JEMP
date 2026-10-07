import { describe, it, expect } from 'vitest'
import { circularDayDistance, effectiveSpeedLevel, allocateDays } from '../week-layout'

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
