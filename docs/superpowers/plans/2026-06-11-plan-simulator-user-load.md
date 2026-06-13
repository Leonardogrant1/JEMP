# Plan Simulator: User-Load Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a UUID input at the top of the Plan Simulator config panel that pre-fills all fields with a real user's data from the database.

**Architecture:** A new server action `fetchUserDataForSimulator` in `actions.ts` queries `user_profiles`, `user_environments`, `user_equipments`, `user_targeted_categories`, and `user_category_levels` in parallel, maps the results to `UserData`, and returns them. The `ConfigPanel` component gets local state for the input + loaded badge and calls the action on submit.

**Tech Stack:** Next.js App Router, Supabase server client, Zustand, TypeScript, Tailwind CSS

---

## File Map

| File | Change |
|---|---|
| `web/app/admin/plan-simulator/actions.ts` | Add `fetchUserDataForSimulator` server action + 2 pure helpers |
| `web/app/admin/_components/PlanSimulator.tsx` | Add local state + `handleLoadUser` + JSX section in `ConfigPanel` |

---

## Task 1: Server Action — `fetchUserDataForSimulator`

**Files:**
- Modify: `web/app/admin/plan-simulator/actions.ts`

- [ ] **Step 1: Add helper functions and the server action**

Append the following to the end of `web/app/admin/plan-simulator/actions.ts` (after the closing of `getSimulatorRefData`):

