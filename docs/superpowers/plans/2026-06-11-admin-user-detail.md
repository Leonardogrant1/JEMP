# Admin User Detail Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/admin/users` list page and `/admin/users/[id]` detail page showing user profile data, active training plan progress, and RevenueCat subscription status.

**Architecture:** Server Components throughout. A server action file handles all Supabase queries. A standalone `web/lib/revenuecat.ts` helper handles the RevenueCat REST API call. The subscription section is an async Server Component wrapped in `<Suspense>` so it loads independently from the rest of the page.

**Tech Stack:** Next.js App Router (Server Components, Server Actions), Supabase, RevenueCat REST API v1, TypeScript, Tailwind CSS

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `web/app/admin/_components/AdminSidebar.tsx` | Modify | Add "Users" nav item |
| `web/app/actions/users.ts` | Create | `getUsers`, `fetchUserProfile`, `fetchUserActivePlan` |
| `web/lib/revenuecat.ts` | Create | RevenueCat REST API helper |
| `web/app/admin/users/page.tsx` | Create | List page (Server Component) |
| `web/app/admin/users/_components/UserTable.tsx` | Create | Client Component: search input + pagination + table |
| `web/app/admin/users/[id]/page.tsx` | Create | Detail page (Server Component) |
| `web/app/admin/users/_components/ProfileSection.tsx` | Create | Profile data display |
| `web/app/admin/users/_components/PlanSection.tsx` | Create | Active plan + session list |
| `web/app/admin/users/_components/SubscriptionSection.tsx` | Create | RevenueCat data (async Server Component) |
| `web/.env.local` | Modify | Add `REVENUECAT_SECRET_KEY` |

---

## Task 1: Sidebar — Add "Users" nav item

**Files:**
- Modify: `web/app/admin/_components/AdminSidebar.tsx`

- [ ] **Step 1: Add the Users tab to the TABS array**

In `web/app/admin/_components/AdminSidebar.tsx`, find the end of the `TABS` array (the last item is `plan-simulator`, closing with `},` before `]`). Append a new entry after `plan-simulator`:

```typescript
  {
    id: 'users',
    label: 'Users',
    href: '/admin/users',
    matchPrefix: '/admin/users',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
```

- [ ] **Step 2: Update the `isActive` exclusion list for the exercises tab**

In `AdminSidebar.tsx`, find the `isActive` function. The exercises tab has a special check that manually excludes known paths. Add `/admin/users` to its exclusion list:

Find this block:
```typescript
    if (tab.id === 'exercises') {
      return pathname === '/admin' || (
        pathname.startsWith('/admin/') &&
        !pathname.startsWith('/admin/calculator') &&
        !pathname.startsWith('/admin/equipment') &&
        !pathname.startsWith('/admin/sport-categories') &&
        !pathname.startsWith('/admin/assessments') &&
        !pathname.startsWith('/admin/metrics') &&
        !pathname.startsWith('/admin/plan-simulator')
      )
    }
```

Replace with:
```typescript
    if (tab.id === 'exercises') {
      return pathname === '/admin' || (
        pathname.startsWith('/admin/') &&
        !pathname.startsWith('/admin/calculator') &&
        !pathname.startsWith('/admin/equipment') &&
        !pathname.startsWith('/admin/sport-categories') &&
        !pathname.startsWith('/admin/assessments') &&
        !pathname.startsWith('/admin/metrics') &&
        !pathname.startsWith('/admin/plan-simulator') &&
        !pathname.startsWith('/admin/users')
      )
    }
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/_components/AdminSidebar.tsx
git commit -m "feat: add Users nav item to admin sidebar"
```

---

## Task 2: Server actions for user queries

**Files:**
- Create: `web/app/actions/users.ts`

No test framework available — verify by running the dev server and checking the pages render correctly in Task 4 and 5.

- [ ] **Step 1: Create `web/app/actions/users.ts`**

