# Constrained Decoding via Per-Session Slug Enums — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `z.string()` slug fields in OpenAI response schemas with `z.enum([...actualSlugs])` built dynamically per API call, making slug hallucination structurally impossible.

**Architecture:** Add three builder functions to `schemas.ts` that accept slug arrays and return tight Zod schemas. Wire them into `generate-plan.ts` at the three OpenAI call sites (Phase A, C, D) using the slugs already available in scope at each call site. Static schema exports remain unchanged for other consumers.

**Tech Stack:** Deno, Zod (`npm:zod`), OpenAI SDK (`npm:openai`), `zodResponseFormat` helper

---

## File Map

| File | Change |
|------|--------|
| `supabase/functions/_shared/schemas.ts` | Add `toEnum` helper + `buildWeekPlanSchema`, `buildMainSessionSchema`, `buildWarmupCooldownSchema` |
| `supabase/functions/_shared/generate-plan.ts` | Import new builders, replace 3 `zodResponseFormat` call sites |

---

## Task 1: Add builder functions to `schemas.ts`

**Files:**
- Modify: `supabase/functions/_shared/schemas.ts`

- [ ] **Step 1: Add the `toEnum` helper and three builder functions**

Append the following to the bottom of `supabase/functions/_shared/schemas.ts`, before the `export { ... }` block:

```typescript
// ── Dynamic schema builders (per-call slug enums) ────────────

function toEnum(slugs: string[]): z.ZodEnum<[string, ...string[]]> | z.ZodString {
  const unique = [...new Set(slugs)].filter(Boolean)
  if (unique.length === 0) {
    console.warn("[schema] toEnum called with empty slug list — falling back to z.string()")
    return z.string()
  }
  return z.enum(unique as [string, ...string[]])
}

export function buildWeekPlanSchema(categorySlugs: string[]) {
  const categoryEnum = toEnum(categorySlugs)
  return z.object({
    name: z.string(),
    description: z.string(),
    sessions: z.array(z.object({
      day_of_week: z.number(),
      body_regions: z.array(bodyRegionEnum),
      blocks: z.array(z.object({
        block_type: z.enum(["primary", "secondary", "accessory"]),
        category_slug: categoryEnum,
      })),
    })),
  })
}

export function buildMainSessionSchema(exerciseSlugs: string[], categorySlugs: string[]) {
  const slugEnum = toEnum(exerciseSlugs)
  const categoryEnum = toEnum(categorySlugs)

  const dynExercise = z.object({
    exercise_slug: slugEnum,
    order_index: z.number(),
    notes: z.string(),
    target_sets: z.number(),
    target_reps_min: z.number(),
    target_reps_max: z.number(),
    target_duration_seconds: z.number(),
    target_distance_meters: z.number(),
    target_rest_seconds: z.number(),
    target_load_type: z.enum(["bodyweight", "kg", "rpe", "pace"]),
    target_load_value: z.number(),
  })

  const dynBlock = z.object({
    block_type: z.enum(["primary", "secondary", "accessory"]),
    order_index: z.number(),
    focused_category_slug: categoryEnum,
    exercises: z.array(dynExercise),
  })

  return z.object({
    name: z.string(),
    mode_slug: z.enum(["full", "reduced", "activation", "recovery"]),
    estimated_duration_minutes: z.number(),
    day_of_week: z.number(),
    order_index: z.number(),
    session_type: z.enum(["training", "recovery"]),
    description: z.string(),
    pause_between_sets: z.number(),
    blocks: z.array(dynBlock),
  })
}

export function buildWarmupCooldownSchema(
  warmupSlugs: string[],
  cooldownSlugs: string[],
  categorySlugs: string[],
) {
  const slugEnum = toEnum([...warmupSlugs, ...cooldownSlugs])
  const categoryEnum = toEnum(categorySlugs)

  const dynExercise = z.object({
    exercise_slug: slugEnum,
    order_index: z.number(),
    notes: z.string(),
    target_sets: z.number(),
    target_reps_min: z.number(),
    target_reps_max: z.number(),
    target_duration_seconds: z.number(),
    target_distance_meters: z.number(),
    target_rest_seconds: z.number(),
    target_load_type: z.enum(["bodyweight", "kg", "rpe", "pace"]),
    target_load_value: z.number(),
  })

  return z.object({
    blocks: z.array(z.object({
      block_type: z.enum(["warmup", "cooldown"]),
      order_index: z.number(),
      focused_category_slug: categoryEnum,
      exercises: z.array(dynExercise),
    })),
  })
}
```

- [ ] **Step 2: Add builders to the export block**

The existing export block at the bottom of `schemas.ts` looks like:
```typescript
export {
  blockSchema,
  exerciseSchema,
  mainSessionSchema,
  planSchema,
  sessionSchema,
  warmupCooldownSchema,
  weekPlanSchema,
}
```

The three new builder functions are already exported inline (`export function ...`), so no change to this block is needed. Verify the file still has all original exports.

- [ ] **Step 3: Type-check the file**

```bash
cd /Users/leonardogranetto/Projects/jemp
deno check supabase/functions/_shared/schemas.ts --import-map supabase/functions/generate-trainings-plan/deno.json
```

