# Session Structure Redesign — Phase 2a: Week-Layout Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic week-layout engine (spec §2.1–§2.5, §2.9) as a pure, fully unit-tested TypeScript module in the worker — day allocation, fatigue-rule placement, pattern-block planning with variant rotation, and the dose/breadth scaling levers — without wiring it into the generation pipeline yet.

**Architecture:** New pure module `src/plan-generation/week-layout.ts` (+ constants file) in `externals/jemp-temporal-worker`, no DB/LLM/IO — inputs in, `WeekLayout` out. Phase 2b wires it into `prepareGeneration` behind the `set_by_wizard` activation gate; until then it is tested library code and the shipped generator is untouched (behavior-neutral, like Phase 1). A vitest harness is added to the worker (it currently has **no** test infrastructure).

**Tech Stack:** TypeScript (worker package, pnpm), vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-session-structure-redesign-design.md` (§2.1a/b, §2.2, §2.3, §2.4, §2.5, §2.9; §3.3 stacking rules inform placement)

**Phase 2 split (ruling recorded here):** Phase 2 of the spec is delivered as two plans. **2a (this plan):** the deterministic engine. **2b (follow-up plan, written after 2a lands):** activation gate reading `user_pillar_levels.set_by_wizard`, Phase A/B/C adaptation to pattern blocks (pools via `strength_pattern` metadata with `BODY_REGION_TO_PATTERN` fallback), speed/mobility/conditioning session content builders, max-velocity gating against measured assessments, `dropped_blocks` persistence (additive migration) through the generic `savePlan`, and the legacy-path coexistence. Findings already made for 2b: `savePlan` resolves block-type/session-type slugs dynamically (needs almost no change); the edge function `generate-trainings-plan` is only a job enqueuer — its `prompts.ts`/`schemas.ts` copies are imported by nothing and are presumed dead (2b verifies and removes or ignores).

## Global Constraints

- **Do not modify any existing file in `src/plan-generation/` or `src/activities/`** except as explicitly listed (this plan only *adds* files plus the vitest devDependency/script in `package.json`). The shipped generator must behave identically after this plan.
- Worker package manager is **pnpm** (see `pnpm dlx` in its scripts). Run installs/tests from `externals/jemp-temporal-worker/`.
- The module must be **pure**: no supabase/openai imports, no `Date.now()`, no randomness. Determinism is the point (spec §2.1).
- `day_of_week` is 1–7 (Mon=1 … Sun=7) everywhere, matching `WeeklyScheduleSession`. All day distances are **circular** (Sun→Mon = 1 day).
- Session-type strings must match the Phase-1 enum exactly: `training | speed | mobility | conditioning` (`training` = workout). Block-type strings must match the Phase-1 `block_types` slugs: `warmup, push, pull, lower_body, rotation, core, plyo, accessory, cooldown` (sprint/cod blocks appear in 2b's content builders).
- Commit after every task, `feat(worker): ...` style, Claude co-author trailer.
- Tests live in `externals/jemp-temporal-worker/src/plan-generation/__tests__/week-layout.test.ts` and use **relative** imports (the worker's `src/...` path alias is esbuild/ts-node config that vitest does not know).

## Review Focus

1. **Circular week math at the Sunday→Monday boundary** — a speed session on Sunday with the game on Tuesday is <72h away, but naive `gameDay - day` arithmetic says +2 or −5. Expected: all distance checks use circular distance. Pinned by Task 3 test `places speed respecting 72h across the week boundary`.
2. **Two-games week leaves no legal speed window** — expected: carrier degrades to `integrated`, and if no workout day is ≥48h-safe either, to `micro`, never an exception or a silently illegal placement. Pinned by Task 3 test `english week degrades carrier to integrated`.
3. **Club-covered sprints with COD 3** — expected: `speed_level` stays 3 via COD and a speed day is still allocated (COD is not club-covered); only the sprint *content share* shrinks (2b). Pinned by Task 2 test `club coverage damps sprints but not cod`.
4. **Drop loop termination when the budget is tiny** — a 20-minute budget is smaller than warmup+cooldown+one block; expected: the loop stops at the protected floor (warmup, cooldown, heavy-lower/sprint-carrier block) and reports the overrun in `notes` instead of looping forever or dropping protected blocks. Pinned by Task 5 test `tiny budget stops at protected floor`.
5. **Dose–breadth interaction order** — maintenance dose must be applied *before* duration estimation so a game week needs fewer drops; expected: same day/budget yields fewer dropped blocks in a game week than a normal week. Pinned by Task 5 test `maintenance dose reduces drops`.

---

### Task 1: Vitest harness for the worker

**Files:**
- Modify: `externals/jemp-temporal-worker/package.json` (devDependency + test script)
- Create: `externals/jemp-temporal-worker/vitest.config.ts`
- Create: `externals/jemp-temporal-worker/src/plan-generation/__tests__/week-layout.test.ts` (smoke test only; grows in later tasks)

**Interfaces:**
- Produces: `pnpm test` runs vitest in the worker. All later tasks' test commands are `pnpm test` from `externals/jemp-temporal-worker/`.

- [ ] **Step 1: Write the failing smoke test**

`src/plan-generation/__tests__/week-layout.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { circularDayDistance } from '../week-layout'