```typescript
'use server'

import { supabase } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { asI18n } from '@/lib/i18n'

// ─── Auth helpers ─────────────────────────────────────────────

async function requireUser() {
  const cookieStore = await cookies()
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

async function requireAdmin() {
  const user = await requireUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return user
}

// ─── Types ────────────────────────────────────────────────────

export type UserListRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  sport: string | null
  role: 'user' | 'admin' | 'tester'
  has_onboarded: boolean | null
  last_active_at: string | null
}

export type UserProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  birth_date: string | null
  gender: 'male' | 'female' | 'other' | null
  height_in_cm: number | null
  weight_in_kg: number | null
  role: 'user' | 'admin' | 'tester'
  has_onboarded: boolean | null
  preferred_language: string | null
  timezone: string | null
  preferred_session_duration: string | null
  preferred_workout_days: number[] | null
  load_score: number
  load_profile: string
  created_at: string | null
  last_active_at: string | null
  sport: { slug: string; name_de: string } | null
  environments: { slug: string; name_de: string }[]
  equipments: { slug: string; name_de: string }[]
  focus_categories: { slug: string; name_de: string; priority: number }[]
  category_levels: { slug: string; name_de: string; level_score: number }[]
}

export type WorkoutSessionRow = {
  id: string
  name: string
  session_type: string | null
  status: string
  scheduled_at: string | null
  completed_at: string | null
}

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
}

// ─── getUsers ─────────────────────────────────────────────────

export async function getUsers(
  search: string,
  page: number,
): Promise<{ users: UserListRow[]; total: number }> {
  await requireAdmin()

  const PAGE_SIZE = 25
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('user_profiles')
    .select('id, first_name, last_name, email, role, has_onboarded, last_active_at, sport:sports(name_i18n)', { count: 'exact' })
    .order('last_active_at', { ascending: false, nullsFirst: false })
    .range(from, to)

  if (search.trim()) {
    query = query.or(
      `first_name.ilike.%${search.trim()}%,last_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const users: UserListRow[] = (data ?? []).map(row => ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    sport: row.sport ? asI18n((row.sport as any).name_i18n).de || null : null,
    role: row.role as UserListRow['role'],
    has_onboarded: row.has_onboarded,
    last_active_at: row.last_active_at,
  }))

  return { users, total: count ?? 0 }
}

// ─── fetchUserProfile ─────────────────────────────────────────

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  await requireAdmin()

  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      id, first_name, last_name, email, birth_date, gender,
      height_in_cm, weight_in_kg, role, has_onboarded,
      preferred_language, timezone, preferred_session_duration,
      preferred_workout_days, load_score, load_profile,
      created_at, last_active_at,
      sport:sports(slug, name_i18n),
      user_environments(environment:environments(slug, name_i18n)),
      user_equipments(equipment:equipments(slug, name_i18n)),
      user_targeted_categories(priority, category:categories(slug, name_i18n)),
      user_category_levels(level_score, category:categories(slug, name_i18n))
    `)
    .eq('id', userId)
    .single()

  if (error && error.code === 'PGRST116') return null
  if (error) throw new Error(error.message)
  if (!data) return null

  const d = data as any

  return {
    id: d.id,
    first_name: d.first_name,
    last_name: d.last_name,
    email: d.email,
    birth_date: d.birth_date,
    gender: d.gender,
    height_in_cm: d.height_in_cm,
    weight_in_kg: d.weight_in_kg,
    role: d.role,
    has_onboarded: d.has_onboarded,
    preferred_language: d.preferred_language,
    timezone: d.timezone,
    preferred_session_duration: d.preferred_session_duration,
    preferred_workout_days: d.preferred_workout_days,
    load_score: d.load_score,
    load_profile: d.load_profile,
    created_at: d.created_at,
    last_active_at: d.last_active_at,
    sport: d.sport ? { slug: d.sport.slug, name_de: asI18n(d.sport.name_i18n).de } : null,
    environments: (d.user_environments ?? []).map((r: any) => ({
      slug: r.environment.slug,
      name_de: asI18n(r.environment.name_i18n).de,
    })),
    equipments: (d.user_equipments ?? []).map((r: any) => ({
      slug: r.equipment.slug,
      name_de: asI18n(r.equipment.name_i18n).de,
    })),
    focus_categories: (d.user_targeted_categories ?? [])
      .sort((a: any, b: any) => a.priority - b.priority)
      .map((r: any) => ({
        slug: r.category.slug,
        name_de: asI18n(r.category.name_i18n).de,
        priority: r.priority,
      })),
    category_levels: (d.user_category_levels ?? []).map((r: any) => ({
      slug: r.category.slug,
      name_de: asI18n(r.category.name_i18n).de,
      level_score: r.level_score,
    })),
  }
}

// ─── fetchUserActivePlan ──────────────────────────────────────

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

  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id, name, session_type, status, scheduled_at, completed_at')
    .eq('workout_plan_id', plan.id)
    .order('scheduled_at', { ascending: true })

  if (sessionsError) throw new Error(sessionsError.message)

  const allSessions: WorkoutSessionRow[] = (sessions ?? []).map(s => ({
    id: s.id,
    name: s.name,
    session_type: s.session_type,
    status: s.status,
    scheduled_at: s.scheduled_at,
    completed_at: s.completed_at,
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
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npx tsc --noEmit
```

