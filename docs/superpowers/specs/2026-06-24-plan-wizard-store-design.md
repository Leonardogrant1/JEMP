# Plan Wizard Store — Design Spec

**Date:** 2026-06-24

## Goal

Extract all form state and business logic from `app/generate-plan.tsx` into a dedicated Zustand store `stores/plan-wizard-store.ts`. The component becomes a pure render layer. The existing `stores/plan-generation-store.ts` (Realtime job tracking) is not touched.

## File Changes

| Action | File |
|--------|------|
| Rename + implement | `stores/generate-plan-store.ts` → `stores/plan-wizard-store.ts` |
| Refactor | `app/generate-plan.tsx` — remove all state/logic, read from store |

## State Shape (flat)

```ts
// Navigation
phase: Phase
goalsSubPhase: 'select' | 'rank'

// UI status
loading: boolean
isSaving: boolean
saveError: string | null

// Stored profile id (set during initialize)
profileId: string | null

// Step data
selectedSportSlug: string | null
allEnvs: EnvItem[]
selectedEnvIds: Set<string>
equipmentByEnv: Map<string, EquipmentItem[]>
allEquipment: EquipmentItem[]
selectedEquipmentIds: Set<string>
ambiguousEquipment: AmbiguousItem[]
equipmentEnvSelections: Map<string, Set<string>>
savedEquipmentEnvMappings: { equipment_id: string; environment_id: string }[]
allCategories: CategoryItem[]
selectedCategoryIds: Set<string>
rankedCategories: CategoryItem[]
weightKg: number
heightCm: number
weightUnit: 'kg' | 'lbs'
heightUnit: 'cm' | 'ft'
preferredDays: Set<number>
preferredDuration: SessionDuration | null
scheduleNotes: string
dayEnvMap: Record<number, string>
sportSessions: WeeklyScheduleSession[]
```

## Actions

```ts
// Pre-fills all state from profile + fetches Supabase data (replaces useEffect in component)
initialize: (profile: UserProfile) => Promise<void>

// Environment
toggleEnv: (id: string) => void
goToEquipment: () => void         // builds allEquipment from selectedEnvIds, advances to 'equipment'

// Equipment
toggleEquipment: (id: string) => void
handleEquipmentNext: () => void   // resolves ambiguous equipment, advances to 'equipment-env' or 'goals'

// Equipment-environment mapping
toggleEquipmentEnv: (equipmentId: string, envId: string) => void

// Goals
toggleCategory: (id: string) => void      // toggles selectedCategoryIds
setRankedCategories: (items: CategoryItem[]) => void  // called after drag-end

// Schedule
togglePreferredDay: (dow: number) => void  // also removes dow from dayEnvMap if deselected
toggleDayEnv: (dow: number, envId: string) => void

// Weekly sport schedule
toggleSportDay: (day: number) => void
setSportType: (day: number, type: WeeklyScheduleSession['type']) => void
setSportIntensity: (day: number, intensity: number) => void

// Navigation
goBack: (router: Router) => void  // router needed for router.back() on first step
goNext: () => void                // renamed from handleNext()

// Submit
generate: (router: Router, accessToken: string) => Promise<void>
// Uses profileId stored during initialize()
// On success: calls usePlanGenerationStore.getState().subscribe(), then router.navigate('/(tabs)/plan')

// Simple setters
setPreferredDuration: (duration: SessionDuration | null) => void
setScheduleNotes: (notes: string) => void
setWeightKg: (kg: number) => void
setHeightCm: (cm: number) => void
setWeightUnit: (unit: 'kg' | 'lbs') => void
setHeightUnit: (unit: 'cm' | 'ft') => void
setSelectedSportSlug: (slug: string | null) => void

// Cleanup
reset: () => void
```

## What Stays in the Component

- All JSX rendering
- `canProceedNext` — derived from store state, simple boolean expression, no need to move
- `useEffect(() => { store.initialize(profile) }, [profile])` — one-liner
- `theme`, `locale`, `t`, `insets` — UI concerns
- The `COMBAT_SPORTS` constant and `getAffectedJempDays` / `formatDays` helpers in the weekly phase — pure render helpers, not state logic
- `preferredDuration` toggle — simple `store.set` via a `setPreferredDuration` action (no side effects)

## Data Flow

```
Component mounts
  → useEffect calls store.initialize(profile)
    → store sets loading: true
    → store pre-fills state from profile fields
    → store fetches envs / equipment / categories from Supabase
    → store sets loading: false

User taps Next
  → store.goNext()
    → advances phase, runs transition logic (e.g. goToEquipment, handleEquipmentNext)

User taps Generate
  → store.generate(router, accessToken)
    → sets isSaving: true
    → writes all data to Supabase (sport, weight/height, envs, equipment, mappings, goals, schedule)
    → calls backend /api/plan-generation/start
    → subscribes Realtime job store
    → navigates to /(tabs)/plan
    → on error: sets isSaving: false + saveError
```

## Notes

- Zustand handles `Set` and `Map` fine as long as mutations always create new instances (already done in the existing component code).
- `generate()` receives `accessToken` as parameter — the component fetches it via `supabase.auth.getSession()` before calling.
- `profileId` is stored in the wizard store during `initialize()` so `generate()` doesn't need `profile` passed in.
