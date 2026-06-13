# Admin Plan Accordion & Session Detail

**Date:** 2026-06-11
**Status:** Approved

## Overview

Extends the existing admin user detail page with two features:
1. **Plan accordion** — the PlanSection becomes an interactive accordion showing the plan template structure (sessions → blocks → exercises with targets). Replaces the current flat session table.
2. **Session detail page** — clicking "Details →" on a completed session opens `/admin/users/[id]/sessions/[sessionId]` showing performed sets per exercise.

---

## Feature 1: Plan Accordion

### Data Source

Uses **plan template data** (`workout_plan_sessions`), not executed sessions. This ensures all sessions are visible regardless of execution status.

Additionally loads executed `workout_sessions` (id + workout_plan_session_id + status only) to:
- Show per-session execution status badges
- Provide the `sessionId` for the "Details →" link on completed sessions

### PlanSection changes

`web/app/admin/users/_components/PlanSection.tsx` becomes `'use client'`.

**Accordion row (closed):**
- Session name
- Wochentag (mapped from `day_of_week`: 1=Mo, 2=Di, …, 7=So)
- Typ (training / recovery)
- Geschätzte Dauer (`estimated_duration_minutes` min)
- Status badge from matched `workout_session.status` (completed ✅ / in_progress 🔄 / scheduled ⏳ / skipped/cancelled ❌ / not started —)
- Chevron icon (▶ / ▼)

**Accordion row (expanded):**
- Per block in `order_index` order:
  - Block-type label (from `block_types.slug` → display name, e.g. `warm_up` → "Warm-Up")
  - Per exercise in `order_index` order:
    - Exercise name
    - Sets × Reps range (e.g. `3 × 8–12`; if only one value: `3 × 10`)
    - Load info: `target_load_value target_load_type` (e.g. `70 % 1RM`, `80 kg`, `RPE 8`); omitted if null
    - Duration (if `target_duration_seconds` set, e.g. `30s`)
- "Details →" link (only if a completed `workout_session` exists for this plan session)

**Accordion state:** `useState<string | null>` — stores the currently open `workout_plan_session_id`. One session open at a time.

### New server action: `fetchUserPlanStructure`

```typescript
// web/app/actions/users.ts
fetchUserPlanStructure(planId: string): Promise<PlanStructure | null>

type PlanStructure = {
  planSessions: PlanSessionWithBlocks[]
}

type PlanSessionWithBlocks = {
  id: string
  name: string
  day_of_week: number
  session_type: string
  estimated_duration_minutes: number | null
  order_index: number
  blocks: PlanBlock[]
}

type PlanBlock = {
  id: string
  order_index: number
  block_type_slug: string | null  // e.g. 'warm_up', 'main', 'cool_down'
  exercises: PlanExercise[]
}

type PlanExercise = {
  id: string
  order_index: number
  exercise_name: string
  target_sets: number | null
  target_reps_min: number | null
  target_reps_max: number | null
  target_load_type: string | null
  target_load_value: number | null
  target_duration_seconds: number | null
}
```

Supabase query:
```typescript
supabase
  .from('workout_plan_sessions')
  .select(`
    id, name, day_of_week, session_type, estimated_duration_minutes, order_index,
    workout_plan_session_blocks(
      id, order_index,
      block_type:block_types(slug),
      workout_plan_session_block_exercises(
        id, order_index,
        target_sets, target_reps_min, target_reps_max,
        target_load_type, target_load_value, target_duration_seconds,
        exercise:exercises(name)
      )
    )
  `)
  .eq('plan_id', planId)
  .order('order_index')
```

### Changes to `fetchUserActivePlan`

Add a second query to also return executed session stubs:

```typescript
// Added to UserActivePlan type:
executedSessions: { id: string; workout_plan_session_id: string | null; status: string }[]
```

Fetched alongside the existing sessions query (already queries `workout_sessions`). The existing `sessions: WorkoutSessionRow[]` field is kept for backward compatibility but PlanSection will primarily use `executedSessions` for status lookup.

### Changes to `[id]/page.tsx`

Add `fetchUserPlanStructure(plan.id)` to the `Promise.all`:

```typescript
const [profile, plan, planStructure] = await Promise.all([
  fetchUserProfile(id),
  fetchUserActivePlan(id),
  plan ? fetchUserPlanStructure(plan.id) : Promise.resolve(null),
])
```

Since `plan` is not known until `fetchUserActivePlan` resolves, `fetchUserPlanStructure` runs after. Acceptable — plan fetch is fast.

Actually: fetch plan first, then structure in sequence. Or pass planId optimistically. **Simplified approach:** fetch profile and plan in parallel, then fetch structure if plan exists. Two round-trips maximum.

Pass `planStructure` and `plan.executedSessions` as props to `<PlanSection>`.

---

## Feature 2: Session Detail Page

### Route

`web/app/admin/users/[id]/sessions/[sessionId]/page.tsx`

### Layout

**Header:**
- "← Zurück" link to `/admin/users/[id]`
- Session name
- Status badge
- Date: `scheduled_at` formatted
- Dauer: `started_at` → `completed_at` in minutes (if both set)

**Per block (in order_index):**
- Block-type label as section header
- Dynamic table of exercises with performed sets:

**Columns shown** (only include column if ≥1 set has a non-null value for that field):
- Übung (always shown)
- Set (always shown, set_number)
- Wdh (`performed_reps`)
- Last (`performed_load_value` + load unit from target)
- RPE (`performed_rpe`)
- Dauer (`performed_duration_seconds` → formatted as `30s`)
- Distanz (`performed_distance_meters`)

**For sessions without performed sets** (in_progress or completed without data): show `workout_session_block_exercises` target values instead, with a note "Keine performed Sets vorhanden."

### New server action: `fetchSessionDetail`

```typescript
fetchSessionDetail(sessionId: string): Promise<SessionDetail | null>

type SessionDetail = {
  id: string
  name: string
  status: string
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  blocks: SessionDetailBlock[]
}

type SessionDetailBlock = {
  id: string
  order_index: number
  block_type_slug: string | null
  exercises: SessionDetailExercise[]
}

type SessionDetailExercise = {
  id: string
  order_index: number
  exercise_name: string
  target_sets: number | null
  target_load_type: string | null
  performed_sets: PerformedSet[]
}

type PerformedSet = {
  set_number: number
  side: string | null
  performed_reps: number | null
  performed_load_value: number | null
  performed_rpe: number | null
  performed_duration_seconds: number | null
  performed_distance_meters: number | null
}
```

Supabase query:
```typescript
supabase
  .from('workout_sessions')
  .select(`
    id, name, status, scheduled_at, started_at, completed_at,
    workout_session_blocks(
      id, order_index,
      block_type:block_types(slug),
      workout_session_block_exercises(
        id, order_index,
        target_sets, target_load_type,
        exercise:exercises(name),
        workout_session_performed_sets(
          set_number, side,
          performed_reps, performed_load_value, performed_rpe,
          performed_duration_seconds, performed_distance_meters
        )
      )
    )
  `)
  .eq('id', sessionId)
  .single()
```

---

## Files Changed

| File | Change |
|---|---|
| `web/app/actions/users.ts` | Add `fetchUserPlanStructure`, `fetchSessionDetail`; extend `UserActivePlan` with `executedSessions` |
| `web/app/admin/users/_components/PlanSection.tsx` | Rewrite as `'use client'` accordion |
| `web/app/admin/users/[id]/page.tsx` | Add `fetchUserPlanStructure` call; pass new props to PlanSection |
| `web/app/admin/users/[id]/sessions/[sessionId]/page.tsx` | New page |

---

## Block Type Labels

```typescript
const BLOCK_TYPE_LABELS: Record<string, string> = {
  warm_up:   'Warm-Up',
  main:      'Hauptteil',
  cool_down: 'Cool-Down',
}
// Fallback: capitalize slug
```

## Day of Week Labels

```typescript
const DAY_LABELS: Record<number, string> = {
  1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So',
}
```

---

## Out of Scope

- Editing sessions or exercises
- Comparing target vs. performed in the accordion (only in detail page)
- Load history charts
- Multiple plans (only active plan shown)
