# Constrained Decoding via Per-Session Slug Enums

**Date:** 2026-06-13  
**Scope:** `supabase/functions/_shared/schemas.ts`, `supabase/functions/_shared/generate-plan.ts`

## Problem

All slug fields in OpenAI response schemas are currently `z.string()`. The model can invent slugs that don't exist in the DB (e.g. `seated_hamstring_static_release`), causing silent insert failures or runtime errors downstream.

Affected fields:
- `exercise_slug` in `exerciseSchema`
- `focused_category_slug` in `blockSchema`
- `category_slug` in `weekPlanSchema`

Fields already correctly typed as enums (no change needed):
- `block_type`, `target_load_type`, `mode_slug`, `session_type`

## Solution

Build Zod schemas dynamically from real DB data — per call, not globally — so the set of valid slugs exactly matches what was shown to the model in that prompt. Slug invention becomes structurally impossible via OpenAI's structured output enforcement.

## Architecture

### New builder functions in `schemas.ts`

Three exported functions replace the static schema exports used in `generate-plan.ts`:

```
buildWeekPlanSchema(categorySlugs: string[]) → ZodObject
buildMainSessionSchema(exerciseSlugs: string[], categorySlugs: string[]) → ZodObject
buildWarmupCooldownSchema(warmupSlugs: string[], cooldownSlugs: string[], categorySlugs: string[]) → ZodObject
```

Internally each function calls a shared helper:

```
toEnum(slugs: string[]): ZodEnum | ZodString
  → slugs.length >= 1 ? z.enum(slugs as [string, ...string[]]) : z.string()
```

The `z.string()` fallback with a `console.warn` handles the empty-pool edge case gracefully without crashing.

### Call sites in `generate-plan.ts`

| Phase | Schema built from | Called |
|-------|-------------------|--------|
| A — `weekPlanCompletion` | `categorySlugs` (from `sport_required_categories`, known before DB fetch) | Once, before Phase A |
| C — `mainCompletion` per session | Union of all slug strings across `si.blockPools` + their category slugs | Inside `sessionBuildInputs.map()` |
| D — `wcCompletion` per session | `si.warmupSlugs` + `si.cooldownSlugs` (comma-split) + `si.warmupCategorySlugs` + `si.cooldownCategorySlugs` | Inside same map, after Phase C |

### Slug sources (per session)

**Phase C `exerciseSlugs`:**
```
si.blockPools.flatMap(p => p.slugs.split(",").map(s => s.trim()).filter(Boolean))
```
→ Union of all pool slugs across all blocks of the session.

**Phase C `categorySlugs`:**
```
si.blockPools.map(p => p.category_slug)
```

**Phase D `warmupSlugs` / `cooldownSlugs`:**
```
si.warmupSlugs.split(",").map(s => s.trim()).filter(Boolean)
si.cooldownSlugs.split(",").map(s => s.trim()).filter(Boolean)
```

**Phase D `categorySlugs`:**
```
[...si.warmupCategorySlugs, ...si.cooldownCategorySlugs]
```

### `focused_category_slug` scope

The enum covers all category slugs present in the session's pools (union). This is per-session but not per-block — the model could theoretically assign a secondary block's category to a primary block. This is acceptable: the prompt already enforces correct category assignment, and the enum still prevents fully hallucinated categories.

## What stays the same

- Static schema exports (`sessionSchema`, `planSchema`, etc.) remain for any other consumers.
- `weekPlanSchema` shape is unchanged — only `category_slug` becomes an enum.
- No prompt changes required.
- No DB query changes required.

## Edge cases

- **Empty pool:** `toEnum([])` returns `z.string()` + `console.warn`. Should never happen in practice (Phase B already logs empty pools).
- **Duplicate slugs in union:** Deduplicated via `[...new Set(slugs)]` before passing to `toEnum`.
- **`z.enum` requires non-empty tuple:** Handled by `toEnum` helper.
