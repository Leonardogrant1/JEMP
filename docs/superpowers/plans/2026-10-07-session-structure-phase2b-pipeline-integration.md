# Session Structure Redesign — Phase 2b: Pipeline Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Phase-2a week-layout engine into the worker's plan-generation pipeline as a **parallel v2 path** behind the `set_by_wizard` activation gate — pattern-block pools from exercise metadata, deterministic speed/mobility/conditioning session builders, an LLM step for training-session exercise selection, and persistence of session types, new blocks, rounds, and dropped blocks.

**Architecture:** New directory `src/plan-generation/v2/` in the worker holding pure, unit-tested modules (pool matching, session builders, validator) plus one thin IO assembly (`prepare-v2.ts`). The legacy path (`prepareGeneration` → `runSessionCD`) stays byte-identical in behavior; shared files (`schemas.ts`, `types.ts`, `save-plan.ts`, the workflow, the prepare activity) receive only **additive** widenings (optional fields, extended enums on typing-only schemas, a gate branch). Until Phase 3 ships the wizard, no production user has `set_by_wizard = true`, so the v2 path is dormant in prod — this plan is shippable like Phases 1/2a.

**Tech Stack:** TypeScript (worker, npm + vitest@2 from Phase 2a), one additive SQL migration, Supabase, OpenAI structured outputs (zod).

**Spec:** `docs/superpowers/specs/2026-10-07-session-structure-redesign-design.md` (§2.4–§2.8, §6.1 step order, §6.5 activation). Consumes Phase 2a's `buildWeekLayout` (`src/plan-generation/week-layout.ts`).

**Deferred beyond 2b (ruling recorded here):** §2.7 conservative mode (self_estimate → lower intensity, flatter progression) depends on the Phase-5 score-source architecture and is deferred — **except** its hardest consequence, the max-velocity gate, which 2b implements against existing `metric_entries` data (measured sprint within 120 days). §2.3's full pillar-level→dose table beyond sprints/cod/conditioning/mobility (e.g. strength level biasing volume) is Phase-5-adjacent tuning and also deferred; levels already steer day allocation, drop priority, and content mix.

## Global Constraints

- **Legacy behavior must not change.** Files shared with the legacy path may only gain optional fields, widened *typing* enums, and new branches that are unreachable without v2 data. The dynamic LLM schema builders used by the legacy path (`buildWeekPlanSchema`, `buildMainSessionSchema`, `buildWarmupCooldownSchema`) are **not** touched.
- Migration rules from Phase 1: `supabase migration up` only (never `db reset`), `SET LOCAL lock_timeout = '5s'` preamble, timestamps continuing after `20261007120500`, psql via `docker exec supabase_db_jemp psql -U postgres -d postgres`.
- `database.types.ts` is regenerated with the **installed CLI** (`supabase gen types typescript --local`), never `npx` (pulls 2.120.0 and reshapes the file — Phase 1 ruling).
- v2 modules are pure where possible: IO (supabase/openai) only in `prepare-v2.ts` and `run-session-v2.ts`; everything else takes plain arrays/objects.
- Session/block/metric slugs are data contracts: session types `training|speed|mobility|conditioning`; block types from Phase 1 (`push, pull, lower_body, rotation, core, plyo, sprint, cod, conditioning, mobility` + legacy); sprint metric slugs `10m_sprint_time`, `30m_sprint_time`, `10m_sprint_flying_time` (table `metric_entries` joined via `metrics.slug`, result value in `value`, timestamp `created_at`).
- Aging window for "measured" sprint values: **120 days** (spec §4.1 ~4 months), constant `MEASURED_SPRINT_MAX_AGE_DAYS = 120`.
- Tests: `npm test` in `externals/jemp-temporal-worker/`. Commit per task, `feat(worker): ...`, Claude co-author trailer.

## Review Focus