Expected: no errors. If Supabase complains about the nested select string shape, the `as any` casts in the mapping functions handle it.

- [ ] **Step 3: Commit**

```bash
git add web/app/actions/users.ts
git commit -m "feat: add user server actions (getUsers, fetchUserProfile, fetchUserActivePlan)"
```

---

## Task 3: RevenueCat helper + env var

**Files:**
- Create: `web/lib/revenuecat.ts`
- Modify: `web/.env.local`

- [ ] **Step 1: Add env var to `web/.env.local`**

Open `web/.env.local` and append:

```
REVENUECAT_SECRET_KEY=your_secret_key_here
```

Replace `your_secret_key_here` with the actual RevenueCat secret key from the dashboard (Settings → API Keys → Secret keys).

- [ ] **Step 2: Create `web/lib/revenuecat.ts`**

```typescript
export type RCEntitlement = {
  expires_date: string | null
  period_type: 'normal' | 'trial' | 'intro'
  product_identifier: string
  management_url: string | null
  is_sandbox: boolean
}

export type RCSubscriber = {
  entitlements: Record<string, RCEntitlement>
  management_url: string | null
}

export async function getRevenueCatSubscriber(userId: string): Promise<RCSubscriber | null> {
  const apiKey = process.env.REVENUECAT_SECRET_KEY
  if (!apiKey) throw new Error('REVENUECAT_SECRET_KEY is not configured')

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 60 },
  })

  if (res.status === 404) return null
  if (!res.ok) throw new Error(`RevenueCat API error: ${res.status}`)

  const body = await res.json()
  const sub = body?.subscriber

  return {
    entitlements: sub?.entitlements ?? {},
    management_url: sub?.management_url ?? null,
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/lib/revenuecat.ts
git commit -m "feat: add RevenueCat REST API helper"
```

Note: Do NOT commit `web/.env.local` — it contains secrets and is already in `.gitignore`.

---

## Task 4: User list page

**Files:**
- Create: `web/app/admin/users/page.tsx`
- Create: `web/app/admin/users/_components/UserTable.tsx`

- [ ] **Step 1: Create the UserTable client component**

Create `web/app/admin/users/_components/UserTable.tsx`:

```typescript
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { UserListRow } from '@/app/actions/users'

const PAGE_SIZE = 25

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function UserTable({
  users,
  total,
  currentPage,
  currentSearch,
}: {
  users: UserListRow[]
  total: number
  currentPage: number
  currentSearch: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchValue, setSearchValue] = useState(currentSearch)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushParams = useCallback((search: string, page: number) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (page > 1) params.set('page', String(page))
    router.push(`${pathname}?${params.toString()}`)
  }, [pathname, router])

  useEffect(() => {
    if (searchValue === currentSearch) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushParams(searchValue, 1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchValue, currentSearch, pushParams])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          placeholder="Name oder E-Mail suchen…"
          className="w-72 bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
        />
        <p className="text-sm text-gray-400">{total} User</p>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-3 pr-6 font-medium">Name</th>
            <th className="pb-3 pr-6 font-medium">E-Mail</th>
            <th className="pb-3 pr-6 font-medium">Sport</th>
            <th className="pb-3 pr-6 font-medium">Rolle</th>
            <th className="pb-3 pr-6 font-medium">Onboarded</th>
            <th className="pb-3 font-medium">Zuletzt aktiv</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                Keine User gefunden.
              </td>
            </tr>
          )}
          {users.map(user => (
            <tr
              key={user.id}
              onClick={() => router.push(`/admin/users/${user.id}`)}
              className="border-b border-gray-900 hover:bg-gray-900 transition-colors cursor-pointer"
            >
              <td className="py-3 pr-6">
                {user.first_name || user.last_name
                  ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                  : <span className="text-gray-500">—</span>
                }
              </td>
              <td className="py-3 pr-6 text-gray-400">{user.email}</td>
              <td className="py-3 pr-6 text-gray-400">{user.sport ?? '—'}</td>
              <td className="py-3 pr-6">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  user.role === 'admin' ? 'bg-purple-900 text-purple-300' :
                  user.role === 'tester' ? 'bg-yellow-900 text-yellow-300' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="py-3 pr-6">
                <span className={user.has_onboarded ? 'text-green-400' : 'text-gray-500'}>
                  {user.has_onboarded ? '✓' : '—'}
                </span>
              </td>
              <td className="py-3 text-gray-400">{formatDate(user.last_active_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => pushParams(currentSearch, currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-xs border border-gray-700 rounded text-gray-300 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Zurück
          </button>
          <span className="text-gray-400">Seite {currentPage} von {totalPages}</span>
          <button
            onClick={() => pushParams(currentSearch, currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-xs border border-gray-700 rounded text-gray-300 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Weiter →
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the list page**

Create `web/app/admin/users/page.tsx`:

```typescript
import { getUsers } from '@/app/actions/users'
import { UserTable } from './_components/UserTable'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const params = await searchParams
  const search = params.search ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const { users, total } = await getUsers(search, page)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">Alle registrierten User</p>
      </div>
      <UserTable
        users={users}
        total={total}
        currentPage={page}
        currentSearch={search}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start dev server and verify manually**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npm run dev
```

Open `http://localhost:3000/admin/users` and verify:
1. "Users" appears in the sidebar and highlights when active
2. User list loads and shows rows
3. Typing in the search box debounces and filters results
4. Pagination controls appear when total > 25
5. Clicking a row navigates to `/admin/users/[id]` (404 is fine at this point)

- [ ] **Step 5: Commit**

```bash
git add web/app/admin/users/page.tsx web/app/admin/users/_components/UserTable.tsx
git commit -m "feat: add admin user list page with search and pagination"
```

---

## Task 5: User detail page — Profile, Plan, and Subscription sections

**Files:**
- Create: `web/app/admin/users/[id]/page.tsx`
- Create: `web/app/admin/users/_components/ProfileSection.tsx`
- Create: `web/app/admin/users/_components/PlanSection.tsx`
- Create: `web/app/admin/users/_components/SubscriptionSection.tsx`

- [ ] **Step 1: Create `ProfileSection.tsx`**

Create `web/app/admin/users/_components/ProfileSection.tsx`:

```typescript
import type { UserProfile } from '@/app/actions/users'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-3">
      {children}
    </p>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-900">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-right">{value ?? <span className="text-gray-600">—</span>}</span>
    </div>
  )
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  const age = today.getFullYear() - birth.getFullYear()
  const hasHadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  return hasHadBirthday ? age : age - 1
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ProfileSection({ profile }: { profile: UserProfile }) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-5">Profil</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        {/* Left: core data */}
        <div>
          <SectionTitle>Kerndaten</SectionTitle>
          <Field label="Name" value={
            [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null
          } />
          <Field label="E-Mail" value={profile.email} />
          <Field label="Alter" value={
            profile.birth_date ? `${calculateAge(profile.birth_date)} Jahre` : null
          } />
          <Field label="Geschlecht" value={profile.gender} />
          <Field label="Größe" value={profile.height_in_cm ? `${profile.height_in_cm} cm` : null} />
          <Field label="Gewicht" value={profile.weight_in_kg ? `${profile.weight_in_kg} kg` : null} />
          <Field label="Sport" value={profile.sport?.name_de ?? null} />
          <Field label="Rolle" value={profile.role} />
          <Field label="Load Score" value={`${profile.load_score} (${profile.load_profile})`} />
          <Field label="Sprache" value={profile.preferred_language} />
          <Field label="Timezone" value={profile.timezone} />
          <Field label="Onboarded" value={profile.has_onboarded ? 'Ja' : 'Nein'} />
          <Field label="Session-Dauer" value={profile.preferred_session_duration} />
          <Field label="Trainingstage" value={
            profile.preferred_workout_days?.length
              ? profile.preferred_workout_days.join(', ')
              : null
          } />
          <Field label="Erstellt am" value={formatDate(profile.created_at)} />
          <Field label="Zuletzt aktiv" value={formatDate(profile.last_active_at)} />
        </div>

        {/* Right: related data */}
        <div className="mt-6 md:mt-0">
          <SectionTitle>Umgebungen</SectionTitle>
          {profile.environments.length === 0
            ? <p className="text-xs text-gray-600 mb-4">—</p>
            : <div className="flex flex-wrap gap-1.5 mb-4">
                {profile.environments.map(e => (
                  <span key={e.slug} className="text-xs bg-gray-900 border border-gray-800 rounded px-2 py-0.5">{e.name_de}</span>
                ))}
              </div>
          }

          <SectionTitle>Equipment</SectionTitle>
          {profile.equipments.length === 0
            ? <p className="text-xs text-gray-600 mb-4">—</p>
            : <div className="flex flex-wrap gap-1.5 mb-4">
                {profile.equipments.map(e => (
                  <span key={e.slug} className="text-xs bg-gray-900 border border-gray-800 rounded px-2 py-0.5">{e.name_de}</span>
                ))}
              </div>
          }

          <SectionTitle>Fokus-Kategorien</SectionTitle>
          {profile.focus_categories.length === 0
            ? <p className="text-xs text-gray-600 mb-4">—</p>
            : <div className="flex flex-col gap-1 mb-4">
                {profile.focus_categories.map(c => (
                  <div key={c.slug} className="flex items-center justify-between">
                    <span className="text-xs">{c.name_de}</span>
                    <span className="text-xs text-gray-500">Prio {c.priority}</span>
                  </div>
                ))}
              </div>
          }

          <SectionTitle>Kategorie-Level</SectionTitle>
          {profile.category_levels.length === 0
            ? <p className="text-xs text-gray-600">—</p>
            : <div className="flex flex-col gap-2">
                {profile.category_levels.map(c => (
                  <div key={c.slug}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs">{c.name_de}</span>
                      <span className="text-xs text-gray-500">{c.level_score}</span>
                    </div>
                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${c.level_score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `PlanSection.tsx`**

Create `web/app/admin/users/_components/PlanSection.tsx`:

```typescript
import type { UserActivePlan } from '@/app/actions/users'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

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

