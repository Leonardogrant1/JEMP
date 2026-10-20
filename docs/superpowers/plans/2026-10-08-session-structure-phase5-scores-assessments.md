# Session Structure Redesign — Phase 5: Scores & Assessments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pillar-true scores: split sprint/COD out of the plyo calculator, add the conditioning pillar (RST + Cooper), track score **source** (self_estimate | measured) with 120-day aging, compute the overall score live and sport-weighted (LOCF), and surface it all — badges, retest CTAs, pillar grouping, RST flow — in the app.

**Architecture:** The existing score pipeline stays: `calculateAssessmentScore` (app `lib/score-calculators`, mirrored in `web/lib`) → `use-complete-assessment` writes `metric_entries` + per-category level (avg of latest per assessment) + history snapshot. Phase 5 re-routes attribution via `assessments.category_id` (migration), adds calculators, adds `source`/`measured_at` to `user_category_levels`, and replaces the unweighted overall average with a weighted live computation. Both calculator copies (app + web) change in lockstep.

**Tech Stack:** TypeScript (app jest; web mirrored), SQL migrations (rollout-gate headers like 3a — assessment recategorization changes what legacy clients see), React Native.

**Spec:** `docs/superpowers/specs/2026-10-07-session-structure-redesign-design.md` (§4.1–§4.7, §5.4, §5.5)

**Deferral rulings (recorded here):**
- **§2.7 remainder (one intensity step down, flatter progression on stale/estimated pillars) → post-v1.** The hard consequence — the max-velocity gate — already ships (2b) and *is* the 120-day aging check against `metric_entries`. Generator intensity tuning needs its own careful pass.
- **Weight versioning** stays a non-goal (spec).
- **Drop Jump/RSI, T-Drill** assessments stay v2 (spec non-goals).

## Global Constraints

- Migrations: rollout-gate header (`-- ⚠️ ROLLOUT GATE (§6.3)…`), `SET LOCAL lock_timeout = '5s'`, timestamps from `20261008130000`, idempotent, `supabase migration up` only, types regen with installed CLI.
- Calculator changes land in **both** `lib/score-calculators/` and `web/lib/score-calculators/` — identical files; a jest test pins key norm values so drift is visible app-side.
- `use-complete-assessment` keeps its shape (metric entry → category level avg → snapshot); Phase 5 only extends it (source fields, RST special case, sprint-priority rule).
- No change to legacy visual behavior where source data is missing: `source` defaults to `'self_estimate'`, badges render only when the column exists in the query payload.
- `npx jest` green; root tsc ≤ 85; worker untouched (82). Commit per task + Claude trailer.

## Review Focus

1. **Attribution re-route completeness** — after the migration, sprint/505 assessment completions must feed `sprints`/`cod` levels, never `lower_body_plyometrics`; existing jump assessments keep feeding lbp. Pinned by Task 1's verification SQL + Task 2's map tests.
2. **RST writes two pillars with the priority rule** — run 1 feeds the sprints level only when no dedicated sprint assessment is fresh (≤120 d); a fresh `sprint_30m` must win even if older than the RST. Pinned by Task 6 helper tests.
3. **Weighted overall renormalizes over present pillars** — a user with 4 of 7 pillar levels gets weights renormalized over those 4; zero-weight (hidden) pillars never count. Pinned by Task 5 tests.
4. **LOCF correctness in history** — the overall history line at time t uses each pillar's latest value ≤ t; pillars with no value by t are excluded (renormalized), not treated as 0. Pinned by Task 5 tests.
5. **Source flip** — completing any mapped assessment sets `source='measured', measured_at=now()` for that category; onboarding self-ratings leave `'self_estimate'`. Verified in Task 4 via local DB after a simulated mutation (documented check).

---

### Task 1: Migration — assessment recategorization, RST/Cooper seeds, source columns

**Files:** Create `supabase/migrations/20261008130000_assessment_pillars_and_source.sql`; regenerate `database.types.ts`.

- [ ] **Step 1: Write + apply** (idempotent, gate header, lock_timeout):