1. **Legacy false activation** — a user whose `user_pillar_levels` rows exist only from the future ranking translation (`set_by_wizard = false`) must stay on the legacy path. Expected: the gate filters on `set_by_wizard = true` rows, not row existence. Pinned by Task 7 Step 1 gate test (`prefers legacy when levels are not wizard-set`).
2. **Metadata-null exercises vanish from pools** — most of the catalog has no `strength_pattern` yet (partial backfill is by design). Expected: the `BODY_REGION_TO_PATTERN` fallback admits untagged exercises into coarse-matching blocks; a pool must never be empty just because tagging is incomplete. Pinned by Task 3 test `falls back to body region for untagged exercises`.
3. **Deterministic builders with empty pools** — a home user without equipment may have zero conditioning-suited exercises. Expected: the builder returns `null` (session skipped, note recorded), never a persisted session with an empty block. Pinned by Task 5 test `returns null and a note when the pool is empty`.
4. **Widened typing schemas leaking into LLM calls** — extending the *static* zod enums must not widen what the LLM may output on the legacy path. Expected: legacy dynamic builders keep their narrow enums (`primary|secondary|accessory`, `training|recovery`). Pinned by Task 2 Step 3 (grep assertion + schema parse tests).
5. **Prebuilt sessions bypassing savePlan's slug resolution** — speed/mobility/conditioning sessions reference block types (`sprint`, `cod`, …) that `savePlan` resolves by slug; a missing `block_types` row would silently drop blocks (`blockTypeMap.get` miss). Expected: savePlan logs/throws on unresolvable block types instead of silently skipping. Pinned by Task 2 Step 5 (savePlan guard + its test note) and Task 7's end-to-end type check.

---

### Task 1: Additive migration — dropped_blocks + sprint context

**Files:**
- Create: `supabase/migrations/20261007130000_add_dropped_blocks_and_sprint_context.sql`
- Modify: `database.types.ts` (regenerated)

**Interfaces:**
- Produces: `workout_plan_sessions.dropped_blocks JSONB NULL` (array of `{block_type, reason}`, §2.9 audit contract); `user_profiles.sprints_covered_by_club BOOLEAN NOT NULL DEFAULT false`; `user_profiles.sprint_distance sprint_distance_answer NULL` (enum `under_20m | 20_40m | over_40m`). Phase 3's wizard writes the profile columns; Task 7's gate reads them.

- [ ] **Step 1: RED — verify columns absent**

```bash
docker exec supabase_db_jemp psql -U postgres -d postgres -tc "SELECT count(*) FROM information_schema.columns WHERE (table_name='workout_plan_sessions' AND column_name='dropped_blocks') OR (table_name='user_profiles' AND column_name IN ('sprints_covered_by_club','sprint_distance'));"
```
Expected: `0`

- [ ] **Step 2: Write the migration**

```sql
-- Prod-DDL safety (spec §6.1): fail fast instead of queueing behind a lock.
SET LOCAL lock_timeout = '5s';

-- §2.9 audit contract: breadth-lever drops are persisted per planned session
-- (array of {block_type, reason}) — validation compares expected-minus-dropped.
ALTER TABLE workout_plan_sessions
    ADD COLUMN dropped_blocks JSONB;

-- §3.1 sprint context (written by the Phase-3 wizard, read by the v2 generator).
CREATE TYPE sprint_distance_answer AS ENUM ('under_20m', '20_40m', 'over_40m');

ALTER TABLE user_profiles
    ADD COLUMN sprints_covered_by_club BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN sprint_distance sprint_distance_answer;
```

- [ ] **Step 3: Apply + GREEN verify**

Run: `supabase migration up`
```bash
docker exec supabase_db_jemp psql -U postgres -d postgres -tc "SELECT count(*) FROM information_schema.columns WHERE (table_name='workout_plan_sessions' AND column_name='dropped_blocks') OR (table_name='user_profiles' AND column_name IN ('sprints_covered_by_club','sprint_distance'));"
```
Expected: `3`

- [ ] **Step 4: Regenerate types, typecheck baseline, commit**

```bash
supabase gen types typescript --local > database.types.ts
npx tsc --noEmit 2>&1 | wc -l   # must equal the pre-change count (record it first)
git add supabase/migrations/20261007130000_add_dropped_blocks_and_sprint_context.sql database.types.ts
git commit -m "feat(db): add dropped_blocks and sprint context columns"
```

---

### Task 2: Shared-file widenings (schemas, types, savePlan) — legacy-neutral