describe('circularDayDistance', () => {
  it('measures forward distance across the week boundary', () => {
    expect(circularDayDistance(7, 2)).toBe(2) // Sun -> Tue
    expect(circularDayDistance(1, 7)).toBe(6) // Mon -> Sun
    expect(circularDayDistance(3, 3)).toBe(0)
  })
})
```

- [ ] **Step 2: Install vitest and wire the script**

Run in `externals/jemp-temporal-worker/`:
```bash
pnpm add -D vitest
```
Then in `package.json`, replace `"test": "echo \"Error: no test specified\" && exit 1"` with `"test": "vitest run"`.

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['src/**/__tests__/**/*.test.ts'] } })
```

- [ ] **Step 3: Run test to verify it fails correctly**

Run: `pnpm test`
Expected: FAIL — `Cannot find module '../week-layout'` (harness works, module missing).

- [ ] **Step 4: Minimal implementation**

Create `src/plan-generation/week-layout.ts`:
```typescript
// Deterministic week-layout engine (spec §2.1, §2.9). Pure: no IO, no Date.
// Wired into the pipeline in Phase 2b behind the set_by_wizard gate.

/** Forward distance in days from `from` to `to` on the circular week (1=Mon..7=Sun). */
export function circularDayDistance(from: number, to: number): number {
  return ((to - from) % 7 + 7) % 7
}
```

- [ ] **Step 5: Run test to verify it passes, then commit**

Run: `pnpm test` — Expected: PASS 1 file, 1 test.
```bash
git add externals/jemp-temporal-worker/package.json externals/jemp-temporal-worker/pnpm-lock.yaml externals/jemp-temporal-worker/vitest.config.ts externals/jemp-temporal-worker/src/plan-generation/__tests__/week-layout.test.ts externals/jemp-temporal-worker/src/plan-generation/week-layout.ts
git commit -m "feat(worker): add vitest harness and week-layout module scaffold"
```

---

### Task 2: Types, constants, speed level, day allocation (§2.1a)

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/week-layout-constants.ts`
- Modify: `externals/jemp-temporal-worker/src/plan-generation/week-layout.ts`
- Test: `.../week-layout.test.ts`

**Interfaces:**
- Consumes: `WeeklySchedule` from `../types` (existing).
- Produces (2b and Tasks 3–6 rely on these exact names):
  - `type NewSessionType = 'training' | 'speed' | 'mobility' | 'conditioning'`
  - `type PillarSlug = 'strength' | 'lower_body_plyometrics' | 'upper_body_plyometrics' | 'sprints' | 'cod' | 'conditioning' | 'mobility'`
  - `type PillarLevels = Partial<Record<PillarSlug, 1 | 2 | 3>>` (absent = system zero / hidden pillar)
  - `type WeekLayoutInput = { available_days: number[]; weekly_schedule: WeeklySchedule; load_profile: 'low'|'medium'|'high'; pillar_levels: PillarLevels; sprints_covered_by_club: boolean; session_minutes: number; day_minutes?: Array<{ day_of_week: number; minutes: number }> }`
  - `type SpeedCarrier = 'standalone' | 'integrated' | 'micro' | 'none'`
  - `type DayAllocation = { workouts: number; speed_days: number; conditioning_day: boolean; mobility_day: boolean; carrier: SpeedCarrier }`
  - `effectiveSpeedLevel(pillars: PillarLevels, sprintsCoveredByClub: boolean): 0|1|2|3`
  - `allocateDays(input: WeekLayoutInput): DayAllocation`
  - Constants: `WORKOUT_DAY_CAP = { low: 4, medium: 3, high: 2 }`, `MIN_WORKOUT_DAYS = 2`, `FATIGUE_COST = { mobility: 0, conditioning: 2, training: 3, speed: 4 }`

- [ ] **Step 1: Write the failing tests**

Append to the test file:
```typescript
import { effectiveSpeedLevel, allocateDays } from '../week-layout'

const schedule = (sessions: Array<{ day_of_week: number; type: 'team_training'|'game'|'tournament'|'individual_training'; intensity: number }>) =>
  ({ sessions, notes: null })

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
```

- [ ] **Step 2: Run tests to verify they fail** — `pnpm test`. Expected: FAIL on missing exports.

- [ ] **Step 3: Implement**

`week-layout-constants.ts`:
```typescript
import type { NewSessionType } from './week-layout'

/** Mirrors the app's lib/load-profile caps (spec §2.1a). */
export const WORKOUT_DAY_CAP = { low: 4, medium: 3, high: 2 } as const
export const MIN_WORKOUT_DAYS = 2