```sql
-- 1. Re-route assessment attribution (spec §4.6): sprint tests → sprints, 505 → cod.
UPDATE assessments SET category_id = (SELECT id FROM categories WHERE slug = 'sprints')
WHERE slug IN ('sprint_10m','sprint_30m','sprint_10m_flying');
UPDATE assessments SET category_id = (SELECT id FROM categories WHERE slug = 'cod')
WHERE slug = 'agility_505';

-- 2. Source tracking (spec §4.1): default self_estimate; assessments flip to measured.
CREATE TYPE score_source AS ENUM ('self_estimate','measured');
ALTER TABLE user_category_levels
    ADD COLUMN source score_source NOT NULL DEFAULT 'self_estimate',
    ADD COLUMN measured_at TIMESTAMPTZ;

-- 3. Backfill: categories with any scored assessment entry are measured
--    (measured_at = latest completed assessment for that category).
UPDATE user_category_levels ucl SET source = 'measured', measured_at = sub.last_at
FROM (
  SELECT ua.user_id, a.category_id, max(ua.completed_at) AS last_at
  FROM user_assessments ua
  JOIN assessments a ON a.id = ua.assessment_id
  JOIN metric_entries me ON me.user_assessment_id = ua.id AND me.score IS NOT NULL
  WHERE ua.status = 'completed'
  GROUP BY ua.user_id, a.category_id
) sub
WHERE sub.user_id = ucl.user_id AND sub.category_id = ucl.category_id;

-- 4. New metrics + assessments: RST (two inputs collapsed app-side) and Cooper.
--    (Metric units follow the metrics table conventions — scout the seed
--    20260420072120 for the exact column shape before writing the INSERTs.)
--    rst_drop_off (percent), rst_mean_time (seconds), cooper_distance (meters);
--    assessments: repeated_sprint_test → conditioning, cooper_test → conditioning,
--    both guarded WHERE NOT EXISTS, with name/description + i18n columns per
--    the 20260420072157 seed shape.
```

- [ ] **Step 2: Verify** — sprint assessments now point at `sprints`/`cod` (SQL count); `repeated_sprint_test`/`cooper_test` exist with category `conditioning`; `user_category_levels.source` populated (measured count matches users with completed scored assessments). Regenerate types; tsc baseline unchanged.
- [ ] **Step 3: Commit** — `feat(db): assessment pillar re-route, RST/Cooper seeds, score source tracking`

---

### Task 2: Calculators — sprints, cod, conditioning; lbp slim-down (both copies)

**Files:** Create `lib/score-calculators/sprints.ts`, `cod.ts`, `conditioning.ts`; Modify `lower-body-plyometrics.ts` (remove sprint/505 norms), `index.ts`, `assessment-score.ts` (map re-route + new entries); mirror ALL to `web/lib/score-calculators/`; Test `lib/__tests__/score-calculators.test.ts`.

**Interfaces:**
```typescript
// sprints.ts — norms move verbatim from lower-body-plyometrics.ts
export type SprintExercise = '10m_sprint' | '30m_sprint' | '10m_sprint_flying'
export function sprintLevel(timeSeconds, bodyWeight, age, gender, exercise): number

// cod.ts — 505 norm moves verbatim
export function codLevel(timeSeconds, bodyWeight, age, gender): number

// conditioning.ts (spec §4.4: drop-off + absolute combo — pure drop-off rewards slowness)
export function rstConditioningLevel(times: number[], age, gender): number
//   dropOff = (mean(last2) - mean(first2)) / mean(first2) * 100
//   zDrop   = (6.0 - ageAdjustedDropOff) / 3.0        // mean 6 %, std 3 %
//   zMean   = (meanNorm - ageAdjustedMeanTime) / stdMean  // 30m norms: male 4.45/0.35, female 5.15/0.40
//   level   = toLevel(0.6 * zDrop + 0.4 * zMean)
export function cooperLevel(distanceMeters, age, gender): number
//   male mean 2400 m, std 350; female mean 2000 m, std 320 (ageFactor like others)
```
`ASSESSMENT_SCORE_MAP` changes: `sprint_10m/30m/flying → { type:'sprint', … }`, `agility_505 → { type:'cod' }`, `cooper_test → { type:'cooper' }` (RST is NOT in the map — its flow computes directly, Task 6). `jumps.ts` stays (vertical/broad/box — merged pillar keeps both calculators internally; attribution via DB categories, so no merge needed in code — note this as a ruling: spec §4.4 said "one calculator", the DB-attribution makes the file merge cosmetic; skip it).