**Files:**
- Modify: `externals/jemp-temporal-worker/src/plan-generation/schemas.ts` (static schemas only)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/types.ts` (SessionBuildInput)
- Modify: `externals/jemp-temporal-worker/src/activities/save-plan.ts` (target_rounds, dropped_blocks, missing-block-type guard)
- Test: `externals/jemp-temporal-worker/src/plan-generation/__tests__/v2-schemas.test.ts`

**Interfaces:**
- Produces: `exerciseSchema` gains `target_rounds: z.number().nullable().optional()`; `blockSchema.block_type` and `sessionSchema.session_type`/`mode_slug` widened as below; `sessionSchema` gains `dropped_blocks: z.array(z.object({ block_type: z.string(), reason: z.enum(['time','coverage']) })).optional()`; `SessionBuildInput['blockPools'][number]['block_type']` widened to `string`; savePlan inserts `target_rounds` (exercise level) and `dropped_blocks` (session level) when present and **throws** when a block's `block_type` slug cannot be resolved.

- [ ] **Step 1: Write failing schema tests**

`v2-schemas.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { sessionSchema } from '../schemas'

const exercise = {
  exercise_slug: 'pogos', order_index: 0, notes: '', target_sets: 3,
  target_reps_min: 10, target_reps_max: 12, target_duration_seconds: -1,
  target_distance_meters: -1, target_rest_seconds: 60,
  target_load_type: 'bodyweight' as const, target_load_value: -1,
}

