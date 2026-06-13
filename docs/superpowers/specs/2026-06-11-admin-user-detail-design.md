# Admin User Detail Page

**Date:** 2026-06-11
**Status:** Approved

## Overview

A new admin section at `/admin/users` that shows a searchable, paginated list of all users. Clicking a user opens a detail page at `/admin/users/[id]` showing their profile data (with related tables), active training plan with session progress, and RevenueCat subscription status. Read-only — no editing.

---

## Routing

```
web/app/admin/users/
├── page.tsx                              # List page (Server Component)
├── [id]/
│   └── page.tsx                          # Detail page (Server Component)
└── _components/
    ├── UserTable.tsx                      # Client Component: search + pagination UI
    ├── ProfileSection.tsx                 # Profile data display
    ├── PlanSection.tsx                    # Active plan + session list
    └── SubscriptionSection.tsx            # RevenueCat (wrapped in Suspense)
```

**Additional files:**
- `web/lib/revenuecat.ts` — RevenueCat REST API helper
- `web/app/actions/users.ts` — Supabase server actions for user queries
- `web/app/admin/_components/AdminSidebar.tsx` — add "Users" nav item

---

## List Page (`/admin/users`)

### URL params
- `?search=<string>` — filters by first_name, last_name, or email (case-insensitive)
- `?page=<number>` — current page (default: 1)

### Server Component behavior
- Reads `search` and `page` from `searchParams`
- Calls `getUsers(search, page)` server action
- Renders `<UserTable>` with data + total count

### UserTable (Client Component)
- Controlled search input with 300ms debounce → updates URL via `router.push`
- Displays a table with columns: **Name**, **E-Mail**, **Sport**, **Rolle**, **Onboarded**, **Zuletzt aktiv**
- Pagination controls: previous/next, current page indicator
- 25 users per page
- Clicking a row navigates to `/admin/users/[id]`

### Server Action: `getUsers`
```typescript
// web/app/actions/users.ts
getUsers(search: string, page: number): Promise<{
  users: UserListRow[]
  total: number
}>

type UserListRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  sport: string | null        // joined from sports.name_i18n
  role: 'user' | 'admin' | 'tester'
  has_onboarded: boolean | null
  last_active_at: string | null
}
```

Supabase query:
```typescript
supabase
  .from('user_profiles')
  .select('id, first_name, last_name, email, role, has_onboarded, last_active_at, sport:sports(name_i18n)', { count: 'exact' })
  .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  .order('last_active_at', { ascending: false })
  .range((page - 1) * 25, page * 25 - 1)
```

Empty search string → `.or()` filter is not applied, all users are returned.

---

## Detail Page (`/admin/users/[id]`)

### Server Component behavior
- `id` comes from route params
- Fetches profile + plan data in parallel:
  ```typescript
  const [profile, plan] = await Promise.all([
    fetchUserProfile(id),
    fetchUserActivePlan(id),
  ])
  ```
- Renders `<ProfileSection>`, `<PlanSection>`, and wraps `<SubscriptionSection>` in `<Suspense>`
- "← Alle User" back link at top
- If profile not found → 404 via `notFound()`

### Layout
Three sections stacked vertically with consistent card styling (matching existing admin dark theme).

---

## Section 1 — Profil (`ProfileSection`)

**Left column — Core data from `user_profiles`:**
- Name (first + last)
- E-Mail
- Alter (calculated from birth_date)
- Geschlecht
- Größe / Gewicht
- Sport (joined from `sports`)
- Rolle
- Sprache / Timezone
- Onboarded (ja/nein)
- Erstellt am / Zuletzt aktiv

**Right column — Related tables:**
- **Umgebungen:** `user_environments` → `environments.name_i18n` list
- **Equipment:** `user_equipments` → `equipments.name_i18n` list
- **Fokus-Kategorien:** `user_targeted_categories` → category name + priority badge
- **Kategorie-Level:** `user_category_levels` → category name + score (0–100) as a small bar

### Server Action: `fetchUserProfile`
```typescript
fetchUserProfile(userId: string): Promise<UserProfile | null>
```

