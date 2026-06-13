# Plan Simulator: User-Load Feature

**Date:** 2026-06-11
**Status:** Approved

## Overview

Add a "User laden" input at the top of the Plan Simulator config panel. The admin pastes a user UUID, clicks "Laden", and the entire left-side config panel is pre-filled with that user's real data from the database. This speeds up debugging by eliminating manual re-entry of a user's profile settings.

---

## UI

A new section at the very top of the config panel, above the existing "Profil" section.

**Layout:**
- Label: `"User laden"`
- UUID text input + "Laden" button side by side
- Loading spinner on the button while fetching
- On success: green badge `"Geladen: Max M."` (first name + last initial) with an "×" button
- On error: red inline message `"User nicht gefunden"`
- "×" resets the input and clears the badge; the store data (already loaded) is not reset

**State (local to ConfigPanel):**
```typescript
const [inputValue, setInputValue] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [loadedUser, setLoadedUser] = useState<{ id: string; name: string } | null>(null)
const [error, setError] = useState<string | null>(null)
```

---

## Data Mapping

The server action fetches all required tables in parallel and maps them to the simulator's `UserData` type:

| `UserData` field | Source |
|---|---|
| `gender` | `user_profiles.gender` |
| `age` | calculated from `user_profiles.birth_date` |
| `height_cm` | `user_profiles.height_in_cm` |
| `weight_kg` | `user_profiles.weight_in_kg` |
| `sport` | `user_profiles.sport_id` → join `sports` → `slug` |
| `preferred_workout_days` | `user_profiles.preferred_workout_days` |
| `min_session_duration` | `user_profiles.preferred_session_duration` → parse number (`'60min'` → `60`) |
| `max_session_duration` | same as above (single value used for both — admin can adjust after loading) |
| `weekly_schedule` | `user_profiles.weekly_schedule` |
| `environment_ids` | `user_environments` → `environment_id[]` |
| `equipment_ids` | `user_equipments` → `equipment_id[]` |
| `focus_categories` | `user_targeted_categories` + join `categories` → `{ category_slug, priority }[]` |
| `category_levels` | `user_category_levels` → `{ category_id, level_score }[]` |

**Edge cases:**
- `preferred_session_duration` is a DB enum string (e.g. `'60min'`) → strip `'min'` suffix and parse as integer for `min_session_duration` and `max_session_duration`
- Missing related rows (e.g. no environments saved) → empty array, not fallback to defaults
- User not found → action returns `null`, UI shows error message

---

## Architecture

### Server Action — `actions.ts`

New export in `web/app/admin/plan-simulator/actions.ts`:

```typescript
export async function fetchUserDataForSimulator(
  userId: string
): Promise<{ userData: Partial<UserData>; displayName: string } | null>
```

- Uses the existing server-side Supabase client (same as `fetchReferenceData`)
- Runs all queries in `Promise.all`:
  1. `user_profiles` with `sport:sports(slug)` join
  2. `user_environments` filtered by `user_id`
  3. `user_equipments` filtered by `user_id`
  4. `user_targeted_categories` with `category:categories(slug)` join
  5. `user_category_levels`
- Returns `null` if `user_profiles` row is not found
- Age is calculated as `currentYear - birthYear` (simple integer, no month precision needed)

### Store — `store.ts`

No new state fields required. The existing `updateUserData(patch)` is called with the full mapped object, replacing all fields at once.

Optionally add `loadedUserId: string | null` to the store if the loaded user context needs to persist across component re-mounts (e.g. page refresh). If localStorage persistence is undesirable for this field, it can stay as local component state.

Decision: **keep as local component state** — the UUID input is a one-shot convenience tool, not persistent config.

### Component — `PlanSimulator.tsx`

Changes only to the `ConfigPanel` function:

1. Add local state (see UI section above)
2. Add `handleLoadUser` async function:
   - Sets `isLoading = true`, clears `error`
   - Calls `fetchUserDataForSimulator(inputValue.trim())`
   - On `null`: sets error message
   - On success: calls `updateUserData(result.userData)`, sets `loadedUser`
   - Always sets `isLoading = false`
3. Add the new UI block at the top of the config panel JSX

---

## Files Changed

| File | Change |
|---|---|
| `web/app/admin/plan-simulator/actions.ts` | Add `fetchUserDataForSimulator` server action |
| `web/app/admin/_components/PlanSimulator.tsx` | Add user-load UI block + `handleLoadUser` handler in `ConfigPanel` |
| `web/app/admin/plan-simulator/store.ts` | No changes required |

---

## Out of Scope

- Search by name or email (UUID input only)
- Persisting the loaded userId across sessions
- Showing a diff between loaded user data and current simulator state
- Resetting the store when "×" is clicked