describe('widened static schemas (v2)', () => {
  it('accepts a speed session with sprint/cod blocks and target_rounds', () => {
    const parsed = sessionSchema.safeParse({
      name: 'Sprint-Einheit', mode_slug: 'full', estimated_duration_minutes: 35,
      day_of_week: 1, order_index: 0, session_type: 'speed', description: '',
      pause_between_sets: 120,
      dropped_blocks: [{ block_type: 'rotation', reason: 'time' }],
      blocks: [
        { block_type: 'warmup', order_index: 0, focused_category_slug: 'mobility', exercises: [exercise] },
        { block_type: 'sprint', order_index: 1, focused_category_slug: 'sprints', exercises: [{ ...exercise, target_rounds: 4 }] },
        { block_type: 'cod', order_index: 2, focused_category_slug: 'cod', exercises: [exercise] },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it('still accepts a legacy training session unchanged', () => {
    const parsed = sessionSchema.safeParse({
      name: 'Workout', mode_slug: 'full', estimated_duration_minutes: 60,
      day_of_week: 2, order_index: 0, session_type: 'training', description: '',
      pause_between_sets: 120,
      blocks: [{ block_type: 'primary', order_index: 0, focused_category_slug: 'strength', exercises: [exercise] }],
    })
    expect(parsed.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run, verify RED** — `npm test` fails on unknown enum values / unknown keys.

- [ ] **Step 3: Implement the widenings**

In `schemas.ts` (STATIC schemas only):
- `exerciseSchema`: add `target_rounds: z.number().nullable().optional(),`
- `blockSchema.block_type`: `z.enum(["warmup","primary","secondary","accessory","cooldown","push","pull","lower_body","rotation","core","plyo","sprint","cod","conditioning","mobility"])`
- `sessionSchema.session_type`: `z.enum(["training","recovery","speed","mobility","conditioning"])`
- `sessionSchema`: add `dropped_blocks: z.array(z.object({ block_type: z.string(), reason: z.enum(["time","coverage"]) })).optional(),`

In `types.ts`: `SessionBuildInput.blockPools[].block_type` → `string` (was the 3-value union); add optional `variant?: string | null` and `emphasis?: 'heavy' | 'normal' | 'light'` to the pool entry.

Verify legacy isolation: `grep -n "buildMainSessionSchema\|buildWeekPlanSchema\|buildWarmupCooldownSchema" externals/jemp-temporal-worker/src/plan-generation/schemas.ts` — their enum literals must be unchanged by your diff (`git diff` shows no edits inside those three builders).

- [ ] **Step 4: savePlan passthrough + guard**

In `save-plan.ts`:
- Exercise insert object: add `target_rounds: (ex as any).target_rounds ?? null,` (and add `target_rounds` to the `.select(...)` list).
- Session insert: add `dropped_blocks: (aiSession as any).dropped_blocks ?? null,`
- Where `const blockTypeId = blockTypeMap.get(block.block_type)` is read: if `!blockTypeId`, `throw new Error(\`savePlan: unknown block_type slug "${block.block_type}" — block_types row missing\`)` instead of inserting with `undefined` (silent-drop guard, Review Focus 5).

- [ ] **Step 5: GREEN + build + commit**

Run: `npm test` (all green incl. new file) and `npm run build` (succeeds).
```bash
git add externals/jemp-temporal-worker/src/plan-generation/schemas.ts externals/jemp-temporal-worker/src/plan-generation/types.ts externals/jemp-temporal-worker/src/activities/save-plan.ts externals/jemp-temporal-worker/src/plan-generation/__tests__/v2-schemas.test.ts
git commit -m "feat(worker): widen shared schemas/types for v2 sessions, savePlan rounds+dropped_blocks"
```

---

### Task 3: v2 pool matching (pattern blocks → exercise pools)

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/pool.ts`
- Test: `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/pool.test.ts`

**Interfaces:**
- Consumes: `PlannedWorkoutBlock`, `WorkoutBlockType` from `../week-layout`; `BODY_REGION_TO_PATTERN`, `effectiveRegion` from `../generate-plan` (exported).
- Produces:
  - `type V2Exercise = { id: string; slug: string; name: string; category_slug: string; body_region: string | null; dominant_region: string | null; strength_pattern: string | null; plyo_type: string | null; core_type: string | null; sprint_type: string | null; covered_patterns: string[] | null; laterality: string | null; min_level: number; max_level: number; intensity_score: number | null; measurement_type: string | null }`
  - `exerciseMatchesBlock(ex: V2Exercise, block: PlannedWorkoutBlock): boolean`
  - `buildBlockPools(exercises: V2Exercise[], blocks: PlannedWorkoutBlock[]): Map<WorkoutBlockType, V2Exercise[]>`

Matching rules (metadata first, coarse fallback second — Review Focus 2):
| Block | Primary match | Fallback for untagged |
|---|---|---|
| push | `strength_pattern === block.variant` (`push_vertical`/`push_horizontal`) | `strength_pattern == null` && `BODY_REGION_TO_PATTERN[effectiveRegion] === 'push'` && category `strength` |
| pull | analog with `pull_*` | pattern `'pull'` |
| lower_body | `strength_pattern === block.variant` (`knee_dominant` → fallback pattern `'squat'`, `hinge` → `'hinge'`) | as noted |
| rotation | `strength_pattern === 'rotation'` | none (rotation needs the tag) |
| core | `core_type === block.variant` | none |
| plyo | `plyo_type === block.variant` && category `lower_body_plyometrics` or `jumps` | category in (`jumps`,`lower_body_plyometrics`) && `sprint_type == null` |
| accessory | `effectiveRegion` ∈ (`groin`,`hip`,`calf`,`ankle`,`bicep`,`tricep`,`forearm`) && category `strength` | — |
| warmup / cooldown | category `mobility` (warmup also admits `sprint_type == null` && category jumps/lower_body_plyometrics low-intensity: `intensity_score <= 3`) | — |

- [ ] **Step 1: Write failing tests** — fixtures: `bench_press` (push_horizontal/strength/chest), `pull_up` (pull_vertical), `back_squat` (knee_dominant), untagged `incline_machine_press` (strength_pattern null, body_region chest, category strength), `pogos` (plyo submaximal, category jumps), `copenhagen_plank` (core stability), `sprint_10m` (sprint_type acceleration — must NOT land in plyo pools), `banded_clamshell`-style accessory (hip/strength). Assertions:

```typescript
import { describe, it, expect } from 'vitest'
import { exerciseMatchesBlock, buildBlockPools } from '../pool'

const ex = (over: Partial<any>): any => ({
  id: 'x', slug: 'x', name: 'x', category_slug: 'strength', body_region: null,
  dominant_region: null, strength_pattern: null, plyo_type: null, core_type: null,
  sprint_type: null, covered_patterns: null, laterality: null,
  min_level: 1, max_level: 100, intensity_score: 5, measurement_type: 'reps', ...over,
})
const block = (bt: string, variant: string | null = null): any =>
  ({ block_type: bt, variant, emphasis: 'normal' })

describe('exerciseMatchesBlock', () => {
  it('matches tagged exercises by exact variant', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'bench_press', strength_pattern: 'push_horizontal' }), block('push', 'push_horizontal'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'bench_press', strength_pattern: 'push_horizontal' }), block('push', 'push_vertical'))).toBe(false)
  })
  it('falls back to body region for untagged exercises', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'machine_press', body_region: 'chest' }), block('push', 'push_vertical'))).toBe(true)
  })
  it('keeps sprints out of plyo pools', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'sprint_10m', category_slug: 'lower_body_plyometrics', sprint_type: 'acceleration' }), block('plyo', 'maximal'))).toBe(false)
  })
  it('matches core by core_type and rotation only by tag', () => {
    expect(exerciseMatchesBlock(ex({ slug: 'copenhagen_plank', core_type: 'stability' }), block('core', 'stability'))).toBe(true)
    expect(exerciseMatchesBlock(ex({ slug: 'machine_press', body_region: 'chest' }), block('rotation'))).toBe(false)
  })
})