/** Fatigue cost per session type (spec §2.1b) — placement currency, not minutes. */
export const FATIGUE_COST: Record<NewSessionType, number> = {
  mobility: 0, conditioning: 2, training: 3, speed: 4,
}
```

Append to `week-layout.ts`:
```typescript
import type { WeeklySchedule } from './types'
import { WORKOUT_DAY_CAP, MIN_WORKOUT_DAYS } from './week-layout-constants'

export type NewSessionType = 'training' | 'speed' | 'mobility' | 'conditioning'
export type PillarSlug =
  | 'strength' | 'lower_body_plyometrics' | 'upper_body_plyometrics'
  | 'sprints' | 'cod' | 'conditioning' | 'mobility'
export type PillarLevels = Partial<Record<PillarSlug, 1 | 2 | 3>>

export type WeekLayoutInput = {
  available_days: number[]
  weekly_schedule: WeeklySchedule
  load_profile: 'low' | 'medium' | 'high'
  pillar_levels: PillarLevels
  sprints_covered_by_club: boolean
  /** Global preferred session duration (minutes); per-day overrides win. */
  session_minutes: number
  day_minutes?: Array<{ day_of_week: number; minutes: number }>
}

export type SpeedCarrier = 'standalone' | 'integrated' | 'micro' | 'none'
export type DayAllocation = {
  workouts: number
  speed_days: number
  conditioning_day: boolean
  mobility_day: boolean
  carrier: SpeedCarrier
}

/** max(sprint level, cod level); club sprint training damps sprints to 1, never cod (spec §2.1a). */
export function effectiveSpeedLevel(pillars: PillarLevels, sprintsCoveredByClub: boolean): 0 | 1 | 2 | 3 {
  const sprint = Math.min(pillars.sprints ?? 0, sprintsCoveredByClub ? 1 : 3)
  return Math.max(sprint, pillars.cod ?? 0) as 0 | 1 | 2 | 3
}

export function allocateDays(input: WeekLayoutInput): DayAllocation {
  const cap = WORKOUT_DAY_CAP[input.load_profile]
  const days = input.available_days.length
  let workouts = Math.min(cap, days)
  let spare = days - workouts

  const speedLevel = effectiveSpeedLevel(input.pillar_levels, input.sprints_covered_by_club)
  let speedDays = 0
  let carrier: SpeedCarrier = speedLevel === 0 ? 'none' : 'micro'

  if (speedLevel === 3) {
    if (workouts - 1 >= MIN_WORKOUT_DAYS) {
      workouts -= 1
      spare += 1
    }
    if (spare > 0) { speedDays = 1; spare -= 1; carrier = 'standalone' }
    else carrier = 'integrated' // 2-day edge case (spec §2.1a)
    if (spare > 0) { speedDays += 1; spare -= 1 } // second day: surplus only
  } else if (speedLevel === 2) {
    if (spare > 0) { speedDays = 1; spare -= 1; carrier = 'standalone' }
    else carrier = 'integrated'
  }

  // Conditioning own day: level >= 2, low weekly load (damping §2.2), day to spare.
  const conditioningLevel = input.pillar_levels.conditioning ?? 0
  let conditioningDay = false
  if (conditioningLevel >= 2 && input.load_profile === 'low' && spare > 0) {
    conditioningDay = true
    spare -= 1
  }

  // Mobility floats on rest days — no cost against available_days (fatigue 0).
  const mobilityDay = (input.pillar_levels.mobility ?? 0) >= 2

  return { workouts, speed_days: speedDays, conditioning_day: conditioningDay, mobility_day: mobilityDay, carrier }
}
```

- [ ] **Step 4: Run tests to verify they pass** — `pnpm test`. Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add externals/jemp-temporal-worker/src/plan-generation/week-layout.ts externals/jemp-temporal-worker/src/plan-generation/week-layout-constants.ts externals/jemp-temporal-worker/src/plan-generation/__tests__/week-layout.test.ts
git commit -m "feat(worker): week-layout day allocation with speed level and carriers"
```

---

### Task 3: Weekday placement under fatigue rules (§2.1b)

**Files:**
- Modify: `week-layout.ts`, test file.

**Interfaces:**
- Produces:
  - `type PlacedDay = { day_of_week: number; session_type: NewSessionType; minutes: number; dose: 'normal' | 'maintenance'; carries_sprint_block: boolean; heavy_lower: boolean; suppress_micro_dose: boolean }`
  - `type WeekPlacement = { days: PlacedDay[]; carrier: SpeedCarrier; notes: string[] }`
  - `placeWeek(input: WeekLayoutInput, allocation: DayAllocation): WeekPlacement`
- Placement rules implemented: speed never <72h before and never the day after `game`/`tournament`; speed prefers the shortest-minutes day; heavy lower = farthest from speed day (standalone) or the game-farthest workout day carrying the sprint block (integrated); heavy lower prefers the longest day; conditioning never the day before a game; mobility day on a rest day (no available/club/game day; fallback: lowest-intensity club day); game in week → speed dose `maintenance`; workouts within 24h after a speed day get `suppress_micro_dose`; no legal speed window → downgrade carrier (standalone → integrated → micro) with a note.

