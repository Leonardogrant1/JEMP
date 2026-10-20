# Session Structure Redesign — Phase 3b: Onboarding & Wizard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the user-facing switch to the new system: the pillar stepper (budget N+4, writes `user_pillar_levels` with `set_by_wizard = true`), the two sprint-context questions, the day-step composition line with per-day duration overrides — in onboarding AND the plan wizard — plus the small worker wire that feeds per-day durations into the v2 engine.

**Architecture:** Pure logic lives in two new jest-tested app libs (`lib/pillar-budget.ts`, `lib/week-allocation.ts` — the latter a documented mirror of the worker's `allocateDays`). UI components follow the established onboarding/wizard patterns (store-backed steps, `onboarding-progress-wrapper` persistence, `sport-day-editor`-style sheets). `CategoryFocusStep`/`GoalsStep` are replaced, not patched. Completing either flow writes the §6.5 activation marker — after this phase, wizard users generate v2 plans.

**Tech Stack:** React Native (Expo), zustand stores, Supabase client, jest (app), i18n (de/en).

**Spec:** `docs/superpowers/specs/2026-10-07-session-structure-redesign-design.md` (§3.1–§3.4, §1.5, §6.5)

**Deferral rulings (recorded here):**
- **Two-a-day opt-in (§3.1/§3.3) is deferred:** the engine has no same-day stacking yet (conditioning doubles unimplemented; speed doubles are v1.5) — a question without effect violates the no-dead-questions principle. The `allows_double_days` column ships whenever the engine does.
- **Self-estimate per pillar → Phase 5** (score-source architecture; §6.6 assigns it there).
- **Per-day placement preview → Phase 4:** the day step shows exact *composition counts* (deterministic via the allocation mirror); the per-weekday session-type overview + move-with-warnings lives in the plan view / manage sheet (§3.4 bullet 3, §5.6).

## Global Constraints

- Styling/UX: follow the surrounding step components exactly (JempText variants, `Colors[scheme]`, Animated FadeInDown, Haptics on taps — copy the idiom of `category-focus-step.tsx` / `workout-prefs-step.tsx`, don't invent).
- Every user-visible string goes through i18n (`i18n/locales/de.ts` + `en.ts`); keys and full texts are in Task 8 — no hardcoded copy.
- Persistence writes happen where the existing flow writes (`onboarding-progress-wrapper.tsx` finish; wizard store submit) — steps themselves only write the store, except where the existing pattern differs (weekly-schedule persists per interaction; follow whichever pattern the replaced component used).
- `user_pillar_levels` writes: upsert on `(user_id, category_id)` (UNIQUE exists) with `set_by_wizard: true`, and **delete rows for pillars not in the payload** (sport switch can change the visible set).
- The legacy `user_targeted_categories` is **no longer written** by the new flows (wizard users are v2 users; the table stays for never-migrated users). `category-level-step` stays unchanged (it already covers all 7 active categories after 3a).
- `lib/week-allocation.ts` must stay in sync with `externals/jemp-temporal-worker/src/plan-generation/week-layout.ts` (`allocateDays`, `effectiveSpeedLevel`, `WORKOUT_DAY_CAP`, `MIN_WORKOUT_DAYS`) — both files carry a sync-comment pointing at each other.
- Jest for libs (`lib/__tests__/`), `npx jest` must stay green; root `npx tsc --noEmit` baseline unchanged (93 lines).
- Commit per task, Claude co-author trailer.

## Review Focus

1. **Budget invariants under sport switch** — changing sport changes the visible pillar set and budget; stored levels for now-hidden pillars must neither render nor count against the budget, and the delete-on-persist must remove them. Pinned by Task 2 tests (`clampLevelsToVisible`) and Task 4's persistence contract.
2. **Allocation mirror drift** — if app and worker disagree, the day step promises a composition the generator won't build. Pinned by Task 3's test vectors, which replicate the worker's week-layout test cases verbatim (same inputs → same counts).
3. **Stepper initial state = preset must be budget-valid** — 3a guarantees it in data; the UI must also clamp if a legacy translated level set exceeds budget (pre-fill from `user_pillar_levels` rows may combine with a different sport's presets). Pinned by Task 2 `normalizeToBudget` tests.
4. **Activation correctness** — only completing the NEW steps writes `set_by_wizard = true`; aborting onboarding/wizard midway must not. Pinned by Task 4/7 persistence placement (finish-time write, not per-interaction).
5. **Day-duration override shape** — `preferred_day_durations` JSONB `[{day_of_week, minutes}]` must match `WeekLayoutInput.day_minutes` exactly (worker consumes it verbatim in Task 9). Pinned by Task 9's type + test.

---

### Task 1: Migration — per-day duration storage

**Files:**
- Create: `supabase/migrations/20261008120000_add_preferred_day_durations.sql`
- Modify: `database.types.ts` (regenerate, installed CLI)

- [ ] **Step 1: Write + apply**

```sql
-- Per-day session-duration overrides (spec §3.1): [{"day_of_week":1,"minutes":45}, ...].
-- Global preferred_session_duration stays the default; overrides win per day.
SET LOCAL lock_timeout = '5s';
ALTER TABLE user_profiles ADD COLUMN preferred_day_durations JSONB;
```
Run `supabase migration up`; verify via psql (`column exists`, docker exec pattern). Regenerate types; root `npx tsc --noEmit` baseline unchanged.

- [ ] **Step 2: Commit** — `feat(db): add preferred_day_durations overrides`

---

### Task 2: `lib/pillar-budget.ts` (pure, jest)

**Files:**
- Create: `lib/pillar-budget.ts`, Test: `lib/__tests__/pillar-budget.test.ts`

**Interfaces (consumed by Tasks 4, 6, 7):**
```typescript
export type PillarPreset = { categoryId: string; slug: string; level: number }  // level 0-3 from sport_category_relevance.relevance
export type PillarLevel = { categoryId: string; slug: string; level: 1 | 2 | 3 }

export function visiblePillars(presets: PillarPreset[]): PillarPreset[]        // level > 0, stable order by fixed slug order
export function pillarBudget(visibleCount: number): number                      // N + 4
export function budgetSpent(levels: PillarLevel[]): number                      // sum
export function canIncrement(levels: PillarLevel[], categoryId: string, budget: number): boolean
export function initialLevels(presets: PillarPreset[], stored: PillarLevel[] | null): PillarLevel[]
  // stored rows win where their pillar is visible; missing pillars fall back to preset; never below 1
export function clampLevelsToVisible(levels: PillarLevel[], presets: PillarPreset[]): PillarLevel[]
export function normalizeToBudget(levels: PillarLevel[], budget: number): PillarLevel[]
  // reduce highest levels first (stable) until sum <= budget — guards legacy-translated overshoot
export const PILLAR_ORDER = ['strength','lower_body_plyometrics','upper_body_plyometrics','sprints','cod','conditioning','mobility'] as const
```

- [ ] **Step 1: Failing tests** — cover: visible filtering + ordering; budget N+4; increment blocked at budget and at level 3; initialLevels preset-fallback + stored-override + hidden-stored dropped; normalizeToBudget reduces a 12-sum to a 10-budget by trimming 3s first; clamp drops hidden pillars. Write concrete vectors (e.g., soccer preset `[2,2,2,2,1,1]` → budget 10, spent 10, no increments possible).
- [ ] **Step 2: RED → implement → GREEN** (`npx jest lib/__tests__/pillar-budget.test.ts`).
- [ ] **Step 3: Commit** — `feat(app): pillar budget logic`

---

### Task 3: `lib/week-allocation.ts` (worker mirror, jest)

**Files:**
- Create: `lib/week-allocation.ts`, Test: `lib/__tests__/week-allocation.test.ts`

**Interfaces (consumed by Task 6's composition line):**
```typescript
// ⚠️ SYNC MIRROR of externals/jemp-temporal-worker/src/plan-generation/week-layout.ts
// (allocateDays + effectiveSpeedLevel + caps). Change BOTH or the day step
// promises a week the generator won't build.
export type AllocationInput = {
  availableDayCount: number
  loadProfile: 'low' | 'medium' | 'high'
  pillarLevels: Partial<Record<string, 1 | 2 | 3>>   // slug -> level
  sprintsCoveredByClub: boolean
}
export type WeekComposition = {
  workouts: number
  speedDays: number
  conditioningDay: boolean
  mobilityDay: boolean
  carrier: 'standalone' | 'integrated' | 'micro' | 'none'
}
export function computeWeekComposition(input: AllocationInput): WeekComposition
export const WORKOUT_DAY_CAP = { low: 5, medium: 3, high: 2 } as const
export const MIN_WORKOUT_DAYS = 2
```
Implementation: port `allocateDays`/`effectiveSpeedLevel` 1:1 (count-based; no weekday placement). Add the same sync-comment to the worker file.

- [ ] **Step 1: Failing tests** — replicate the worker's allocation test vectors verbatim: level-3 guarantee (4 days low → 3+1 standalone), level-2 surplus only, 2-day integrated edge, club-damping with COD 3, second speed day from surplus, conditioning level-3 piercing + level-2 low-only, mobility flag, cap low=5.
- [ ] **Step 2: RED → implement → GREEN.**
- [ ] **Step 3: Commit** — `feat(app): week composition mirror of worker day allocation`

---

### Task 4: PillarStepperStep (onboarding) — replaces CategoryFocusStep

**Files:**
- Create: `components/onboarding/steps/pillar-stepper-step.tsx`
- Modify: `app/onboarding.tsx` (step registry: swap CategoryFocusStep → PillarStepperStep), `stores/onboarding-store.ts` (new fields), `components/onboarding/onboarding-progress-wrapper.tsx` (persistence)
- Delete: `components/onboarding/steps/category-focus-step.tsx` (after swap)

**Component contract (pattern: `category-focus-step.tsx` for data-loading/store idiom, `workout-prefs-step.tsx` for counters/hints):**
- Loads `sport_category_relevance` for the stored sport (`relevance`, `categories(id, slug, name_i18n, description_i18n)`) filtered `categories.is_active`; builds presets → `visiblePillars` in `PILLAR_ORDER`.
- Pre-fills via `initialLevels(presets, storedPillarLevels ?? translated-rows-from-DB)` — fetch existing `user_pillar_levels` for prefill (translated rows give returning users a head start), then `normalizeToBudget`.
- Renders one row per visible pillar: icon (`CATEGORY_SVG_ICONS`), label (`getCategoryLabel`), minus/plus stepper (1–3), level pips. Header shows budget counter `spent/budget`.
- Plus disabled at level 3 or when `!canIncrement` (haptic + hint toast on disabled press); minus disabled at 1.
- §3.4 consequence hints under the sprints/cod rows: level 3 → `t('pillars.hint_sprint_level3')`; level 2 → `t('pillars.hint_sprint_level2')` (keys in Task 8). Conditioning level 3 at high load context is not known here — no hint.
- Store: `pillarLevels: PillarLevel[]` + `set` (replaces `targetedCategories` usage in this step; the store field `targetedCategories` and its persistence for OTHER flows is removed in Step 3).
- `setCanContinue(true)` always (preset is a valid default — continuing without touching anything is legitimate).

**Persistence (in `finishOnboarding`/persist block of `onboarding-progress-wrapper.tsx`):**
```typescript
// §6.5 activation: wizard-written levels switch this user to the v2 generator.
const levels = useOnboardingStore.getState().pillarLevels
if (levels.length > 0) {
  await supabase.from('user_pillar_levels').upsert(
    levels.map((l) => ({ user_id: userId, category_id: l.categoryId, level: l.level, set_by_wizard: true })),
    { onConflict: 'user_id,category_id' },
  )
  await supabase.from('user_pillar_levels').delete().eq('user_id', userId)
    .not('category_id', 'in', `(${levels.map((l) => l.categoryId).join(',')})`)
}
```
(Keep the existing `user_targeted_categories` write OUT — remove it together with the old step; check `grep -rn targetedCategories` for all writers first and migrate/remove each.)

- [ ] **Step 1:** Build the component + registry swap (old step still present, unused).
- [ ] **Step 2:** Store fields + persistence + removal of `targetedCategories` writes; delete old step file.
- [ ] **Step 3:** Verify — `npx tsc --noEmit` baseline, `npx jest` green, app boots through onboarding in dev (manual: run onboarding to the pillar step, counters work, budget blocks, DB rows appear with `set_by_wizard = true` on finish — document the psql check).
- [ ] **Step 4: Commit** — `feat(app): pillar stepper replaces category focus step (writes set_by_wizard)`

---

### Task 5: Sprint-context step (onboarding)

**Files:**
- Create: `components/onboarding/steps/sprint-context-step.tsx`
- Modify: `app/onboarding.tsx` (insert after PillarStepperStep; `shouldSkip` when the sprints pillar is hidden for the sport — check store presets), `stores/onboarding-store.ts`, `onboarding-progress-wrapper.tsx` (persist two profile fields)

**Component contract (pattern: single-select option cards like `gender-step`/`goals-step`):**
- Question 1: "Machst du Sprints im Verein?" — yes/no cards → store `sprintsCoveredByClub: boolean`.
- Question 2: "Wie weit sprintest du in deinem Sport am Stück?" — three cards with sport examples (`under_20m` / `20_40m` / `over_40m`, i18n keys Task 8) → store `sprintDistance`.
- Both answered → `setCanContinue(true)`.
- Persistence: add `sprints_covered_by_club` and `sprint_distance` to the existing `user_profiles` update in the finish block.

- [ ] **Step 1:** Component + registry + store. **Step 2:** Persistence + manual dev check (profile columns written). **Step 3: Commit** — `feat(app): sprint context onboarding step`

---

### Task 6: Day-step composition line + per-day durations

**Files:**
- Modify: `components/onboarding/steps/workout-prefs-step.tsx`, `stores/onboarding-store.ts` (`dayDurations: Array<{day_of_week: number; minutes: number}>`), `onboarding-progress-wrapper.tsx` (persist `preferred_day_durations`)
- Create: `components/onboarding/day-duration-sheet.tsx` (pattern: `app/sport-day-editor.tsx` bottom sheet)

**Contract:**
- Under the day toggles, a live composition line from `computeWeekComposition({availableDayCount: selectedDays.size, loadProfile, pillarLevels: fromStore, sprintsCoveredByClub})`: i18n-assembled, e.g. "3 Workouts + 1 Sprint-Einheit · Mobility am Ruhetag" (keys Task 8; carrier `integrated` → "Sprints im Workout integriert", `micro` → no sprint mention).
- Long-press (or a small clock icon) on a **selected** day opens the duration sheet: options 30/45/60/90 min + "Standard" (removes override). Sheet writes `dayDurations` in the store; day tile shows the override as a small badge.
- Persistence: `preferred_day_durations: dayDurations.length > 0 ? dayDurations : null` in the profile update.

- [ ] **Step 1:** Composition line (uses Tasks 2+3 libs). **Step 2:** Duration sheet + badge + persistence. **Step 3:** `npx jest` + tsc baseline + manual dev check. **Step 4: Commit** — `feat(app): week composition line and per-day duration overrides in day step`

---

### Task 7: Wizard mirror (plan regeneration)

**Files:**
- Create: `components/plan-generation/PillarStep.tsx` (wizard variant of the stepper, reads/writes `stores/plan-wizard-store.ts`)
- Create: `components/plan-generation/SprintContextStep.tsx` (wizard variant)
- Modify: `stores/plan-wizard-store.ts` (pillarLevels, sprintsCoveredByClub, sprintDistance, dayDurations + submit persistence identical to Task 4/5/6 writes), `components/plan-generation/ScheduleStep.tsx` (composition line + duration sheet reuse), wizard step registry (where `GoalsStep` is listed — replace GoalsStep with PillarStep, insert SprintContextStep)
- Delete: `components/plan-generation/GoalsStep.tsx` (after swap)

Same contracts as Tasks 4–6; shared pieces (stepper row, duration sheet) extracted into `components/pillars/` if the duplication exceeds trivial — judgement call, note it in the ledger.

- [ ] **Step 1:** PillarStep + SprintContextStep + registry. **Step 2:** ScheduleStep composition + durations; store submit writes (upsert + delete, `set_by_wizard: true`, profile fields). **Step 3:** Verify (tsc, jest, manual wizard run in dev → v2 generator fires: check worker log/plan has `session_type` speed when levels demand). **Step 4: Commit** — `feat(app): wizard pillar step, sprint context and day durations`

---

### Task 8: i18n keys (de + en, complete copy)

**Files:** `i18n/locales/de.ts`, `i18n/locales/en.ts`

```typescript
// de
'pillars.title': 'Deine Schwerpunkte',
'pillars.subtitle': 'Dein Sport setzt die Basis — verteile dein Budget auf das, was dir wichtig ist.',
'pillars.budget': '{{spent}} von {{budget}} Punkten',
'pillars.level_1': 'Erhalt', 'pillars.level_2': 'Fokus', 'pillars.level_3': 'Schwerpunkt',
'pillars.budget_full': 'Budget voll — reduziere zuerst eine andere Säule.',
'pillars.hint_sprint_level3': 'Einer deiner Trainingstage wird zur Sprint-Einheit.',
'pillars.hint_sprint_level2': 'Wenn deine Woche Platz hat, kommt eine Sprint-Einheit dazu.',
'sprint_context.title': 'Sprints & dein Verein',
'sprint_context.club_question': 'Machst du Sprinteinheiten im Verein?',
'sprint_context.club_yes': 'Ja, regelmäßig', 'sprint_context.club_no': 'Nein',
'sprint_context.distance_question': 'Wie weit sprintest du in deinem Sport am Stück?',
'sprint_context.distance_under_20m': 'Unter 20 m', 'sprint_context.distance_under_20m_example': 'Zweikampf, Antritt zum Korb, Richtungswechsel',
'sprint_context.distance_20_40m': '20–40 m', 'sprint_context.distance_20_40m_example': 'Konter über den Flügel, Rückzugsverhalten',
'sprint_context.distance_over_40m': 'Über 40 m', 'sprint_context.distance_over_40m_example': 'Leichtathletik, lange Bälle, Deep Routes',
'week_composition.workouts': '{{count}} Workouts',
'week_composition.speed_days': '{{count}} Sprint-Einheit', 'week_composition.speed_days_plural': '{{count}} Sprint-Einheiten',
'week_composition.conditioning_day': '1 Conditioning-Einheit',
'week_composition.mobility': 'Mobility am Ruhetag',
'week_composition.sprint_integrated': 'Sprints im Workout integriert',
'day_duration.title': 'Dauer an diesem Tag',
'day_duration.standard': 'Standard ({{minutes}} min)',
// en: mirror all keys with English copy (translate faithfully).
```

- [ ] **Step 1:** Add keys both locales (write the English texts, not placeholders). **Step 2:** `npx tsc --noEmit` + grep: no raw `pillars.`/`sprint_context.` strings hardcoded in components. **Step 3: Commit** — `feat(i18n): pillar stepper, sprint context and composition copy`

---

### Task 9: Worker — consume per-day durations

**Files:**
- Modify: `externals/jemp-temporal-worker/src/activities/prepare-plan-generation.ts` (read `preferred_day_durations` from the profile; pass through), `externals/jemp-temporal-worker/src/plan-generation/v2/prepare-v2.ts` (accept `day_minutes`, pass into `buildWeekLayout`)
- Test: extend `externals/jemp-temporal-worker/src/plan-generation/v2/__tests__/gate.test.ts` or a new small test for the pass-through shape

**Contract:** `PlanGenerationInputV2` gains `day_minutes?: Array<{ day_of_week: number; minutes: number }>`; `prepareGenerationV2` forwards it to `buildWeekLayout({ ..., day_minutes: input.day_minutes })`. The engine already honors `day_minutes` (2a tests cover it) — this is pure wiring.

- [ ] **Step 1:** Failing shape test (a pure mapper `parseDayDurations(raw: unknown): Array<{day_of_week:number;minutes:number}> | undefined` that validates the JSONB — rejects malformed entries). **Step 2:** Implement + wire both files. **Step 3:** `npm test` (worker) green, build green. **Step 4: Commit** — `feat(worker): feed per-day duration overrides into the v2 week layout`

---

### Task 10: Closing verification

- [ ] `npx jest` (app) green; `npx tsc --noEmit` root baseline (93); worker `npm test` green + build.
- [ ] Manual dev-run checklist (document results in the ledger; On-Device-QA by the user later): onboarding end-to-end with a team sport (pillar step shows 6 pillars, budget 10), a combat sport (UBP visible, COD hidden), sprint step skipped for a sport with hidden sprints pillar, day step composition reacts to level changes, wizard run produces a v2 plan with a speed session.
- [ ] Commit any leftovers; no workspace cleanup here (that happens after the final review).
