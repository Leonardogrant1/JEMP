# Admin Plan Accordion & Session Detail — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the admin user detail page with an interactive plan accordion (sessions → blocks → exercises with targets) and a new session detail page showing performed sets.

**Architecture:** Four tasks in sequence: (1) extend `web/app/actions/users.ts` with two new server actions and an updated type, (2) rewrite `PlanSection.tsx` as a `'use client'` accordion, (3) update the detail page to fetch plan structure and pass new props, (4) create the `[sessionId]` page. No new files are created beyond the session detail page — everything else is in-place modification.

**Tech Stack:** Next.js 15 App Router (async params), Supabase PostgREST nested select, React `useState`, Tailwind CSS dark theme, TypeScript.

---

## File Map

| File | Change |
|---|---|
| `web/app/actions/users.ts` | Add `PlanStructure` types + `fetchUserPlanStructure`, extend `UserActivePlan` with `executedSessions`, update `fetchUserActivePlan`, add `SessionDetail` types + `fetchSessionDetail` |
| `web/app/admin/users/_components/PlanSection.tsx` | Full rewrite as `'use client'` accordion |
| `web/app/admin/users/[id]/page.tsx` | Add `fetchUserPlanStructure` call, pass `planStructure` + `userId` to `<PlanSection>` |
| `web/app/admin/users/[id]/sessions/[sessionId]/page.tsx` | New page — session detail with performed sets |

---

## Task 1: Server Actions

**Files:**
- Modify: `web/app/actions/users.ts`

> **Context:** This file already contains `getUsers`, `fetchUserProfile`, `fetchUserActivePlan`, and their types. The auth pattern is: call `await requireAdmin()` at the start of every exported function. The Supabase client is imported as `supabase` from `@/lib/supabase`. i18n fields use `asI18n()` from `@/lib/i18n`. All `as any` casts are fine here — the Supabase type inference for nested selects is unreliable.

- [ ] **Step 1: Add plan structure types to `users.ts`**

Open `web/app/actions/users.ts`. After the closing brace of `UserActivePlan` (currently at line ~96), add:

```typescript
// ─── Plan structure types ─────────────────────────────────────

export type PlanExercise = {
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

export type PlanBlock = {
  id: string
  order_index: number
  block_type_slug: string | null
  exercises: PlanExercise[]
}

export type PlanSessionWithBlocks = {
  id: string
  name: string
  day_of_week: number
  session_type: string
  estimated_duration_minutes: number | null
  order_index: number
  blocks: PlanBlock[]
}

export type PlanStructure = {
  planSessions: PlanSessionWithBlocks[]
}

// ─── Session detail types ─────────────────────────────────────

export type PerformedSet = {
  set_number: number
  side: string | null
  performed_reps: number | null
  performed_load_value: number | null
  performed_rpe: number | null
  performed_duration_seconds: number | null
  performed_distance_meters: number | null
}

export type SessionDetailExercise = {
  id: string
  order_index: number
  exercise_name: string
  target_sets: number | null
  target_load_type: string | null
  performed_sets: PerformedSet[]
}

export type SessionDetailBlock = {
  id: string
  order_index: number
  block_type_slug: string | null
  exercises: SessionDetailExercise[]
}

export type SessionDetail = {
  id: string
  name: string
  status: string
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  blocks: SessionDetailBlock[]
}
```

- [ ] **Step 2: Extend `UserActivePlan` with `executedSessions`**

In the same file, find `UserActivePlan` (currently ending at line ~96). Add the new field:

```typescript
export type UserActivePlan = {
  id: string
  name: string
  status: string
  duration_weeks: number
  start_date: string
  end_date: string
  completedCount: number
  totalCount: number
  sessions: WorkoutSessionRow[]
  executedSessions: { id: string; workout_plan_session_id: string | null; status: string }[]
}
```

- [ ] **Step 3: Update `fetchUserActivePlan` to also fetch executed session stubs**

Find the `fetchUserActivePlan` function. After the existing sessions query (currently ending at ~line 241), add a second query and extend the return value:

```typescript
export async function fetchUserActivePlan(userId: string): Promise<UserActivePlan | null> {
  await requireAdmin()

  const { data: plan, error: planError } = await supabase
    .from('workout_plans')
    .select('id, name, status, duration_weeks, start_date, end_date')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (planError && planError.code === 'PGRST116') return null
  if (planError) throw new Error(planError.message)
  if (!plan) return null

  const [{ data: sessions, error: sessionsError }, { data: execSessions, error: execError }] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('id, name, session_type, status, scheduled_at, completed_at')
      .eq('workout_plan_id', plan.id)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('workout_sessions')
      .select('id, workout_plan_session_id, status')
      .eq('workout_plan_id', plan.id),
  ])

  if (sessionsError) throw new Error(sessionsError.message)
  if (execError) throw new Error(execError.message)

  const allSessions: WorkoutSessionRow[] = (sessions ?? []).map(s => ({
    id: s.id,
    name: s.name,
    session_type: s.session_type,
    status: s.status,
    scheduled_at: s.scheduled_at,
    completed_at: s.completed_at,
  }))

  const executedSessions = (execSessions ?? []).map((s: any) => ({
    id: s.id,
    workout_plan_session_id: s.workout_plan_session_id,
    status: s.status,
  }))

  return {
    id: plan.id,
    name: plan.name,
    status: plan.status,
    duration_weeks: plan.duration_weeks,
    start_date: plan.start_date,
    end_date: plan.end_date,
    completedCount: allSessions.filter(s => s.status === 'completed').length,
    totalCount: allSessions.length,
    sessions: allSessions,
    executedSessions,
  }
}
```

- [ ] **Step 4: Add `fetchUserPlanStructure` server action**

Append after the closing of `fetchUserActivePlan`:

```typescript
// ─── fetchUserPlanStructure ───────────────────────────────────

export async function fetchUserPlanStructure(planId: string): Promise<PlanStructure | null> {
  await requireAdmin()

  const { data, error } = await supabase
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

  if (error) throw new Error(error.message)
  if (!data) return null

  const planSessions: PlanSessionWithBlocks[] = (data as any[]).map(session => ({
    id: session.id,
    name: session.name,
    day_of_week: session.day_of_week,
    session_type: session.session_type,
    estimated_duration_minutes: session.estimated_duration_minutes,
    order_index: session.order_index,
    blocks: (session.workout_plan_session_blocks ?? [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((block: any) => ({
        id: block.id,
        order_index: block.order_index,
        block_type_slug: block.block_type?.slug ?? null,
        exercises: (block.workout_plan_session_block_exercises ?? [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((ex: any) => ({
            id: ex.id,
            order_index: ex.order_index,
            exercise_name: ex.exercise?.name ?? '—',
            target_sets: ex.target_sets,
            target_reps_min: ex.target_reps_min,
            target_reps_max: ex.target_reps_max,
            target_load_type: ex.target_load_type,
            target_load_value: ex.target_load_value,
            target_duration_seconds: ex.target_duration_seconds,
          })),
      })),
  }))

  return { planSessions }
}
```

- [ ] **Step 5: Add `fetchSessionDetail` server action**

Append after `fetchUserPlanStructure`:

```typescript
// ─── fetchSessionDetail ───────────────────────────────────────

export async function fetchSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  await requireAdmin()

  const { data, error } = await supabase
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

  if (error && error.code === 'PGRST116') return null
  if (error) throw new Error(error.message)
  if (!data) return null

  const d = data as any

  const blocks: SessionDetailBlock[] = (d.workout_session_blocks ?? [])
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((block: any) => ({
      id: block.id,
      order_index: block.order_index,
      block_type_slug: block.block_type?.slug ?? null,
      exercises: (block.workout_session_block_exercises ?? [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((ex: any) => ({
          id: ex.id,
          order_index: ex.order_index,
          exercise_name: ex.exercise?.name ?? '—',
          target_sets: ex.target_sets,
          target_load_type: ex.target_load_type,
          performed_sets: (ex.workout_session_performed_sets ?? [])
            .sort((a: any, b: any) => a.set_number - b.set_number)
            .map((set: any) => ({
              set_number: set.set_number,
              side: set.side,
              performed_reps: set.performed_reps,
              performed_load_value: set.performed_load_value,
              performed_rpe: set.performed_rpe,
              performed_duration_seconds: set.performed_duration_seconds,
              performed_distance_meters: set.performed_distance_meters,
            })),
        })),
    }))

  return {
    id: d.id,
    name: d.name,
    status: d.status,
    scheduled_at: d.scheduled_at,
    started_at: d.started_at,
    completed_at: d.completed_at,
    blocks,
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If Supabase complains about unknown columns in the select string, verify column names exist by checking `web/lib/database.types.ts` (or equivalent generated types file). Common issue: `workout_plan_session_id` may not exist on `workout_sessions` — if missing, skip that field and remove `executedSessions` from the parallel query; instead filter `sessions` where `workout_plan_session_id` is set.

- [ ] **Step 7: Commit**

```bash
cd /Users/leonardogranetto/Projects/jemp && git add web/app/actions/users.ts && git commit -m "feat: add fetchUserPlanStructure, fetchSessionDetail; extend UserActivePlan with executedSessions"
```

---

## Task 2: Rewrite PlanSection as Client Accordion

**Files:**
- Modify: `web/app/admin/users/_components/PlanSection.tsx`

> **Context:** Currently a plain Server Component that renders a flat session table. Rewrite it entirely as a `'use client'` component. The new component receives three props: `plan` (same `UserActivePlan` type, now extended with `executedSessions`), `planStructure` (the new `PlanStructure` type), and `userId` (string, needed for the "Details →" link). Keep the plan header section identical to the current version.

- [ ] **Step 1: Replace the entire file**

Replace `web/app/admin/users/_components/PlanSection.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { UserActivePlan, PlanStructure } from '@/app/actions/users'

// ─── Constants ────────────────────────────────────────────────

const BLOCK_TYPE_LABELS: Record<string, string> = {
  warm_up:   'Warm-Up',
  main:      'Hauptteil',
  cool_down: 'Cool-Down',
}

const DAY_LABELS: Record<number, string> = {
  1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So',
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function blockTypeLabel(slug: string | null): string {
  if (!slug) return 'Block'
  return BLOCK_TYPE_LABELS[slug] ?? slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatReps(min: number | null, max: number | null): string {
  if (min == null && max == null) return '—'
  if (min === max || max == null) return String(min ?? max)
  if (min == null) return String(max)
  return `${min}–${max}`
}

function formatLoad(value: number | null, type: string | null): string | null {
  if (value == null || type == null) return null
  switch (type) {
    case 'percentage_1rm': return `${value} % 1RM`
    case 'kg':             return `${value} kg`
    case 'rpe':            return `RPE ${value}`
    default:               return `${value} ${type}`
  }
}

// ─── Sub-components ──────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed:   { label: '✅ Abgeschlossen', className: 'text-green-400' },
    in_progress: { label: '🔄 In Bearbeitung', className: 'text-yellow-400' },
    scheduled:   { label: '⏳ Geplant',        className: 'text-gray-400' },
    skipped:     { label: '❌ Übersprungen',   className: 'text-red-400' },
    cancelled:   { label: '❌ Abgebrochen',    className: 'text-red-400' },
  }
  const c = config[status] ?? { label: status, className: 'text-gray-400' }
  return <span className={`text-xs ${c.className}`}>{c.label}</span>
}

// ─── PlanSection ─────────────────────────────────────────────

type ExecutedSession = { id: string; workout_plan_session_id: string | null; status: string }