export function PlanSection({ plan }: { plan: UserActivePlan | null }) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-5">Trainingsplan</h2>

      {!plan ? (
        <p className="text-sm text-gray-500">Kein aktiver Plan vorhanden.</p>
      ) : (
        <>
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

          {/* Session list */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="pb-3 pr-6 font-medium text-xs">Name</th>
                <th className="pb-3 pr-6 font-medium text-xs">Typ</th>
                <th className="pb-3 pr-6 font-medium text-xs">Geplant am</th>
                <th className="pb-3 font-medium text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {plan.sessions.map(session => (
                <tr key={session.id} className="border-b border-gray-900">
                  <td className="py-2.5 pr-6 text-xs">{session.name}</td>
                  <td className="py-2.5 pr-6 text-xs text-gray-400">{session.session_type ?? '—'}</td>
                  <td className="py-2.5 pr-6 text-xs text-gray-400">{formatDate(session.scheduled_at)}</td>
                  <td className="py-2.5 text-xs"><StatusBadge status={session.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `SubscriptionSection.tsx`**

Create `web/app/admin/users/_components/SubscriptionSection.tsx`:

```typescript
import { getRevenueCatSubscriber } from '@/lib/revenuecat'

const ENTITLEMENT_ID = 'full_access'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-900">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-right">{value ?? <span className="text-gray-600">—</span>}</span>
    </div>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function SubscriptionSection({ userId }: { userId: string }) {
  let subscriber
  try {
    subscriber = await getRevenueCatSubscriber(userId)
  } catch {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-3">Abo</h2>
        <p className="text-xs text-red-400">Abo-Daten konnten nicht geladen werden.</p>
      </div>
    )
  }

  if (!subscriber) {
    return (
      <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
        <h2 className="text-sm font-semibold mb-3">Abo</h2>
        <p className="text-xs text-gray-500">Kein RevenueCat-Eintrag für diesen User.</p>
      </div>
    )
  }

  const entitlement = subscriber.entitlements[ENTITLEMENT_ID]
  const isActive = !!entitlement

  const periodLabel: Record<string, string> = {
    normal: 'Standard',
    trial: 'Trial',
    intro: 'Intro-Preis',
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-5">Abo</h2>
      <Field label="Abo aktiv" value={
        isActive
          ? <span className="text-green-400">Ja</span>
          : <span className="text-gray-500">Nein</span>
      } />
      {isActive && (
        <>
          <Field label="Entitlement" value={ENTITLEMENT_ID} />
          <Field label="Typ" value={periodLabel[entitlement.period_type] ?? entitlement.period_type} />
          <Field label="Produkt" value={entitlement.product_identifier} />
          <Field label="Läuft ab" value={formatDate(entitlement.expires_date)} />
          {entitlement.management_url && (
            <Field label="Management-URL" value={
              <a
                href={entitlement.management_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Link öffnen
              </a>
            } />
          )}
        </>
      )}
    </div>
  )
}

export function SubscriptionSkeleton() {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <div className="h-4 w-12 bg-gray-800 rounded animate-pulse mb-5" />
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-3 bg-gray-800 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create the detail page**

Create `web/app/admin/users/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchUserProfile, fetchUserActivePlan } from '@/app/actions/users'
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
      <PlanSection plan={plan} />

      {/* Subscription (independent Suspense) */}
      <Suspense fallback={<SubscriptionSkeleton />}>
        <SubscriptionSection userId={id} />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/leonardogranetto/Projects/jemp/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Test manually in the browser**

With the dev server running (`npm run dev` in `web/`):

1. Navigate to `http://localhost:3000/admin/users`
2. Click any user row → opens `/admin/users/[id]`
3. Verify "← Alle User" link returns to the list
4. Verify ProfileSection shows all fields (including environments, equipment, categories)
5. Verify PlanSection shows the active plan and session list (or "Kein aktiver Plan" for users without one)
6. Verify SubscriptionSection renders after a short delay (Suspense skeleton → real data)
7. Verify the UUID shown in the header matches the URL

- [ ] **Step 7: Commit**

```bash
git add \
  web/app/admin/users/[id]/page.tsx \
  web/app/admin/users/_components/ProfileSection.tsx \
  web/app/admin/users/_components/PlanSection.tsx \
  web/app/admin/users/_components/SubscriptionSection.tsx
git commit -m "feat: add admin user detail page with profile, plan, and subscription sections"
```