describe('buildBlockPools', () => {
  it('builds one pool per planned block', () => {
    const pools = buildBlockPools(
      [ex({ slug: 'bench_press', strength_pattern: 'push_horizontal' }), ex({ slug: 'romanian_deadlift', strength_pattern: 'hinge' })],
      [block('push', 'push_horizontal'), block('lower_body', 'hinge')],
    )
    expect(pools.get('push')!.map((e: any) => e.slug)).toEqual(['bench_press'])
    expect(pools.get('lower_body')!.map((e: any) => e.slug)).toEqual(['romanian_deadlift'])
  })
})
```

- [ ] **Step 2: RED** — module missing. **Step 3: Implement** per the table (one `switch` on `block.block_type`, fallback branch guarded by `strength_pattern == null`). **Step 4: GREEN** (`npm test`). **Step 5: Commit** `feat(worker): v2 pattern-block pool matching with body-region fallback`.

---

### Task 4: Deterministic speed-session builder

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/build-speed-session.ts`
- Test: `.../v2/__tests__/build-speed-session.test.ts`

**Interfaces:**
- Consumes: `PlacedDay` from `../week-layout`; `V2Exercise`.
- Produces: `buildSpeedSession(input: { day: PlacedDay; exercises: V2Exercise[]; levels: { sprints: number; cod: number }; allowMaxVelocity: boolean; orderIndex: number }): { session: PlannedSessionLike; notes: string[] } | null` where `PlannedSessionLike` matches the widened `sessionSchema` shape (`session_type: 'speed'`, blocks `warmup → sprint → cod → cooldown`).
- Rules: sprint pool = `sprint_type != null` exercises; `max_velocity` entries excluded unless `allowMaxVelocity`; cod pool = category `cod` (fallback: slugs with `agility`/`shuttle`/`drill` in category `lower_body_plyometrics` until the Phase-1→§6.1-step-4 recategorization runs — pool matching by category only, no slug heuristics: use category `cod` OR (category `lower_body_plyometrics` && `sprint_type == null` && `measurement_type === 'time'`)). Sprint/COD exercise count split proportional to `levels` (e.g. sprints 1 & cod 3 → 1 sprint + 3 cod drills). Dose `maintenance` → sprint sets 2–3 × 20m (`target_sets: 2, target_distance_meters: 20`), normal → 4–6 × 20–30m. Warmup: 2 mobility/drill exercises; cooldown: 1–2 mobility. Returns `null` + note when the sprint AND cod pools are both empty.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { buildSpeedSession } from '../build-speed-session'

const ex = (over: Partial<any>): any => ({
  id: 'x', slug: over.slug ?? 'x', name: 'x', category_slug: 'sprints', body_region: null,
  dominant_region: null, strength_pattern: null, plyo_type: null, core_type: null,
  sprint_type: null, covered_patterns: null, laterality: null,
  min_level: 1, max_level: 100, intensity_score: 5, measurement_type: 'time', ...over,
})
const day = (over: Partial<any> = {}): any => ({
  day_of_week: 1, session_type: 'speed', minutes: 40, dose: 'normal',
  carries_sprint_block: false, heavy_lower: false, suppress_micro_dose: false, ...over,
})
const basePool = [
  ex({ slug: 'sprint_10m', sprint_type: 'acceleration' }),
  ex({ slug: 'flying_20_sprint', sprint_type: 'max_velocity' }),
  ex({ slug: 'agility_505', category_slug: 'cod' }),
  ex({ slug: 't_drill', category_slug: 'cod' }),
  ex({ slug: 'hip_cars', category_slug: 'mobility', measurement_type: 'duration' }),
]