Expected: no errors. If `deno check` fails with import resolution errors, run instead:
```bash
cd supabase/functions/generate-trainings-plan && deno check ../_shared/schemas.ts
```

---

## Task 2: Wire builders into `generate-plan.ts`

**Files:**
- Modify: `supabase/functions/_shared/generate-plan.ts`

### Step 2a — Update import

- [ ] **Step 1: Add the three builders to the import from `./schemas.ts`**

Find the existing import (line ~6):
```typescript
import { mainSessionSchema, sessionSchema, warmupCooldownSchema, weekPlanSchema } from "./schemas.ts"
```

Replace with:
```typescript
import { buildMainSessionSchema, buildWarmupCooldownSchema, buildWeekPlanSchema, mainSessionSchema, sessionSchema, warmupCooldownSchema, weekPlanSchema } from "./schemas.ts"
```

(The static schemas remain imported — they're still used for the TypeScript type assertions on parsed results.)

### Step 2b — Phase A: dynamic weekPlanSchema

- [ ] **Step 2: Build `dynamicWeekPlanSchema` before the Phase A OpenAI call**

Find the Phase A block (around line 285–304). Before the `openai.chat.completions.create` call for `weekPlanCompletion`, insert:

```typescript
const dynamicWeekPlanSchema = buildWeekPlanSchema(categorySlugs)
```

The variable `categorySlugs` is already in scope at line 149:
```typescript
const categorySlugs = sport_required_categories.map((c) => c.category)
```

- [ ] **Step 3: Replace `weekPlanSchema` with `dynamicWeekPlanSchema` in the Phase A call**

Find:
```typescript
    response_format: zodResponseFormat(weekPlanSchema, "data"),
```

Replace with:
```typescript
    response_format: zodResponseFormat(dynamicWeekPlanSchema, "data"),
```

### Step 2c — Phase C: dynamic mainSessionSchema (per session)

- [ ] **Step 4: Build `dynamicMainSchema` per session inside the `sessionBuildInputs.map()` callback**

Find the Phase C block inside the `Promise.allSettled(sessionBuildInputs.map(async (si, i) => {` callback (around line 413). Before the `mainCompletion` call, insert:

```typescript
      const sessionExerciseSlugs = [...new Set(
        si.blockPools.flatMap(p => p.slugs.split(",").map(s => s.trim()).filter(Boolean))
      )]
      const sessionCategorySlugs = [...new Set(si.blockPools.map(p => p.category_slug))]
      const dynamicMainSchema = buildMainSessionSchema(sessionExerciseSlugs, sessionCategorySlugs)
```

- [ ] **Step 5: Replace `mainSessionSchema` with `dynamicMainSchema` in the Phase C call**

Find:
```typescript
        response_format: zodResponseFormat(mainSessionSchema, "data"),
```

Replace with:
```typescript
        response_format: zodResponseFormat(dynamicMainSchema, "data"),
```

The JSON.parse type assertion on line ~440 stays unchanged:
```typescript
const mainSession = JSON.parse(mainChoice.message.content!) as z.infer<typeof mainSessionSchema>
```
This is safe — the dynamic schema's inferred type is a structural subtype of `mainSessionSchema`'s type (enum literals are assignable to string).

### Step 2d — Phase D: dynamic warmupCooldownSchema (per session)

- [ ] **Step 6: Build `dynamicWcSchema` per session inside the same callback, before the Phase D call**

Find the Phase D block (around line 453, the `wcCompletion` call). Before it, insert:

```typescript
      const warmupSlugsList = si.warmupSlugs.split(",").map(s => s.trim()).filter(Boolean)
      const cooldownSlugsList = si.cooldownSlugs.split(",").map(s => s.trim()).filter(Boolean)
      const wcCategorySlugs = [...new Set([...si.warmupCategorySlugs, ...si.cooldownCategorySlugs])]
      const dynamicWcSchema = buildWarmupCooldownSchema(warmupSlugsList, cooldownSlugsList, wcCategorySlugs)
```

- [ ] **Step 7: Replace `warmupCooldownSchema` with `dynamicWcSchema` in the Phase D call**

Find:
```typescript
        response_format: zodResponseFormat(warmupCooldownSchema, "data"),
```

Replace with:
```typescript
        response_format: zodResponseFormat(dynamicWcSchema, "data"),
```

The JSON.parse type assertion below stays unchanged:
```typescript
const parsed = JSON.parse(wcChoice.message.content) as z.infer<typeof warmupCooldownSchema>
```

- [ ] **Step 8: Type-check the full generate-plan.ts**

```bash
cd supabase/functions/generate-trainings-plan && deno check ../_shared/generate-plan.ts
```

Expected: no errors.

If you see errors about `zodResponseFormat` argument type mismatch (dynamic schema type vs static schema type), the fix is to add `as Parameters<typeof zodResponseFormat>[0]` cast on the dynamic schema:

```typescript
response_format: zodResponseFormat(dynamicMainSchema as Parameters<typeof zodResponseFormat>[0], "data"),
```
