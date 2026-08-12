# Achievements & Titles (Gamification v1) — Design

**Date:** 2026-08-12
**Branch:** `feat/achievements-titles`
**Status:** Approved design, pending implementation plan

## Overview

Add a gamification layer on top of JEMP's existing 1–100 scoring system:

1. **Titles** — a tier label derived from the user's overall score (avg of the 5 category levels), displayed as a chip in the profile. Purely derived, never persisted. Rises and falls with the score.
2. **Achievements** — permanent, absolute assessment milestones ("100kg Bench Club", "20 Pull-ups", "60cm Vertical"). Unlocked once, kept forever, persisted in Supabase.

### Goals (v1)

- Self-motivation & retention: unlock moments, collection drive, "next up" pull.
- Persist unlock history (`unlocked_at`) so a future social layer inherits it.

### Non-goals (v1)

- No social features, sharing, leaderboards, or visibility settings.
- No relative (bodyweight-multiple) milestones, no consistency/streak achievements, no per-category titles — all explicitly deferred (see Future Work).
- No mobility milestones (mobility is a 1–10 self-rating; nothing absolute to crack).

## Tier System & Titles

New shared helper `constants/tiers.ts` — single source of truth for score tiers app-wide, replacing the private `scoreToLabelKey` in `components/onboarding/steps/category-level-step.tsx`.

| Range  | Slug       | Notes                          |
| ------ | ---------- | ------------------------------ |
| 90–100 | `apex`     | New top tier. "Apex Athlete".  |
| 85–89  | `elite`    | Existing label, narrowed.      |
| 65–84  | `advanced` |                                |
| 45–64  | `average`  |                                |
| 25–44  | `beginner` |                                |
| 1–24   | `novice`   |                                |

- `tierForScore(score: number): Tier` — clamped, integer-based, exported alongside a `TIERS` constant (slug, min, accent color, icon).
- Each tier gets an accent color for the title chip; `apex` must visually stand out (gold/iridescent, not "greener green"). Related but separate from `gaugeColor()` in `helpers/progress-helpers.ts`, which stays untouched.
- i18n keys move from `onboarding.category_level_*` to a neutral `tiers.*` namespace (all locales). Onboarding's `category-level-step.tsx` is refactored to consume the shared helper. Tier display names stay English in all locales (like "Elite" today).
- Title derivation: overall score = round(avg of `ALL_STAT_SLUGS` levels) exactly as `app/(tabs)/progress.tsx` computes it today — factor that into a shared helper/hook so profile and progress use one implementation.
- No completed assessments → no overall score → no title; profile shows an "earn your title" hint instead.

## Achievement Catalog

Definitions live in code (`constants/achievements.ts`), following the app's client-side-scoring pattern. No definitions table in the DB.

```ts
type AchievementDef = {
  slug: string;              // 'bench_100' → i18n keys achievements.bench_100.*
  assessmentSlug: string;    // keyof ASSESSMENT_SCORE_MAP — compile-time checked
  threshold: number;         // metric base unit (kg, cm, m, s, reps)
  direction: 'gte' | 'lte';  // sprints/agility are lte ("under X seconds")
  gender?: 'male' | 'female'; // omitted = applies to everyone
};
```

- Organized as **ladders** per exercise (e.g. bench 60/80/100/140). Unlocking a high rung auto-unlocks lower rungs.
- **Gender-specific strength ladders from day one**: entries with `gender` set only apply to matching profiles. Female ladders for the 1RM lifts (e.g. bench 40/60/80/100). Gender `other` uses the same fallback the score calculators use for their norm tables (align at implementation time with `lib/score-calculators/strength.ts`).
- **Thresholds stay metric-round** (100 kg, not 220 lbs). Imperial users see converted display values; the milestone identity stays metric. No parallel lbs grid.
- Proposed ladders (exact numbers curated during implementation — pure catalog work):
  - **1RM:** bench 60/80/100/140 · back squat 100/140/180/220 · RDL 100/140/180/220 · hip thrust 140/180/220/260 · weighted pull-ups +10/+20/+40 kg (plus female ladders)
  - **Reps:** pull-ups 5/10/15/20 · push-ups 20/40/60 · dips 10/20/30 · clap push-ups 5/15/30
  - **Jumps:** vertical 40/50/60/70 cm · broad 200/250/300 cm · box 80/100/120 cm
  - **Throws:** MB chest / overhead / rotational — 2–3 distance marks each
  - **Speed (`lte`):** sprint and 5-0-5 agility times — 2–3 marks each
- Expected size: ~45–55 achievements.

## Data Model

New migration `create_user_achievements` (follows existing migration + RLS conventions):

```sql
user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_slug text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  value numeric,            -- measured value at unlock, for UI detail
  UNIQUE (user_id, achievement_slug)
)
```