describe('buildSpeedSession', () => {
  it('builds the warmup→sprint→cod→cooldown structure', () => {
    const r = buildSpeedSession({ day: day(), exercises: basePool, levels: { sprints: 2, cod: 2 }, allowMaxVelocity: true, orderIndex: 0 })!
    expect(r.session.session_type).toBe('speed')
    expect(r.session.blocks.map((b: any) => b.block_type)).toEqual(['warmup', 'sprint', 'cod', 'cooldown'])
  })
  it('excludes max_velocity without the gate', () => {
    const r = buildSpeedSession({ day: day(), exercises: basePool, levels: { sprints: 3, cod: 1 }, allowMaxVelocity: false, orderIndex: 0 })!
    const slugs = r.session.blocks.flatMap((b: any) => b.exercises.map((e: any) => e.exercise_slug))
    expect(slugs).not.toContain('flying_20_sprint')
  })
  it('maintenance dose caps sprint sets', () => {
    const r = buildSpeedSession({ day: day({ dose: 'maintenance' }), exercises: basePool, levels: { sprints: 2, cod: 1 }, allowMaxVelocity: true, orderIndex: 0 })!
    const sprintBlock = r.session.blocks.find((b: any) => b.block_type === 'sprint')!
    expect(Math.max(...sprintBlock.exercises.map((e: any) => e.target_sets))).toBeLessThanOrEqual(3)
  })
  it('cod-dominant levels yield more cod than sprint exercises', () => {
    const r = buildSpeedSession({ day: day(), exercises: basePool, levels: { sprints: 1, cod: 3 }, allowMaxVelocity: true, orderIndex: 0 })!
    const count = (bt: string) => r.session.blocks.find((b: any) => b.block_type === bt)!.exercises.length
    expect(count('cod')).toBeGreaterThan(count('sprint'))
  })
  it('returns null and a note when sprint and cod pools are empty', () => {
    const r = buildSpeedSession({ day: day(), exercises: [ex({ slug: 'hip_cars', category_slug: 'mobility' })], levels: { sprints: 2, cod: 2 }, allowMaxVelocity: true, orderIndex: 0 })
    expect(r).toBeNull()
  })
})
```
- [ ] **Step 2: RED.** **Step 3: Implement** (pure function; pick deterministically by ascending `intensity_score` then slug — no randomness). **Step 4: GREEN.** **Step 5: Commit** `feat(worker): deterministic v2 speed session builder with max-velocity gating`.

---

### Task 5: Deterministic mobility + conditioning builders

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/build-simple-sessions.ts`
- Test: `.../v2/__tests__/build-simple-sessions.test.ts`

**Interfaces:**
- Produces:
  - `buildMobilitySession({ day, exercises, orderIndex })` → `session_type: 'mobility'`, single `mobility` block with 5–7 category-`mobility` exercises (duration-based: `target_duration_seconds: 45`, `target_sets: 1`), or `null` + note if pool < 3.
  - `buildConditioningSession({ day, exercises, orderIndex })` → `session_type: 'conditioning'`, blocks `warmup → conditioning → cooldown`; the conditioning block prescribes a **format** (constant `CONDITIONING_FORMATS`: `interval_30_30` = `{work: 30, rest: 30, rounds: 10}`, `circuit_40_20` = `{work: 40, rest: 20, rounds: 4}`), written as `target_duration_seconds`/`target_rest_seconds`/`target_rounds` on each chosen exercise (3–5 exercises, pool: `movement_pattern === 'cardio'`-style — in `V2Exercise` terms: category in (`lower_body_plyometrics`,`conditioning`) && `measurement_type` in (`duration`,`reps_or_duration`) && `sprint_type == null`), or `null` + note if pool < 3 (Review Focus 3).
- Format choice deterministic: `circuit_40_20` when ≥4 pool exercises have `intensity_score >= 5`, else `interval_30_30`.

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { buildMobilitySession, buildConditioningSession } from '../build-simple-sessions'
// reuse the ex()/day() fixture helpers from build-speed-session.test.ts (extract to a shared v2 test-fixtures file)