- [ ] **Step 1: Failing tests** — pin: `sprintLevel(1.80, 75, 25, 'male', '10m_sprint')` equals the old `lowerBodyPlyometricsLevel` value for the same input (continuity!); `codLevel` ditto for 505; `rstConditioningLevel([4.4,4.45,4.6,4.7,4.85,4.9], 25, 'male')` returns a plausible 1–100 and **a slower runner with identical drop-off scores lower**; `cooperLevel(2400, 25, 'male')` ≈ 50; map: `calculateAssessmentScore('sprint_10m', …)` still returns the same number as before the split.
- [ ] **Step 2: Implement app copy → GREEN; copy files to web/lib verbatim; `git diff --stat` shows both.**
- [ ] **Step 3: Commit** — `feat(scores): sprint/cod/conditioning calculators, pillar-true assessment map`

---

### Task 3: Level recompute for re-routed history (§4.6)

**Files:** Create `supabase/migrations/20261008130100_recompute_pillar_levels.sql`.

Existing users' sprint/505 scores still sit inside their `lower_body_plyometrics` average. One idempotent SQL pass recomputes `user_category_levels` for the four affected categories (`lower_body_plyometrics`, `sprints`, `cod`) as avg of latest `metric_entries.score` per assessment, joined through the **new** `assessments.category_id`; inserts rows (source `measured`, `measured_at` = latest) where a user gains a new pillar level, updates where the avg shifted. Categories without any scored entries: leave untouched.

- [ ] **Step 1: Write + apply; verify** — a user with completed `sprint_10m` now has a `sprints` level row; their lbp level no longer includes sprint scores (spot-check one local user with SQL before/after).
- [ ] **Step 2: Commit** — `feat(db): recompute pillar levels from re-routed assessment history`

---

### Task 4: Source flip on completion

**Files:** Modify `mutations/use-complete-assessment.ts`.