- [ ] **Step 1: Write the failing tests**

```typescript
import { placeWeek, allocateDays } from '../week-layout'

describe('placeWeek (§2.1b)', () => {
  it('places the worked spec example: soccer, club Tue/Thu, game Sat', () => {
    const input = {
      available_days: [1, 3, 5, 7], load_profile: 'medium' as const,
      pillar_levels: { sprints: 2, strength: 2 }, sprints_covered_by_club: false,
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
      pillar_levels: { sprints: 3 }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([{ day_of_week: 2, type: 'game', intensity: 10 }]),
    }
    const alloc = { workouts: 2, speed_days: 1, conditioning_day: false, mobility_day: false, carrier: 'standalone' as const }
    const placed = placeWeek(input, alloc)
    expect(placed.days.find((d) => d.session_type === 'speed')?.day_of_week).toBe(3)
  })

  it('english week degrades carrier to integrated', () => {
    const input = {
      available_days: [1, 4], load_profile: 'high' as const,
      pillar_levels: { sprints: 3 }, sprints_covered_by_club: false, session_minutes: 60,
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
      pillar_levels: { sprints: 2 }, sprints_covered_by_club: false, session_minutes: 60,
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
      pillar_levels: { sprints: 3 }, sprints_covered_by_club: false, session_minutes: 60,
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
```

- [ ] **Step 2: Run tests, verify failure** — `pnpm test`. Expected: FAIL on missing `placeWeek`.

- [ ] **Step 3: Implement `placeWeek`**

Append to `week-layout.ts` (helpers + function):
```typescript
export type PlacedDay = {
  day_of_week: number
  session_type: NewSessionType
  minutes: number
  dose: 'normal' | 'maintenance'
  carries_sprint_block: boolean
  heavy_lower: boolean
  suppress_micro_dose: boolean
}
export type WeekPlacement = { days: PlacedDay[]; carrier: SpeedCarrier; notes: string[] }

function minutesFor(input: WeekLayoutInput, day: number): number {
  return input.day_minutes?.find((d) => d.day_of_week === day)?.minutes ?? input.session_minutes
}

/** Min circular distance in either direction (for "far from X" scoring). */
function symmetricDistance(a: number, b: number): number {
  const f = circularDayDistance(a, b)
  return Math.min(f, 7 - f)
}

export function placeWeek(input: WeekLayoutInput, allocation: DayAllocation): WeekPlacement {
  const notes: string[] = []
  const gameDays = input.weekly_schedule.sessions
    .filter((s) => s.type === 'game' || s.type === 'tournament')
    .map((s) => s.day_of_week)
  const gameWeek = gameDays.length > 0

  // Speed legality: never <72h (3 days) before a game, never the day after one.
  const speedLegal = (day: number) =>
    gameDays.every((g) => circularDayDistance(day, g) === 0 || circularDayDistance(day, g) >= 3) &&
    gameDays.every((g) => circularDayDistance(g, day) !== 1) &&
    !gameDays.includes(day)

  let carrier = allocation.carrier
  let speedDayCount = allocation.speed_days
  const pool = [...input.available_days].sort((a, b) => a - b)

  // 1. Speed days: legal days, shortest minutes first (speed needs ~30-40 min).
  const speedDays: number[] = []
  if (speedDayCount > 0) {
    const legal = pool.filter(speedLegal).sort((a, b) => minutesFor(input, a) - minutesFor(input, b) || a - b)
    while (speedDayCount > 0 && legal.length > 0) {
      const d = legal.shift()!
      speedDays.push(d)
      pool.splice(pool.indexOf(d), 1)
      speedDayCount -= 1
    }
    if (speedDays.length === 0) {
      carrier = pool.length > 0 ? 'integrated' : 'micro'
      notes.push('Speed: kein legales Fenster (72h-Regel) — Standalone zu ' + carrier + ' degradiert')
    }
  }

  // 2. Conditioning day: never the day before a game; prefer a short day.
  let conditioningDay: number | null = null
  if (allocation.conditioning_day) {
    const legal = pool.filter((d) => gameDays.every((g) => circularDayDistance(d, g) !== 1))
      .sort((a, b) => minutesFor(input, a) - minutesFor(input, b) || a - b)
    if (legal.length > 0) { conditioningDay = legal[0]; pool.splice(pool.indexOf(legal[0]), 1) }
    else notes.push('Conditioning: kein legaler Tag (Spieltag-Nähe) — entfällt diese Woche')
  }

  // 3. Remaining pool = training days. Heavy lower: farthest from speed day
  //    (standalone) or farthest from the game (integrated); prefer long days.
  const trainingDays = pool
  const refDays = speedDays.length > 0 ? speedDays : gameDays
  const farScore = (d: number) => refDays.length === 0 ? 0 : Math.min(...refDays.map((r) => symmetricDistance(d, r)))
  const heavyCandidates = [...trainingDays].sort((a, b) =>
    farScore(b) - farScore(a) || minutesFor(input, b) - minutesFor(input, a) || a - b)
  // 48h guard against the speed day; integrated carrier shares its day by design.
  const heavyDay = heavyCandidates.find((d) => speedDays.every((s) => symmetricDistance(d, s) >= 2)) ?? heavyCandidates[0] ?? null
  if (heavyDay !== null && speedDays.some((s) => symmetricDistance(heavyDay, s) < 2)) {
    notes.push('Heavy-Lower: 48h-Abstand zum Speed-Tag nicht einhaltbar — leichteste verfügbare Verletzung gewählt')
  }
  const sprintBlockDay = carrier === 'integrated' && trainingDays.length > 0
    ? [...trainingDays].sort((a, b) => farScore(b) - farScore(a) || a - b)[0]
    : null

  // 4. Mobility day: a true rest day (no available/club/game day); fallback: lowest-intensity club day.
  let mobilityDay: number | null = null
  if (allocation.mobility_day) {
    const busy = new Set([...input.available_days, ...input.weekly_schedule.sessions.map((s) => s.day_of_week)])
    const rest = [1, 2, 3, 4, 5, 6, 7].filter((d) => !busy.has(d))
    if (rest.length > 0) mobilityDay = rest[0]
    else {
      const club = input.weekly_schedule.sessions
        .filter((s) => s.type === 'team_training' || s.type === 'individual_training')
        .sort((a, b) => a.intensity - b.intensity)
      mobilityDay = club[0]?.day_of_week ?? null
    }
  }

  const days: PlacedDay[] = []
  for (const d of speedDays) days.push({
    day_of_week: d, session_type: 'speed', minutes: Math.min(minutesFor(input, d), 40),
    dose: gameWeek ? 'maintenance' : 'normal',
    carries_sprint_block: false, heavy_lower: false, suppress_micro_dose: false,
  })
  if (conditioningDay !== null) days.push({
    day_of_week: conditioningDay, session_type: 'conditioning', minutes: minutesFor(input, conditioningDay),
    dose: 'normal', carries_sprint_block: false, heavy_lower: false, suppress_micro_dose: false,
  })
  for (const d of trainingDays) days.push({
    day_of_week: d, session_type: 'training', minutes: minutesFor(input, d), dose: 'normal',
    carries_sprint_block: d === sprintBlockDay,
    heavy_lower: d === heavyDay || (d === sprintBlockDay && heavyDay === null),
    suppress_micro_dose: speedDays.some((s) => circularDayDistance(s, d) === 1),
  })
  if (sprintBlockDay !== null && heavyDay !== null && sprintBlockDay !== heavyDay) {
    // One consolidated high day (spec §2.5): the sprint-block day IS the heavy day.
    for (const day of days) if (day.session_type === 'training') day.heavy_lower = day.day_of_week === sprintBlockDay
  }
  if (mobilityDay !== null) days.push({
    day_of_week: mobilityDay, session_type: 'mobility', minutes: 20, dose: 'normal',
    carries_sprint_block: false, heavy_lower: false, suppress_micro_dose: false,
  })

  days.sort((a, b) => a.day_of_week - b.day_of_week)
  return { days, carrier, notes }
}
```