Single Supabase query with nested selects:
```typescript
supabase
  .from('user_profiles')
  .select(`
    *,
    sport:sports(slug, name_i18n),
    user_environments(environment:environments(slug, name_i18n)),
    user_equipments(equipment:equipments(slug, name_i18n)),
    user_targeted_categories(priority, category:categories(slug, name_i18n)),
    user_category_levels(level_score, category:categories(slug, name_i18n))
  `)
  .eq('id', userId)
  .single()
```

---

## Section 2 — Trainingsplan (`PlanSection`)

**Header:** Plan-Name, Status-Badge, Start/End-Datum, Dauer (Wochen), Fortschritt ("12 / 20 Sessions abgeschlossen")

**Session table:** All `workout_sessions` for the active plan, columns:
- Name
- Typ (training / recovery)
- Scheduled At
- Status with icon: completed ✅ / in_progress 🔄 / scheduled ⏳ / skipped or cancelled ❌

Sessions ordered by `scheduled_at` ascending.

If no active plan: empty state "Kein aktiver Plan vorhanden."

### Server Action: `fetchUserActivePlan`
```typescript
fetchUserActivePlan(userId: string): Promise<UserActivePlan | null>

type UserActivePlan = {
  id: string
  name: string
  status: string
  duration_weeks: number
  start_date: string
  end_date: string
  sessions: WorkoutSessionRow[]
  completedCount: number
  totalCount: number
}

type WorkoutSessionRow = {
  id: string
  name: string
  session_type: string | null
  status: string
  scheduled_at: string | null
  completed_at: string | null
}
```

Two queries:
1. `workout_plans` where `user_id = userId AND status = 'active'` → single row
2. `workout_sessions` where `workout_plan_id = planId` → all rows, ordered by `scheduled_at`

`completedCount` = sessions where `status = 'completed'`.

---

## Section 3 — Abo (`SubscriptionSection`)

Wrapped in `<Suspense fallback={<SubscriptionSkeleton />}>` in the parent page — renders independently, does not block Profile or Plan sections.

**Displayed fields:**
- Abo aktiv: ja / nein
- Entitlement: `full_access` aktiv / inaktiv
- Typ: Trial / Monthly / Yearly (from `period_type` + `product_identifier`)
- Läuft ab: formatted date from `expires_date`
- Management-URL: link if available

**Error state:** If RevenueCat returns non-2xx or network error → "Abo-Daten konnten nicht geladen werden."
**No subscriber found (404):** "Kein RevenueCat-Eintrag für diesen User."

### RevenueCat helper: `web/lib/revenuecat.ts`
```typescript
export async function getRevenueCatSubscriber(userId: string): Promise<RCSubscriber | null>

// Calls:
fetch(`https://api.revenuecat.com/v1/subscribers/${userId}`, {
  headers: {
    Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  next: { revalidate: 60 }, // 1-minute server-side cache
})
```

Returns `null` if subscriber not found (404). Throws on other errors (caught by SubscriptionSection).

**Environment variable:** `REVENUECAT_SECRET_KEY` added to `web/.env.local`.

---

## Admin Sidebar

Add to `TABS` array in `AdminSidebar.tsx`:
```typescript
{ id: 'users', label: 'Users', href: '/admin/users', matchPrefix: '/admin/users' }
```

Position: append after "Plan Simulator" (currently the last item).

---

## Styling

Matches existing admin dark theme throughout:
- Cards: `bg-gray-950 border border-gray-800 rounded-lg p-5`
- Section titles: `text-[10px] text-gray-600 uppercase tracking-widest font-semibold`
- Table rows: `text-xs`, hover `bg-gray-900/50`
- Status badges: colored dot + text (green = active/completed, yellow = in_progress, gray = scheduled, red = cancelled/skipped)

---

## Out of Scope

- Editing any user data
- Deleting users
- Sending notifications to users
- Viewing historical plans (only active plan)
- Showing performed sets / exercise-level detail within sessions
- Showing metric entries / assessment history