```typescript
// ─── User Load ────────────────────────────────────────────────

function parseSessionDuration(value: string | null | undefined): number {
  if (!value) return 60
  const n = parseInt(value.replace('min', ''), 10)
  return isNaN(n) ? 60 : n
}

function calculateAge(birthDate: string): number {
  return new Date().getFullYear() - new Date(birthDate).getFullYear()
}

export type LoadedUserData = {
  userData: import('./store').UserData
  displayName: string
}

export async function fetchUserDataForSimulator(
  userId: string,
): Promise<LoadedUserData | null> {
  const [
    { data: profile },
    { data: environments },
    { data: equipments },
    { data: targetedCategories },
    { data: categoryLevels },
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('first_name, last_name, gender, birth_date, height_in_cm, weight_in_kg, preferred_workout_days, preferred_session_duration, weekly_schedule, sport:sports(slug)')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_environments')
      .select('environment_id')
      .eq('user_id', userId),
    supabase
      .from('user_equipments')
      .select('equipment_id')
      .eq('user_id', userId),
    supabase
      .from('user_targeted_categories')
      .select('priority, category:categories(id, slug)')
      .eq('user_id', userId),
    supabase
      .from('user_category_levels')
      .select('category_id, level_score')
      .eq('user_id', userId),
  ])

  if (!profile) return null

  const sessionDuration = parseSessionDuration(
    profile.preferred_session_duration as string | null,
  )

  const userData: import('./store').UserData = {
    gender: (profile.gender as 'male' | 'female') ?? 'male',
    age: profile.birth_date ? calculateAge(profile.birth_date) : 25,
    height_cm: profile.height_in_cm ?? 175,
    weight_kg: profile.weight_in_kg ?? 75,
    sport: (profile.sport as any)?.slug ?? '',
    preferred_workout_days: (profile.preferred_workout_days as number[]) ?? [],
    min_session_duration: sessionDuration,
    max_session_duration: sessionDuration,
    weekly_schedule: (profile.weekly_schedule as any) ?? { sessions: [], notes: null },
    environment_ids: (environments ?? []).map(e => e.environment_id),
    equipment_ids: (equipments ?? []).map(e => e.equipment_id),
    focus_categories: (targetedCategories ?? [])
      .filter(tc => (tc.category as any)?.slug)
      .map(tc => ({
        category_slug: (tc.category as any).slug as string,
        priority: tc.priority,
      })),
    category_levels: (categoryLevels ?? []).map(cl => ({
      category_id: cl.category_id,
      level_score: cl.level_score,
    })),
  }

  const lastName = profile.last_name ? `${profile.last_name[0]}.` : ''
  const displayName = `${profile.first_name ?? ''} ${lastName}`.trim() || userId.slice(0, 8)

  return { userData, displayName }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors in `actions.ts`. If you see type errors on the Supabase select string, the column or relation name may differ — check `database.types.ts` for the exact column names on `user_profiles` and adjust the select string accordingly.

- [ ] **Step 3: Commit**

```bash
git add web/app/admin/plan-simulator/actions.ts
git commit -m "feat: add fetchUserDataForSimulator server action"
```

---

## Task 2: UI — User-load section in ConfigPanel

**Files:**
- Modify: `web/app/admin/_components/PlanSimulator.tsx`

- [ ] **Step 1: Add the import for the new action**

In `web/app/admin/_components/PlanSimulator.tsx`, find the existing import line (line 5):

```typescript
import type { SimulatorRefData } from '../plan-simulator/actions'
```

Replace it with:

```typescript
import type { SimulatorRefData } from '../plan-simulator/actions'
import { fetchUserDataForSimulator } from '../plan-simulator/actions'
```

- [ ] **Step 2: Add local state and handler to ConfigPanel**

In `web/app/admin/_components/PlanSimulator.tsx`, find the opening of `ConfigPanel` (line 77):

```typescript
function ConfigPanel({
  userData, updateUserData, refData,
}: {
  userData: UserData
  updateUserData: (patch: Partial<UserData>) => void
  refData: SimulatorRefData
}) {
  function toggleWorkoutDay(day: number) {
```

Replace it with:

```typescript
function ConfigPanel({
  userData, updateUserData, refData,
}: {
  userData: UserData
  updateUserData: (patch: Partial<UserData>) => void
  refData: SimulatorRefData
}) {
  const [userIdInput, setUserIdInput] = useState('')
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [loadedUser, setLoadedUser] = useState<{ id: string; name: string } | null>(null)
  const [loadUserError, setLoadUserError] = useState<string | null>(null)

  async function handleLoadUser() {
    const trimmed = userIdInput.trim()
    if (!trimmed) return
    setIsLoadingUser(true)
    setLoadUserError(null)
    const result = await fetchUserDataForSimulator(trimmed)
    if (!result) {
      setLoadUserError('User nicht gefunden')
    } else {
      updateUserData(result.userData)
      setLoadedUser({ id: trimmed, name: result.displayName })
    }
    setIsLoadingUser(false)
  }

  function handleClearUser() {
    setUserIdInput('')
    setLoadedUser(null)
    setLoadUserError(null)
  }

  function toggleWorkoutDay(day: number) {
```

- [ ] **Step 3: Add the JSX section at the top of ConfigPanel's return**

In `web/app/admin/_components/PlanSimulator.tsx`, find the opening of the ConfigPanel return (line 176):

```typescript
  return (
    <div className="flex flex-col gap-5 text-sm">

      {/* Profil */}
```

Replace it with:

```typescript
  return (
    <div className="flex flex-col gap-5 text-sm">

      {/* User laden */}
      <div className="flex flex-col gap-2">
        <SectionTitle>User laden</SectionTitle>
        {loadedUser ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-400">Geladen: {loadedUser.name}</span>
            <button
              onClick={handleClearUser}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={userIdInput}
              onChange={e => setUserIdInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLoadUser()}
              placeholder="User UUID…"
              className="flex-1 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
            />
            <button
              onClick={handleLoadUser}
              disabled={isLoadingUser || !userIdInput.trim()}
              className="px-3 py-1 text-xs text-gray-300 border border-gray-700 rounded hover:border-gray-500 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoadingUser ? (
                <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : 'Laden'}
            </button>
          </div>
        )}
        {loadUserError && (
          <p className="text-xs text-red-400">{loadUserError}</p>
        )}
      </div>

      {/* Profil */}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors. If `fetchUserDataForSimulator` is flagged as a server action being imported in a client component, check if the import needs `'use server'` boundary — since the function is already in a `'use server'` file, the import should work directly in Next.js App Router.

- [ ] **Step 5: Start dev server and test manually**

```bash
cd web && npm run dev
```

Open `http://localhost:3000/admin/plan-simulator` and verify:

1. The "User laden" section appears at the top of the left panel
2. Paste a valid user UUID from the database → click "Laden" → all config fields update
3. The green badge `"Geladen: Max M."` appears after load
4. "×" clears the badge (fields stay as loaded)
5. Enter → triggers load (keyboard shortcut works)
6. Invalid UUID → red `"User nicht gefunden"` message
7. Clicking "Generieren" afterwards runs a simulation with the loaded user's data

- [ ] **Step 6: Commit**

```bash
git add web/app/admin/_components/PlanSimulator.tsx
git commit -m "feat: add user-load input to plan simulator config panel"
```