- [ ] **Step 4: Run tests** — `pnpm test`. Expected: all green (fix implementation, not tests, on mismatch — the spec example is the authority).

- [ ] **Step 5: Commit**

```bash
git add externals/jemp-temporal-worker/src/plan-generation/week-layout.ts externals/jemp-temporal-worker/src/plan-generation/__tests__/week-layout.test.ts
git commit -m "feat(worker): fatigue-rule weekday placement for week layout"
```

---

### Task 4: Pattern-block planning with variant rotation (§2.4)

**Files:**
- Modify: `week-layout.ts`, `week-layout-constants.ts`, test file.

**Interfaces:**
- Produces:
  - `type WorkoutBlockType = 'warmup'|'push'|'pull'|'lower_body'|'rotation'|'core'|'plyo'|'accessory'|'cooldown'`
  - `type BlockVariant = { push?: 'push_vertical'|'push_horizontal'; pull?: 'pull_vertical'|'pull_horizontal'; lower?: 'knee_dominant'|'hinge'; plyo?: 'maximal'|'submaximal'; core?: 'stability'|'power' }`
  - `type PlannedWorkoutBlock = { block_type: WorkoutBlockType; variant: string | null; emphasis: 'heavy'|'normal'|'light' }`
  - `planWorkoutBlocks(placement: WeekPlacement): Map<number, PlannedWorkoutBlock[]>` (key = day_of_week of training days; full block set, pre-drop)
  - Constant `WORKOUT_BLOCK_SEQUENCE: WorkoutBlockType[] = ['warmup','push','pull','lower_body','rotation','core','plyo','accessory','cooldown']`