describe('buildMobilitySession', () => {
  const pool = ['hip_cars', 'shoulder_cars', 'ankle_cars', 'childs_pose', 'supine_twist']
    .map((slug) => ex({ slug, category_slug: 'mobility', measurement_type: 'duration' }))
  it('builds one mobility block with duration prescriptions', () => {
    const r = buildMobilitySession({ day: day({ session_type: 'mobility', minutes: 20 }), exercises: pool, orderIndex: 0 })!
    expect(r.session.session_type).toBe('mobility')
    const block = r.session.blocks.find((b: any) => b.block_type === 'mobility')!
    expect(block.exercises.length).toBeGreaterThanOrEqual(5)
    expect(block.exercises.every((e: any) => e.target_duration_seconds > 0)).toBe(true)
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
    const block = r.session.blocks.find((b: any) => b.block_type === 'conditioning')!
    expect(block.exercises.every((e: any) => e.target_rounds > 0 && e.target_duration_seconds > 0 && e.target_rest_seconds >= 0)).toBe(true)
  })
  it('returns null and a note when the pool is empty', () => {
    const r = buildConditioningSession({ day: day(), exercises: [ex({ slug: 'bench_press', category_slug: 'strength' })], orderIndex: 0 })
    expect(r).toBeNull()
  })
})
```
- [ ] **Step 2: RED.** **Step 3: Implement.** **Step 4: GREEN.** **Step 5: Commit** `feat(worker): deterministic v2 mobility and conditioning session builders`.

---

### Task 6: v2 training-session step — prompt, dynamic schema, validator

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/run-session-v2.ts`
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/v2-prompts.ts`
- Test: `.../v2/__tests__/run-session-v2.test.ts` (validator + schema builder only — the LLM call itself is IO and not unit-tested)

**Interfaces:**
- Consumes: `FinalWorkout`, `PlacedDay` from `../week-layout`; pools from Task 3; `PreviousSessionSummary` style context strings.
- Produces:
  - `buildV2SessionSchema(blockTypes: string[], exerciseSlugs: string[]): ZodSchema` — like `buildMainSessionSchema` but `block_type: z.enum(blockTypes)`, `session_type: z.literal('training')`, exercises carry the standard target fields (no `target_rounds` — training blocks are sets×reps).
  - `findV2Violations(session, pools: Map<string, {slugs: Set<string>}> , expectedBlocks: string[]): string[]` — pure: every expected block present exactly once, no unexpected block, every `exercise_slug` ∈ its block's pool, every block non-empty. (Variant correctness is guaranteed by pool construction, not re-checked.)
  - `runSessionV2(input: { workout: FinalWorkout; day: PlacedDay; pools: Map<WorkoutBlockType, V2Exercise[]>; userContext: string; weekSummary: string; previousSummaries: string[]; orderIndex: number }, openai: OpenAI): Promise<PlannedSessionLike>` — prompt → structured output → `findV2Violations` → up to 3 attempts with violation feedback (mirror of the legacy retry loop); attaches `dropped_blocks: workout.dropped` and `session_type: 'training'` to the result.
- `V2_SESSION_PROMPT` (in `v2-prompts.ts`) instructs: fixed block list with variant + emphasis labels (heavy lower = top priority exercise quality, 3–5 reps range; light = technique/volume), pools per block (slug lists), the day's minutes & dose, micro-dose note when `day.suppress_micro_dose` is false (warmup must include 1 CNS mini-step/short-acceleration drill — pool hint), sprint-block instruction when `day.carries_sprint_block` (insert a `sprint` block directly after warmup, 10–15 min, from the provided sprint pool), user context + previous-session summaries for variety.

- [ ] **Step 1: Failing tests** for `findV2Violations` (missing block, extra block, foreign slug, empty block, happy path) and `buildV2SessionSchema` (accepts planned block types, rejects others via safeParse).
- [ ] **Step 2: RED.** **Step 3: Implement** validator + schema + prompt template + `runSessionV2` (structure mirrors `runSessionCD`'s attempt loop: `openai.chat.completions.create` with `zodResponseFormat(schema, 'data')`, model `gpt-5-mini`, violation feedback appended on retry — copy the loop shape, not the legacy prompt). **Step 4: GREEN** (`npm test`). **Step 5: Commit** `feat(worker): v2 training session LLM step with deterministic validation`.

---

### Task 7: prepareGenerationV2, activation gate, workflow wiring

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts`
- Modify: `externals/jemp-temporal-worker/src/activities/prepare-plan-generation.ts` (gate)
- Modify: `externals/jemp-temporal-worker/src/activities/run-session-phases-cd.ts` (v2 branch)
- Modify: `externals/jemp-temporal-worker/src/workflows/generate-plan-workflow.ts` (prebuilt sessions)
- Modify: `externals/jemp-temporal-worker/src/plan-generation/generate-plan.ts` (ONLY: add optional fields to `PrepareResult`)
- Test: `.../v2/__tests__/gate.test.ts`