The category-level upsert gains `source: 'measured', measured_at: new Date().toISOString()`. Nothing else changes (onboarding's `category-level-step` writes keep the `self_estimate` default).

- [ ] **Step 1: Implement; verify** via local DB: run the mutation logic path in review (no simulator) — document the expected row shape in the ledger; tsc green.
- [ ] **Step 2: Commit** — `feat(app): assessments flip pillar source to measured`

---

### Task 5: Weighted live overall score + LOCF history

**Files:** Create `lib/pillar-score.ts`, Test `lib/__tests__/pillar-score.test.ts`; Modify `hooks/use-overall-score.ts`, the progress screen's 'all' series derivation (`app/(tabs)/progress.tsx` + `queries/use-user-category-history-query.ts` — scout), `constants/progress-constants.ts` (ALL_STAT_SLUGS → 7 pillars).

**Interfaces:**
```typescript
export type PillarValue = { slug: string; level: number }
export type PillarWeight = { slug: string; weight: number }   // sport_category_relevance.score_weight; relevance 0 ⇒ excluded upstream
export function weightedOverall(values: PillarValue[], weights: PillarWeight[]): number | null
//   renormalizes over pillars present in BOTH lists; null when empty (§4.7, §4.3)
export type HistoryPoint = { slug: string; level: number; recordedAt: string }
export function overallSeries(points: HistoryPoint[], weights: PillarWeight[]): Array<{ recordedAt: string; level: number }>
//   LOCF: at each distinct recordedAt, each pillar's latest value ≤ t; missing pillars excluded + renormalized
```
`use-overall-score` consumes `weightedOverall` with weights from a new tiny query on `sport_category_relevance` (user's sport, `relevance > 0`); fallback: all weights 1 when no sport (behavior ≈ today). Progress 'all' line: computed via `overallSeries` from per-category history (DB 'all' rows become fallback-only for pre-pillar history), per §4.7 "overall is never persisted" — the snapshot RPC keeps writing them, ignore-not-remove (ruling: removing the RPC write is a cleanup migration later).

- [ ] **Step 1: Failing tests** — renormalization (4 of 7 pillars), zero-weight exclusion, LOCF (pillar measured early keeps carrying), empty → null.
- [ ] **Step 2: Implement + rewire; jest + tsc green; manual: progress tab still renders (dev).**
- [ ] **Step 3: Commit** — `feat(app): sport-weighted live overall score with LOCF history`

---

### Task 6: RST flow + sprint-priority rule

**Files:** Create `lib/rst.ts` + test; Create `app/assessment-rst.tsx` (6-input flow, pattern: `app/assessment/[id].tsx` input idiom); Modify `mutations/use-complete-assessment.ts` (RST branch), `app/(tabs)/assessments.tsx` (route `repeated_sprint_test` to the RST flow).

**Interfaces:**
```typescript
export function rstDerive(times: number[]): { dropOffPct: number; meanTime: number; run1: number } // validates 6 ascending-ish positive times
export function shouldFeedSprintScore(existing: Array<{ assessmentSlug: string; completedAt: string }>, now: Date): boolean
//   false when a dedicated sprint assessment (sprint_10m/30m/flying) is ≤ 120 days old (§4.4 priority rule)
```
Flow: six time inputs → `rstDerive` → completion writes (a) `metric_entries` for `rst_drop_off` + `rst_mean_time` under the RST user_assessment, conditioning level via `rstConditioningLevel` (source measured); (b) **iff** `shouldFeedSprintScore`: a `metric_entries` row on the 30m sprint metric with run1's value + its `sprintLevel` score attributed to `sprints` — flowing through the existing per-category averaging. Cooper runs through the normal single-input flow (map entry from Task 2).

- [ ] **Step 1: Failing tests** for both helpers (validation, drop-off math, priority rule incl. the "older dedicated test still wins" case).
- [ ] **Step 2: Implement helpers → GREEN; build flow + mutation branch; tsc green.**
- [ ] **Step 3: Commit** — `feat(app): repeated sprint test flow feeding conditioning and sprints`

---

### Task 7: Progress & assessments UI — pillar grouping, badges, CTAs

**Files:** Modify `app/(tabs)/progress.tsx` (sport-visible pillar filter via `sport_category_relevance` relevance>0; source badge per pillar: `measured` fresh / `measured` stale (>120 d) / `self_estimate`, with retest/measure CTA linking to the matching assessment), `app/(tabs)/assessments.tsx` (group list by pillar category; "Empfohlen für dich" row = assessments of stale/estimated pillars first), i18n keys (both locales): `score_source.measured`, `score_source.stale`, `score_source.estimated`, `score_source.cta_measure`, `score_source.cta_retest`, `assessments.recommended`.

- [ ] **Step 1: Scout both screens' data queries (levels query needs `source, measured_at` added) and implement; `STALE_AFTER_DAYS = 120` lives in `lib/pillar-score.ts`.**
- [ ] **Step 2: jest + tsc green; Commit** — `feat(app): pillar filtering, source badges and retest recommendations`

---

### Task 8: Closing verification

- [ ] `npx jest` green; root tsc ≤ 85; worker 82 untouched; web typecheck if cheap (`cd web && npx tsc --noEmit` — note result, don't fix unrelated).
- [ ] Ledger QA checklist (user, on-device): complete a sprint assessment → sprints level appears (not lbp), source badge "gemessen"; progress tab shows only sport-visible pillars; overall score shifts when sport weights differ; RST flow end-to-end (6 inputs → conditioning + sprints levels, but sprints skipped when a fresh 30m test exists); stale badge after faking `measured_at` −5 months via SQL; Cooper via normal flow; legacy user (no new data) unchanged.
- [ ] Commit leftovers.