- Rotation rules: workout index i across the week — push alternates vertical/horizontal starting vertical; pull alternates opposite-phase to push (so a single-workout week still gets one of each axis family); lower alternates knee_dominant/hinge with the **heavy_lower day always getting knee_dominant in even weeks logic — simplified: heavy day takes the first variant (knee_dominant), others alternate from hinge**; plyo alternates maximal/submaximal starting maximal; core alternates stability/power starting stability. Weekly coverage: with ≥2 workouts, both members of every rotating pair appear at least once; `rotation` block has no variant (null).

- [ ] **Step 1: Write the failing tests**

```typescript
import { planWorkoutBlocks, placeWeek } from '../week-layout'

// Module-scope helper — Task 5's tests reuse it.
const placedWeek = (days: number[], heavy: number) => ({
  carrier: 'none' as const, notes: [],
  days: days.map((d) => ({
    day_of_week: d, session_type: 'training' as const, minutes: 90, dose: 'normal' as const,
    carries_sprint_block: false, heavy_lower: d === heavy, suppress_micro_dose: false,
  })),
})

describe('planWorkoutBlocks (§2.4)', () => {
  it('emits the full block sequence for every workout', () => {
    const plan = planWorkoutBlocks(placedWeek([1, 4], 1))
    expect(plan.get(1)!.map((b) => b.block_type)).toEqual(
      ['warmup','push','pull','lower_body','rotation','core','plyo','accessory','cooldown'])
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
    const placement = placeWeek({
      available_days: [1, 3, 5, 7], load_profile: 'medium',
      pillar_levels: { sprints: 2 }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([]),
    }, allocateDays({
      available_days: [1, 3, 5, 7], load_profile: 'medium',
      pillar_levels: { sprints: 2 }, sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([]),
    }))
    const plan = planWorkoutBlocks(placement)
    const trainingDays = placement.days.filter((d) => d.session_type === 'training').map((d) => d.day_of_week)
    expect([...plan.keys()].sort()).toEqual(trainingDays.sort())
  })
})
```

- [ ] **Step 2: Run tests, verify failure** — `pnpm test`.

- [ ] **Step 3: Implement**

Add to `week-layout-constants.ts`:
```typescript
import type { WorkoutBlockType } from './week-layout'

export const WORKOUT_BLOCK_SEQUENCE: WorkoutBlockType[] =
  ['warmup', 'push', 'pull', 'lower_body', 'rotation', 'core', 'plyo', 'accessory', 'cooldown']
```

Append to `week-layout.ts`:
```typescript
import { WORKOUT_BLOCK_SEQUENCE } from './week-layout-constants'

export type WorkoutBlockType =
  | 'warmup' | 'push' | 'pull' | 'lower_body' | 'rotation' | 'core' | 'plyo' | 'accessory' | 'cooldown'
export type PlannedWorkoutBlock = {
  block_type: WorkoutBlockType
  variant: string | null
  emphasis: 'heavy' | 'normal' | 'light'
}

export function planWorkoutBlocks(placement: WeekPlacement): Map<number, PlannedWorkoutBlock[]> {
  const trainingDays = placement.days.filter((d) => d.session_type === 'training')
  const result = new Map<number, PlannedWorkoutBlock[]>()

  trainingDays.forEach((day, i) => {
    const blocks: PlannedWorkoutBlock[] = WORKOUT_BLOCK_SEQUENCE.map((bt) => {
      let variant: string | null = null
      let emphasis: 'heavy' | 'normal' | 'light' = 'normal'
      switch (bt) {
        case 'push': variant = i % 2 === 0 ? 'push_vertical' : 'push_horizontal'; break
        case 'pull': variant = i % 2 === 0 ? 'pull_horizontal' : 'pull_vertical'; break
        case 'lower_body':
          if (day.heavy_lower) { variant = 'knee_dominant'; emphasis = 'heavy' }
          else { variant = 'hinge'; emphasis = 'light' }
          break
        case 'plyo': variant = i % 2 === 0 ? 'maximal' : 'submaximal'; break
        case 'core': variant = i % 2 === 0 ? 'stability' : 'power'; break
        default: variant = null
      }
      return { block_type: bt, variant, emphasis }
    })
    result.set(day.day_of_week, blocks)
  })
  return result
}
```

- [ ] **Step 4: Run tests** — `pnpm test`. Expected: green.
- [ ] **Step 5: Commit** — `git add ... && git commit -m "feat(worker): pattern block planning with weekly variant rotation"`

---

### Task 5: Dose & breadth levers — duration estimate, block drops (§2.9)

**Files:**
- Modify: `week-layout.ts`, `week-layout-constants.ts`, test file.