export function PlanSection({
  plan,
  planStructure,
  userId,
}: {
  plan: UserActivePlan | null
  planStructure: PlanStructure | null
  userId: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (!plan) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-5">Trainingsplan</h2>
        <p className="text-sm text-gray-500">Kein aktiver Plan vorhanden.</p>
      </div>
    )
  }

  // Build lookup: plan_session_id → executed session stub
  const execByPlanSessionId = new Map<string, ExecutedSession>()
  for (const es of plan.executedSessions) {
    if (es.workout_plan_session_id) {
      execByPlanSessionId.set(es.workout_plan_session_id, es)
    }
  }

  const planSessions = planStructure?.planSessions ?? []

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-5">Trainingsplan</h2>

      {/* Plan header */}
      <div className="flex flex-wrap items-start gap-6 mb-5 pb-5 border-b border-gray-800">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Name</p>
          <p className="text-sm font-medium">{plan.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Status</p>
          <p className="text-xs text-green-400">{plan.status}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Zeitraum</p>
          <p className="text-xs">{formatDate(plan.start_date)} – {formatDate(plan.end_date)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Dauer</p>
          <p className="text-xs">{plan.duration_weeks} Wochen</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Fortschritt</p>
          <p className="text-xs">{plan.completedCount} / {plan.totalCount} Sessions</p>
        </div>
      </div>

      {/* Accordion */}
      {planSessions.length === 0 ? (
        <p className="text-xs text-gray-500">Keine Planstruktur verfügbar.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-900">
          {planSessions.map(session => {
            const execSession = execByPlanSessionId.get(session.id)
            const isOpen = openId === session.id

            return (
              <div key={session.id}>
                {/* Accordion row (closed) */}
                <button
                  onClick={() => setOpenId(isOpen ? null : session.id)}
                  className="w-full flex items-center gap-4 py-3 text-left hover:bg-gray-900/40 transition-colors px-2 rounded"
                >
                  <span className="text-[11px] text-gray-500 w-6 shrink-0">
                    {DAY_LABELS[session.day_of_week] ?? '—'}
                  </span>
                  <span className="text-xs flex-1 font-medium">{session.name}</span>
                  <span className="text-xs text-gray-500 hidden sm:block">
                    {session.session_type ?? '—'}
                  </span>
                  {session.estimated_duration_minutes != null && (
                    <span className="text-xs text-gray-500 hidden sm:block">
                      {session.estimated_duration_minutes} min
                    </span>
                  )}
                  {execSession ? (
                    <StatusBadge status={execSession.status} />
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                  <span className="text-gray-500 text-[10px] ml-1 shrink-0">
                    {isOpen ? '▼' : '▶'}
                  </span>
                </button>

                {/* Accordion row (expanded) */}
                {isOpen && (
                  <div className="pl-10 pr-2 pb-5 flex flex-col gap-5">
                    {session.blocks.map(block => (
                      <div key={block.id}>
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-2">
                          {blockTypeLabel(block.block_type_slug)}
                        </p>
                        <table className="w-full">
                          <tbody>
                            {block.exercises.map(ex => {
                              const repsStr = formatReps(ex.target_reps_min, ex.target_reps_max)
                              const loadStr = formatLoad(ex.target_load_value, ex.target_load_type)
                              return (
                                <tr key={ex.id} className="border-b border-gray-900 last:border-0">
                                  <td className="py-1.5 pr-4 text-xs">{ex.exercise_name}</td>
                                  <td className="py-1.5 pr-4 text-xs text-gray-400">
                                    {ex.target_sets != null
                                      ? `${ex.target_sets} × ${repsStr}`
                                      : '—'}
                                  </td>
                                  <td className="py-1.5 pr-4 text-xs text-gray-400">
                                    {loadStr ?? ''}
                                  </td>
                                  <td className="py-1.5 text-xs text-gray-400">
                                    {ex.target_duration_seconds != null
                                      ? `${ex.target_duration_seconds}s`
                                      : ''}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}

                    {execSession?.status === 'completed' && (
                      <div>
                        <Link
                          href={`/admin/users/${userId}/sessions/${execSession.id}`}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Details →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors. If you see `Property 'executedSessions' does not exist on type 'UserActivePlan'`, Task 1 Step 2 was not saved correctly — re-check the type definition.

- [ ] **Step 3: Commit**

```bash
cd /Users/leonardogranetto/Projects/jemp && git add web/app/admin/users/_components/PlanSection.tsx && git commit -m "feat: rewrite PlanSection as client accordion with plan template structure"
```

---

## Task 3: Update Detail Page to Fetch Plan Structure

**Files:**
- Modify: `web/app/admin/users/[id]/page.tsx`

> **Context:** Currently fetches `profile` and `plan` in parallel. `PlanSection` now needs two additional props: `planStructure` and `userId`. `fetchUserPlanStructure` requires the plan's `id`, which is not known until `fetchUserActivePlan` resolves — so the structure fetch is a second sequential round-trip after the parallel profile+plan fetch. This is acceptable since the plan fetch is fast.

- [ ] **Step 1: Replace the file**

Replace `web/app/admin/users/[id]/page.tsx` with:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchUserProfile, fetchUserActivePlan, fetchUserPlanStructure } from '@/app/actions/users'
import { ProfileSection } from '../_components/ProfileSection'
import { PlanSection } from '../_components/PlanSection'
import { SubscriptionSection, SubscriptionSkeleton } from '../_components/SubscriptionSection'

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [profile, plan] = await Promise.all([
    fetchUserProfile(id),
    fetchUserActivePlan(id),
  ])

  if (!profile) notFound()

  const planStructure = plan ? await fetchUserPlanStructure(plan.id) : null

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div>
        <Link href="/admin/users" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Alle User
        </Link>
        <h1 className="text-xl font-semibold mt-2">{displayName}</h1>
        <p className="text-xs text-gray-500 mt-0.5 font-mono">{id}</p>
      </div>

      {/* Profile */}
      <ProfileSection profile={profile} />

      {/* Plan */}
      <PlanSection plan={plan} planStructure={planStructure} userId={id} />

      {/* Subscription (independent Suspense) */}
      <Suspense fallback={<SubscriptionSkeleton />}>
        <SubscriptionSection userId={id} />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/leonardogranetto/Projects/jemp && git add web/app/admin/users/[id]/page.tsx && git commit -m "feat: fetch plan structure on user detail page and pass to PlanSection"
```

---

## Task 4: Session Detail Page

**Files:**
- Create: `web/app/admin/users/[id]/sessions/[sessionId]/page.tsx`

> **Context:** This page is reached by clicking "Details →" in the PlanSection accordion. It receives `id` (user id) and `sessionId` from params. It calls `fetchSessionDetail(sessionId)` and displays performed sets grouped by block. Columns are dynamic: only show a column if at least one performed set across all exercises in a block has a non-null value for that field. If an exercise has no performed sets, show a note instead. Both params are Promises in Next.js 15.

- [ ] **Step 1: Create the directory and file**

Create `web/app/admin/users/[id]/sessions/[sessionId]/page.tsx` with:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchSessionDetail } from '@/app/actions/users'
import type { SessionDetailBlock, PerformedSet } from '@/app/actions/users'

// ─── Constants ────────────────────────────────────────────────

const BLOCK_TYPE_LABELS: Record<string, string> = {
  warm_up:   'Warm-Up',
  main:      'Hauptteil',
  cool_down: 'Cool-Down',
}

// ─── Helpers ─────────────────────────────────────────────────

function blockTypeLabel(slug: string | null): string {
  if (!slug) return 'Block'
  return BLOCK_TYPE_LABELS[slug] ?? slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDuration(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '—'
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  return `${mins} min`
}

function formatLoadValue(value: number | null, loadType: string | null): string {
  if (value == null) return '—'
  if (loadType === 'percentage_1rm') return `${value} %`
  if (loadType === 'kg') return `${value} kg`
  if (loadType === 'rpe') return `${value}`
  return String(value)
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed:   '✅ Abgeschlossen',
    in_progress: '🔄 In Bearbeitung',
    scheduled:   '⏳ Geplant',
    skipped:     '❌ Übersprungen',
    cancelled:   '❌ Abgebrochen',
  }
  return labels[status] ?? status
}

// ─── Dynamic column detection ─────────────────────────────────

type ColumnKey = 'reps' | 'load' | 'rpe' | 'duration' | 'distance'

function detectColumns(sets: PerformedSet[]): Set<ColumnKey> {
  const active = new Set<ColumnKey>()
  for (const s of sets) {
    if (s.performed_reps != null)             active.add('reps')
    if (s.performed_load_value != null)        active.add('load')
    if (s.performed_rpe != null)              active.add('rpe')
    if (s.performed_duration_seconds != null) active.add('duration')
    if (s.performed_distance_meters != null)  active.add('distance')
  }
  return active
}

// ─── Block table ──────────────────────────────────────────────

function BlockTable({ block }: { block: SessionDetailBlock }) {
  // Collect all performed sets from this block to determine visible columns
  const allSets = block.exercises.flatMap(ex => ex.performed_sets)
  const cols = detectColumns(allSets)
  const hasPerformedData = allSets.length > 0

  const thClass = 'pb-2 pr-4 font-medium text-xs text-left text-gray-400'
  const tdClass = 'py-1.5 pr-4 text-xs'

  return (
    <div className="mb-6">
      <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-3">
        {blockTypeLabel(block.block_type_slug)}
      </p>

      {!hasPerformedData ? (
        <p className="text-xs text-gray-500 italic">Keine performed Sets vorhanden.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className={thClass}>Übung</th>
              <th className={thClass}>Set</th>
              {cols.has('reps')     && <th className={thClass}>Wdh</th>}
              {cols.has('load')     && <th className={thClass}>Last</th>}
              {cols.has('rpe')      && <th className={thClass}>RPE</th>}
              {cols.has('duration') && <th className={thClass}>Dauer</th>}
              {cols.has('distance') && <th className={thClass}>Distanz</th>}
            </tr>
          </thead>
          <tbody>
            {block.exercises.map(ex =>
              ex.performed_sets.length === 0 ? null : ex.performed_sets.map((set, i) => (
                <tr key={`${ex.id}-${set.set_number}`} className="border-b border-gray-900 last:border-0">
                  <td className={tdClass}>
                    {i === 0 ? ex.exercise_name : ''}
                  </td>
                  <td className={`${tdClass} text-gray-400`}>{set.set_number}</td>
                  {cols.has('reps')     && (
                    <td className={`${tdClass} text-gray-300`}>{set.performed_reps ?? '—'}</td>
                  )}
                  {cols.has('load')     && (
                    <td className={`${tdClass} text-gray-300`}>
                      {formatLoadValue(set.performed_load_value, ex.target_load_type)}
                    </td>
                  )}
                  {cols.has('rpe')      && (
                    <td className={`${tdClass} text-gray-300`}>{set.performed_rpe ?? '—'}</td>
                  )}
                  {cols.has('duration') && (
                    <td className={`${tdClass} text-gray-300`}>
                      {set.performed_duration_seconds != null ? `${set.performed_duration_seconds}s` : '—'}
                    </td>
                  )}
                  {cols.has('distance') && (
                    <td className={`${tdClass} text-gray-300`}>
                      {set.performed_distance_meters != null ? `${set.performed_distance_meters} m` : '—'}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params

  const session = await fetchSessionDetail(sessionId)
  if (!session) notFound()

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href={`/admin/users/${id}`}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Zurück
        </Link>
        <h1 className="text-xl font-semibold mt-2">{session.name}</h1>
        <div className="flex flex-wrap gap-4 mt-2">
          <span className="text-xs text-gray-400">{statusLabel(session.status)}</span>
          <span className="text-xs text-gray-500">
            Datum: {formatDate(session.scheduled_at)}
          </span>
          <span className="text-xs text-gray-500">
            Dauer: {formatDuration(session.started_at, session.completed_at)}
          </span>
        </div>
      </div>

      {/* Blocks */}
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
        {session.blocks.length === 0 ? (
          <p className="text-sm text-gray-500">Keine Daten für diese Session.</p>
        ) : (
          session.blocks.map(block => (
            <BlockTable key={block.id} block={block} />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Start dev server and test manually**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npm run dev
```

Open `http://localhost:3000/admin/users` and verify:

1. Find a user with an active plan → open their detail page
2. The PlanSection shows the accordion (session rows with day, name, type, duration, status)
3. Click a session row → it expands showing blocks and exercises
4. Only one row is open at a time (clicking another closes the previous)
5. For completed sessions: a "Details →" link appears at the bottom of the expanded content
6. Click "Details →" → opens `/admin/users/[id]/sessions/[sessionId]`
7. Session detail shows: back link, name, status, date, duration
8. Performed sets appear grouped by block with dynamic columns
9. For sessions with no performed sets: "Keine performed Sets vorhanden." note

- [ ] **Step 4: Commit**

```bash
cd /Users/leonardogranetto/Projects/jemp && git add web/app/admin/users/[id]/sessions/[sessionId]/page.tsx && git commit -m "feat: add session detail page with performed sets and dynamic columns"
```