- RLS: `auth.uid() = user_id` for SELECT and INSERT. No UPDATE/DELETE policies — unlocks are immutable. (Row cleanup on account deletion is handled by the FK cascade.)
- The UNIQUE constraint + upsert-ignore makes awarding idempotent; duplicate unlocks are impossible at the DB level.
- Regenerate `database.types.ts` after the migration.

## Award Flow

Core is a pure, unit-testable function (new `lib/achievements.ts`):

```ts
computeNewUnlocks(input: {
  assessmentSlug: string;
  value: number;
  gender: Gender;
  alreadyUnlocked: Set<string>;
}): AchievementDef[]
```

Integration in `mutations/use-complete-assessment.ts`, right after the metric-entry insert:

1. Read already-unlocked slugs from the React Query cache (`user-achievements` query; fetch if cold).
2. `computeNewUnlocks(...)` → batch upsert (ignore duplicates) into `user_achievements`.
3. Invalidate the achievements query; return `newUnlocks` in the mutation result so the completion UI can trigger the celebration.

Data access follows existing conventions: `queries/use-user-achievements-query.ts` + entry in the query-keys module.

## Backfill (existing users)

When the achievements query resolves empty **and** the user has `metric_entries`, run a silent, idempotent backfill:

1. Best value per assessment from the user's metric-entry history (respecting `direction`).
2. `computeNewUnlocks` with an empty unlocked set.
3. Insert with `unlocked_at` = the original entry's timestamp (historically accurate, not "everything today").
4. **No celebration** for backfilled unlocks.

Idempotent by design (UNIQUE constraint), so re-running for a user with genuinely zero unlocks is cheap and harmless.

## UI

Four surfaces, all using the established glass recipe / sheet construction / SVG icon system:

1. **Title chip — `app/(tabs)/profile.tsx`.** Glass pill under the name (where the sport tag area is), tier accent color + small tier icon (crown/laurel for apex, plainer markers below). No assessments → subtle "earn your title" pill linking to the assessments tab. Tap opens the achievements screen.
2. **Achievements screen — `app/achievements.tsx`** (pushed route). Entry points: title chip tap, an "Achievements" row in the profile settings groups, and a button on the celebration sheet. Not in the tab bar.
   - Header: current title, progress to next tier boundary ("Elite — 4 points to Apex"), unlock counter ("12 / 52").
   - Ladder cards grouped by category; each exercise row renders its rungs as a chain — unlocked rungs in accent color (date + value in detail), locked rungs grayed with threshold.
   - **"Next up"** per ladder: gap between current best and the next rung ("7.5 kg to the 100kg Club"). This is the retention hook.
3. **Unlock celebration sheet.** Shown after assessment completion when the mutation returns `newUnlocks`: sheet construction + Lottie confetti, big badge, achievement title, achieved value. Multiple unlocks at once → **one** sheet celebrating the highest rung per ladder, lower rungs listed small beneath. Never a modal stack. Includes "view all achievements" button.
4. **Progress tab mini-integration.** `ProgressHeroCard` shows the tier label as a subline to the big number ("92 · Apex"). Nothing else changes in the progress tab.

## i18n

- `tiers.*` — six tier names (English display names in all locales).
- `achievements.<slug>.title` / `.description` per catalog entry, all supported locales.
- Screen/sheet strings (headers, counters, "next up" template, celebration copy).

## Testing

- Unit tests: `tierForScore` (boundary values 24/25/44/45/64/65/84/85/89/90) and `computeNewUnlocks` (ladder auto-unlock, `lte` direction, gender filtering, already-unlocked exclusion).
- Everything else verified manually against the local dev DB (assessment completion → celebration → screen states → backfill with an existing account).

## Future Work (explicitly deferred)

- Relative milestones (bodyweight multiples: 1×/1.5×/2× BW lifts).
- Consistency/activity achievements (first assessment, 10 assessments, re-assessment cadence).
- Per-category titles ("Elite Jumper") on the progress tiles.
- Social layer: sharing, comparing, leaderboards — enabled by the persisted `unlocked_at` history.

## Key Decisions Log

| Decision | Choice |
| --- | --- |
| v1 purpose | Self-motivation only; data model must not preclude social later |
| v1 achievement types | Absolute milestones only (+ titles) |
| Tier structure | 6 tiers, new distinct 90–100 top tier |
| Top tier name | **Apex** |
| Title scope | Overall score only |
| Milestone coverage | All assessment types (except mobility) |
| Architecture | Catalog in code + `user_achievements` unlock table (approach A) |
| Gender thresholds | Gender-specific strength ladders in v1 |
| Units | Metric-round thresholds, converted display for imperial |