**Interfaces:**
- Produces:
  - Constants: `BLOCK_MINUTES: Record<WorkoutBlockType, number> = { warmup: 8, push: 9, pull: 9, lower_body: 10, rotation: 5, core: 5, plyo: 6, accessory: 6, cooldown: 4 }`, `MAINTENANCE_DOSE_FACTOR = 0.7`, `INTEGRATED_SPRINT_BLOCK_MINUTES = 12`
  - `type DroppedBlock = { block_type: WorkoutBlockType; reason: 'time' | 'coverage' }`
  - `type FinalWorkout = { day_of_week: number; blocks: PlannedWorkoutBlock[]; dropped: DroppedBlock[]; estimated_minutes: number }`
  - `estimateMinutes(blocks: PlannedWorkoutBlock[], dose: 'normal'|'maintenance', carriesSprintBlock: boolean): number`
  - `applyScalingLevers(placement: WeekPlacement, blockPlan: Map<number, PlannedWorkoutBlock[]>): { workouts: FinalWorkout[]; notes: string[] }`
- Drop rules: never drop `warmup`/`cooldown`; never drop the heavy `lower_body` block or any block on the day that `carries_sprint_block` would lose its reason (the sprint carrier day keeps `lower_body`); drop priority: (a) blocks whose pattern already appeared earlier in the week (in-plan coverage ledger), (b) fixed low-priority order `accessory → rotation → core → plyo → pull → push`, (c) in-plan drop rotation: a block type dropped on the previous workout is not dropped again on the next one if any alternative exists. Dose `maintenance` multiplies content-block minutes (not warmup/cooldown) by `MAINTENANCE_DOSE_FACTOR` **before** estimation.

- [ ] **Step 1: Write the failing tests**

```typescript
import { estimateMinutes, applyScalingLevers } from '../week-layout'
import { BLOCK_MINUTES } from '../week-layout-constants'

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
    const game = placedWeek([1], 1); game.days[0].minutes = 45; game.days[0].dose = 'maintenance'
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
```

- [ ] **Step 2: Run tests, verify failure** — `pnpm test`.

- [ ] **Step 3: Implement**

Add to `week-layout-constants.ts`:
```typescript
export const BLOCK_MINUTES: Record<WorkoutBlockType, number> = {
  warmup: 8, push: 9, pull: 9, lower_body: 10, rotation: 5, core: 5, plyo: 6, accessory: 6, cooldown: 4,
}
export const MAINTENANCE_DOSE_FACTOR = 0.7
export const INTEGRATED_SPRINT_BLOCK_MINUTES = 12
/** Drop order when no coverage/rotation signal decides (lowest value drops first). */
export const DROP_PRIORITY: WorkoutBlockType[] = ['accessory', 'rotation', 'core', 'plyo', 'pull', 'push']
```

Append to `week-layout.ts`:
```typescript
import { BLOCK_MINUTES, MAINTENANCE_DOSE_FACTOR, INTEGRATED_SPRINT_BLOCK_MINUTES, DROP_PRIORITY } from './week-layout-constants'

export type DroppedBlock = { block_type: WorkoutBlockType; reason: 'time' | 'coverage' }
export type FinalWorkout = {
  day_of_week: number
  blocks: PlannedWorkoutBlock[]
  dropped: DroppedBlock[]
  estimated_minutes: number
}

export function estimateMinutes(
  blocks: PlannedWorkoutBlock[], dose: 'normal' | 'maintenance', carriesSprintBlock: boolean,
): number {
  const content = blocks.reduce((sum, b) => {
    const base = BLOCK_MINUTES[b.block_type]
    const scaled = (b.block_type === 'warmup' || b.block_type === 'cooldown') ? base
      : dose === 'maintenance' ? base * MAINTENANCE_DOSE_FACTOR : base
    return sum + scaled
  }, 0)
  return Math.round(content + (carriesSprintBlock ? INTEGRATED_SPRINT_BLOCK_MINUTES : 0))
}

export function applyScalingLevers(
  placement: WeekPlacement, blockPlan: Map<number, PlannedWorkoutBlock[]>,
): { workouts: FinalWorkout[]; notes: string[] } {
  const notes: string[] = []
  const coveredVariants = new Set<string>() // in-plan coverage ledger
  let previousDrops = new Set<WorkoutBlockType>() // in-plan drop rotation

  const workouts: FinalWorkout[] = []
  for (const day of placement.days.filter((d) => d.session_type === 'training')) {
    const blocks = [...(blockPlan.get(day.day_of_week) ?? [])]
    const dropped: DroppedBlock[] = []
    const protectedTypes = new Set<WorkoutBlockType>(['warmup', 'cooldown', 'lower_body'])

    const droppable = () => blocks.filter((b) => !protectedTypes.has(b.block_type))

    while (estimateMinutes(blocks, day.dose, day.carries_sprint_block) > day.minutes && droppable().length > 0) {
      const candidates = droppable()
      // (a) coverage: variants already seen this week drop first
      const covered = candidates.filter((b) => b.variant !== null && coveredVariants.has(b.variant))
      // (c) drop rotation: avoid re-dropping last workout's drops when alternatives exist
      const pickFrom = (list: PlannedWorkoutBlock[]) => {
        const fresh = list.filter((b) => !previousDrops.has(b.block_type))
        return (fresh.length > 0 ? fresh : list)
      }
      const pool = covered.length > 0 ? pickFrom(covered) : pickFrom(candidates)
      // (b) fixed priority as final tiebreak
      pool.sort((a, b) => DROP_PRIORITY.indexOf(a.block_type) - DROP_PRIORITY.indexOf(b.block_type))
      const victim = pool[0]
      blocks.splice(blocks.indexOf(victim), 1)
      dropped.push({ block_type: victim.block_type, reason: 'time' })
    }

    const estimated = estimateMinutes(blocks, day.dose, day.carries_sprint_block)
    if (estimated > day.minutes) {
      notes.push(`Tag ${day.day_of_week}: Budget ${day.minutes} min unterschreitbar nicht erreichbar (geschützter Kern ${estimated} min)`)
    }
    for (const b of blocks) if (b.variant) coveredVariants.add(b.variant)
    previousDrops = new Set(dropped.map((d) => d.block_type))
    workouts.push({ day_of_week: day.day_of_week, blocks, dropped, estimated_minutes: estimated })
  }
  return { workouts, notes }
}
```