**Interfaces:**
- `PrepareResult` gains optional `pathVersion?: 'legacy' | 'v2'`, `prebuiltSessions?: PlannedSession[]`, `v2SessionContexts?: Array<{ workout: FinalWorkout; day: PlacedDay; poolSlugs: Record<string, string[]> }>` — legacy fills none of them.
- `prepareGenerationV2(input: PlanGenerationInputV2, supabase, openai): Promise<PrepareResult>`:
  1. Loads exercises incl. new metadata columns, applies the user's equipment/env/level filter (lean reimplementation in `v2/pool.ts`-adjacent helper `filterForUser(exercises, {equipmentIds, environmentIds, levelMap})` — deliberate small duplication to keep legacy untouched; ledger-note it).
  2. Measured-sprint check: `metric_entries` join `metrics` on slug ∈ sprint metric slugs, `created_at >= now() - 120 days`, `user_id` — any row → `hasMeasuredSprint`.
  3. `buildWeekLayout(...)` from pillar levels (by category slug), `sprints_covered_by_club`, weekly schedule, load profile, `preferred_workout_days`, `max_session_duration` as `session_minutes`.
  4. Prebuilds speed/mobility/conditioning sessions (Tasks 4–5), collects notes.
  5. Produces one `SessionBuildInput`-compatible context per training day for `runSessionV2` (pools serialized), `weekPlanSummary` rendered from the layout (day → type → blocks/variants), simple deterministic plan name/description.
- Gate (in `preparePlanGeneration`): load `user_pillar_levels` with `set_by_wizard = true` joined to `categories(slug)` plus `sprints_covered_by_club`/`sprint_distance` from the profile. Rows present → `prepareGenerationV2`; else legacy `prepareGeneration` (unchanged call).
- `runSessionPhasesCD` activity: if the passed context carries `pathVersion === 'v2'`, call `runSessionV2`, else legacy `runSessionCD`.
- Workflow: after the session loop, `plannedSessions.push(...(prepareResult.prebuiltSessions ?? []))` before `savePlan`.
- `allowMaxVelocity = hasMeasuredSprint && sprint_distance !== 'under_20m' && sprint_distance != null` (spec §2.5 gating).

- [ ] **Step 1: Failing gate tests** (pure decision function extracted as `shouldUseV2(rows: Array<{set_by_wizard: boolean}>): boolean` in `prepare-v2.ts`):

```typescript
import { describe, it, expect } from 'vitest'
import { shouldUseV2 } from '../prepare-v2'

describe('activation gate (§6.5)', () => {
  it('prefers legacy when levels are not wizard-set', () => {
    expect(shouldUseV2([{ set_by_wizard: false }, { set_by_wizard: false }])).toBe(false)
  })
  it('activates v2 only on wizard-set levels', () => {
    expect(shouldUseV2([{ set_by_wizard: false }, { set_by_wizard: true }])).toBe(true)
    expect(shouldUseV2([])).toBe(false)
  })
})
```

- [ ] **Step 2: RED.** **Step 3: Implement** `prepare-v2.ts` + the three wiring edits + `PrepareResult` optional fields. **Step 4: GREEN + full suite + build** (`npm test`, `npm run build` — both clean; `npx tsc --noEmit` at repo root unchanged vs baseline). **Step 5: Commit** `feat(worker): v2 generation path behind set_by_wizard gate with prebuilt sessions`.

---

### Task 8: Edge-function dead copies + closing verification

**Files:**
- Possibly delete: `supabase/functions/generate-trainings-plan/prompts.ts`, `supabase/functions/generate-trainings-plan/schemas.ts`, `supabase/functions/generate-trainings-plan/helpers/` (only if verified unused)

**Interfaces:** none — cleanup + verification.

- [ ] **Step 1: Verify the copies are dead**

```bash
grep -rn "prompts\|schemas\|helpers" supabase/functions/generate-trainings-plan/index.ts
grep -rln "generate-trainings-plan/prompts\|generate-trainings-plan/schemas" supabase/ web/ app/ externals/ --include="*.ts" | grep -v functions/generate-trainings-plan
```
Expected: no imports anywhere. If ANY hit appears, STOP — keep the files, ledger the finding, and skip Step 2.

- [ ] **Step 2: Delete the dead copies** (only on a clean Step 1) — `git rm` the unused files; the edge function keeps `index.ts` + `deno.json`.
- [ ] **Step 3: Closing verification** — `npm test` (worker, all green), `npm run build` (worker), `npx tsc --noEmit` at repo root (baseline unchanged). Expected outputs recorded.
- [ ] **Step 4: Commit** `chore: remove dead edge-function generator copies; phase 2b closing verification`