- [ ] **Step 4: Run tests** — `pnpm test`. Expected: green.
- [ ] **Step 5: Commit** — `git commit -m "feat(worker): dose and breadth scaling levers with drop rotation"`

---

### Task 6: Facade `buildWeekLayout` + golden test

**Files:**
- Modify: `week-layout.ts`, test file.

**Interfaces:**
- Produces (THE entry point Phase 2b consumes):
  - `type WeekLayout = { placement: WeekPlacement; workouts: FinalWorkout[]; carrier: SpeedCarrier; notes: string[] }`
  - `buildWeekLayout(input: WeekLayoutInput): WeekLayout` — `allocateDays` → `placeWeek` → `planWorkoutBlocks` → `applyScalingLevers`, notes concatenated.

- [ ] **Step 1: Write the failing golden test** (the spec §2.1b worked example end-to-end)

```typescript
import { buildWeekLayout } from '../week-layout'

describe('buildWeekLayout (golden: spec §2.1b example)', () => {
  it('lays out the soccer week deterministically', () => {
    const layout = buildWeekLayout({
      available_days: [1, 3, 5, 7], load_profile: 'medium',
      pillar_levels: { sprints: 2, cod: 1, strength: 2, lower_body_plyometrics: 2, mobility: 2 },
      sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([
        { day_of_week: 2, type: 'team_training', intensity: 6 },
        { day_of_week: 4, type: 'team_training', intensity: 6 },
        { day_of_week: 6, type: 'game', intensity: 10 },
      ]),
    })
    expect(layout.carrier).toBe('standalone')
    const types = Object.fromEntries(layout.placement.days.map((d) => [d.day_of_week, d.session_type]))
    expect(types[1]).toBe('speed')
    expect(types[3]).toBe('training'); expect(types[5]).toBe('training'); expect(types[7]).toBe('training')
    expect(layout.placement.days.find((d) => d.heavy_lower)?.day_of_week).toBe(3)
    expect(layout.placement.days.some((d) => d.session_type === 'mobility')).toBe(true)
    expect(layout.workouts).toHaveLength(3)
    // Determinism: same input, same output.
    expect(buildWeekLayout({
      available_days: [1, 3, 5, 7], load_profile: 'medium',
      pillar_levels: { sprints: 2, cod: 1, strength: 2, lower_body_plyometrics: 2, mobility: 2 },
      sprints_covered_by_club: false, session_minutes: 60,
      weekly_schedule: schedule([
        { day_of_week: 2, type: 'team_training', intensity: 6 },
        { day_of_week: 4, type: 'team_training', intensity: 6 },
        { day_of_week: 6, type: 'game', intensity: 10 },
      ]),
    })).toEqual(layout)
  })
})
```

- [ ] **Step 2: Run, verify failure** — missing `buildWeekLayout`.

- [ ] **Step 3: Implement**

```typescript
export type WeekLayout = {
  placement: WeekPlacement
  workouts: FinalWorkout[]
  carrier: SpeedCarrier
  notes: string[]
}

export function buildWeekLayout(input: WeekLayoutInput): WeekLayout {
  const allocation = allocateDays(input)
  const placement = placeWeek(input, allocation)
  const blockPlan = planWorkoutBlocks(placement)
  const { workouts, notes } = applyScalingLevers(placement, blockPlan)
  return { placement, workouts, carrier: placement.carrier, notes: [...placement.notes, ...notes] }
}
```

- [ ] **Step 4: Run the whole suite** — `pnpm test`. Expected: all tests green.

- [ ] **Step 5: Verify behavior-neutrality of the worker build and commit**

Run in `externals/jemp-temporal-worker/`: `pnpm build`
Expected: build succeeds (new files compile, nothing existing touched).
```bash
git add externals/jemp-temporal-worker/src/plan-generation/week-layout.ts externals/jemp-temporal-worker/src/plan-generation/__tests__/week-layout.test.ts
git commit -m "feat(worker): buildWeekLayout facade with golden determinism test"
```
