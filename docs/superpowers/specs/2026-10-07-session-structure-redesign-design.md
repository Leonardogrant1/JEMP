# Session Structure Redesign (Pillars, Session Types, Fatigue Logic) — Design

**Date:** 2026-10-07
**Branch:** `feat/session-structure`
**Status:** Approved design, pending implementation plan

## Overview

Restructure JEMP's training taxonomy so a plan covers everything an athlete needs. Input came from an athlete with a coaching license plus a session with an athletics coach.

Three big moves:

1. **Six pillars** replace the current five categories: Strength, Lower-Body Plyometrics (absorbs Jumps), Sprints, Change of Direction (COD), Conditioning, Mobility. Upper-Body Plyometrics dissolves into exercise metadata.
2. **Session types** — sessions get an enum `workout | speed | mobility | conditioning`. Speed bundles sprints + COD. All types share the existing block structure and tables.
3. **Fatigue-cost planning** — each pillar/session type carries a fatigue value; the generator places the week deterministically from those values instead of hardcoded special cases.

Supporting changes: pattern metadata on exercises (vertical/horizontal push/pull, knee/hinge, plyo max/submax, core stability/power, sprint acceleration/max-velocity/resisted), a budgeted pillar-priority UI replacing the focus ranking, and a source-tracked, aging score architecture per pillar.

### Goals

- Every session plans the patterns an athlete actually needs, rotating variants across the week so the week covers everything.
- Sprints, COD, conditioning, and mobility become first-class, correctly dosed content — not misfiled plyometrics.
- The generator guarantees physiological placement rules (48h/72h) as hard constraints.
- Scores become sport-independent raw values with a sport-specific presentation layer, so switching sports never loses data.

### Non-goals (v1)

- Speed+workout double days with workout restructuring (v1.5).
- Taper logic before fights/competitions (v2).
- Drop Jump/RSI and T-Drill assessments (v2).
- Weight versioning for score presentation (accepted: retroactive recomputation shifts history slightly when presets are tuned).

---

## 1. Data Model

### 1.1 Pillars (categories table migration)

The existing `categories` table becomes the pillar table:

| Pillar slug | Fate |
|---|---|
| `strength` | stays |
| `mobility` | stays |
| `lower_body_plyometrics` | stays; **absorbs `jumps`** (they measured the same construct). User-facing label via i18n: "Sprungkraft" / "Jumping & Reactive Power". Lower body only. |
| `jumps` | merged into `lower_body_plyometrics`, row **deactivated, not deleted** |
| `upper_body_plyometrics` | **dissolved**: exercises move to `strength` with ballistic metadata tags; row deactivated |
| `sprints` | **new** — sprint exercises move here from lower_body_plyometrics |
| `cod` | **new** — agility drills (505, T-Drill, shuttles) move here |
| `conditioning` | **new** — circuits, intervals, sled conditioning formats |

Exercise re-mapping on migration: sprint drills (sprints, resisted/hill variants, A-/B-skips, wall drills, high knees, etc.) → `sprints`; change-of-direction drills → `cod`; rotational med ball slams/throws and cable rotational presses → `strength` with pattern `rotation` (ballistic variants additionally tagged with `plyo_type`); med ball chest pass / plyo push-ups → `strength`, push pattern + `plyo_type` tag.

Categories get an active/inactive flag. Deactivated rows keep FK integrity for anything referencing them (score history, old targeted_categories); deletion is a separate cleanup migration months later.

### 1.2 Session types

`sessions.session_type` enum: `workout | speed | mobility | conditioning`, default `workout` (covers all existing rows, no backfill). All session types use the same block structure (`warmup/primary/secondary/accessory/cooldown`) and the same tables — `session_type` is only an enum. Block types are **not** touched.

### 1.3 Exercise metadata (new nullable columns)

- `strength_pattern`: `push_vertical | push_horizontal | pull_vertical | pull_horizontal | knee_dominant | hinge | rotation` — **exactly one primary pattern per exercise**. Hybrid exercises (e.g., cable rotational punch press = push + rotation) get the pattern whose weekly slot they fill (here: `rotation` — the training stimulus is rotational force transfer; it competes with woodchops, not bench press).
- `plyo_type`: `maximal | submaximal` (on plyo exercises; also used as a ballistic tag on strength exercises like med ball throws).
- `core_type`: `stability | power`.
- `sprint_type`: `acceleration | max_velocity | resisted`.
- `laterality` already exists (bilateral/unilateral/alternating) and covers single/double leg.

### 1.4 Conditioning prescription

Conditioning is prescribed as **formats, not exercises**: the same movement becomes conditioning through duration and rest. Block-exercise rows get nullable interval fields `work_seconds`, `rest_seconds`, `rounds` — used in conditioning blocks instead of sets×reps. No partner exercises (pads/mitts excluded; solo bag work allowed).

### 1.5 Pillar priority (replaces focus ranking)

Per-user pillar levels: **1 = maintain, 2 = focus, 3 = emphasis**, under a point budget (~10 across 6 pillars; max sum 18 is unreachable by design — users trade, not stack).

- The user can **never** set a pillar to 0. Effective zeros come only from the system: sport preset marks a pillar irrelevant (hidden from the user entirely), sprints covered by the club (onboarding answer), conditioning damped by high weekly load.
- Sport presets extend `sports_and_relevances`: default level per sport × pillar (0 = irrelevant) plus score weights (§4.3).
- Existing focus rankings are translated to a level approximation on migration (lossy, acceptable).

### 1.6 Scores

Raw score per pillar, sport-independent (0–100 level, z-score based as today). Each value carries:

- `source`: `self_estimate | measured`
- timestamp for aging (§4.1)

Sport weighting is a pure presentation/planning layer on top (§4.3).

---

## 2. Generator & Fatigue Logic

### 2.1 Deterministic week layout (new pre-stage)

A new step **before** the existing Phase A, implemented as rule code, **not** LLM: hard physiological constraints must be guaranteed by an algorithm; the LLM keeps doing exercise selection and ordering within sessions.

**Inputs:** pillar levels (1–3, system zeros), weekly schedule (club days + intensity, `game`/`tournament` days), workout cap by weekly load, user's available days.
**Output:** one session slot per weekday with `session_type`.

**2.1a Day allocation:**

- `workouts = min(cap(weekload), available_days)` — unchanged from today.
- **Sprint level 3:** speed is guaranteed one of the available days; workouts drop to `workouts − 1` (never below the minimum of 2). The user chose this priority — it is not a loss.
- **Sprint level 2:** speed gets its own day **only if a day is left over the workout cap** (e.g., 4 days available, cap 3 → 3 workouts + 1 speed). No spare day → no standalone; the sprint block integrates into a workout (§2.5).
- **Sprint level 1:** micro-dose only, never an own day.
- Mobility never consumes a day from the budget (fatigue 0); standalone mobility session only from mobility level 2, placed on rest days.
- Conditioning session only when weekly load permits (§2.2) and a day is available; otherwise finisher-scale content or nothing.

**2.1b Weekday placement (fatigue rules):**

Fatigue constants per session type (single constants file): mobility 0 · conditioning 2 · workout 3 · speed 4.

1. Place the speed day: never <72h before a `game`/`tournament`, not directly after the game.
2. Place the **heavy lower-body emphasis** on the workout farthest from the speed day (≥48h). The 48h rule applies to the heavy lower day — which the generator itself assigns via pattern rotation, so this is always satisfiable.
3. Workouts adjacent to the speed day get the upper-leaning / light lower-body variant of the weekly rotation.
4. Conditioning never on the day directly before a game.
5. Game weeks: speed session scales to maintenance volume (2–4 × 20–30m) instead of a development session. No legal window at all (two games/week): standalone drops, micro-dose moves into the workout warmup.

Worked example (soccer, club Tue/Thu, game Sat, JEMP days Mon/Wed/Fri/Sun, medium load = cap 3, sprint level 2): 1 spare day → speed Monday (MD-5); heavy lower Wednesday; Friday light/upper (pre-game); Sunday moderate; mobility floats onto Tue/Thu evenings or Sat morning. Every placement matches what a coach would do by hand, and none is a special case in code.

### 2.2 Conditioning damping

High weekly club load → conditioning sessions reduced or dropped (club training *is* conditioning: repeated actions, incomplete recovery). No extra onboarding question — weekly load data already exists. Combat-sport presets keep conditioning high (round formats are their best conditioning).

### 2.3 Pillar levels → dose

Constants table per pillar: level 1 = maintenance frequency/volume, 2 = focus, 3 = emphasis. (E.g., sprints: 1 = warmup micro-dose, 2 = one speed session, 3 = up to two if the week allows.)

### 2.4 Pattern slots in workouts

Replaces category quotas + the body_region coverage patch. Every workout keeps the base slots: Push, Pull, Lower Body, Rotation, Core, Plyo, Accessory — **this base structure is invariant**. Variants rotate across the week: push/pull vertical↔horizontal, knee↔hinge, laterality single↔double, plyo max↔submax, core stability↔power. Weekly coverage rule: every pattern at least once per week. Patterns come from the new exercise metadata instead of the `BODY_REGION_TO_PATTERN` derivation. CNS mini-steps (fast feet / short accelerations) are a fixed warmup component of every workout. Accessory = small muscles (adductors, hip flexors, calves, feet; optionally biceps/triceps).

### 2.5 Sprint content carriers

Per user, in priority order:

1. **Standalone speed session (default from sprint level 2, day budget permitting):** its own day, outdoors, **zero equipment** (drills + sprints + COD with nothing but markers). This is the main reason speed stays standalone: it happens at a different location than the workout (park/track vs. gym), and it is the easiest session to schedule anywhere. Structure: warmup → drills (A-/B-skips, wall drills) → sprint main part → COD block (COD rotates; not every speed session needs both).
2. **Integrated sprint block (fallback when no day is free):** on the game-farthest workout day, directly after the warmup (high/low principle: consolidate high-CNS content on the same day, sprint first while fresh, then lift — same-session sprint→lift is standard practice; the 48h rule applies between days). Environment-filtered pool: gym users get resisted/stairs/sprint-in-place variants instead of free 30m sprints.
3. **Micro-dose (always, every workout):** CNS mini-steps + a few short accelerations in the warmup.

`sprint_type` gating: acceleration always; max velocity only if the onboarding distance answer is >20m **and** a measured (not estimated) sprint value exists — max velocity is the most expensive, riskiest content and never a default. Combat athletes: acceleration + hill/sled + intervals, no flying sprints (no 40m runway exists in a fight; hills force the forward lean of entries and protect hamstrings).

Weekly sprint exposure is kept even in game weeks (maintenance dose): regular near-max sprinting is hamstring injury *prophylaxis* — players who never sprint in training are most at risk in the match.

### 2.6 Conditioning session content

The generator picks a **format** (machine intervals 30/30, circuit 40/20, repeated sprints, solo bag rounds, tempo runs) matching equipment and sport, then fills it from the pool. Prescription = `work_seconds`/`rest_seconds`/`rounds`.

### 2.7 Conservative mode for estimated values

Pillars with `self_estimate` or aged-out values → one intensity step down, flatter progression, no max-velocity content, plus an assessment prompt in the app. Measuring is the path to more intense content.

### 2.8 Where it lives

Worker (`generate-plan.ts`, `prompts.ts`, schemas, constants) and the edge-function mirror `supabase/functions/generate-trainings-plan/` — changed in sync, as with previous generator packages.

---

## 3. Onboarding & Priority UI

### 3.1 New/changed onboarding steps

- **Sprint context (new, 2 questions):** "Do you do sprint sessions with your club?" (yes → system damps the sprint pillar, no sprint sessions) and "How far do you sprint at a stretch in your sport?" (<20m / 20–40m / >40m, with sport examples) → steers acceleration vs. max velocity.
- **Pillar priority (replaces CategoryFocusStep):** sport preset pre-distributes levels; user adjusts six steppers (levels 1–3) under a visible budget counter (~10 points). Pillars with preset 0 don't appear. No user-facing "off".
- **Self-assessment per visible pillar:** simple anchored rating (e.g., "I rarely sprint / regularly / fastest on my team"), stored as `self_estimate` start values. No forced assessments up front — conservative planning protects.
- **Day selection as today** (toggles, workout cap by weekly load), extended with: required-day communication ("Your plan needs 3 workout days + 1 speed day — pick 4 days") and the opt-in "I can train twice a day" (enables conditioning doubles; mobility stacks even without opt-in).
- **Weekly schedule unchanged** — already captures club days, intensity, game/tournament days.

### 3.2 Wizard

Same building blocks mirrored into plan regeneration (pillar steppers, days, opt-in), as weekload/schedule already are.

### 3.3 Multi-session days (stacking matrix)

1. **Mobility + anything: always allowed**, no opt-in (fatigue 0; evening after a workout is a classic slot).
2. **Conditioning + workout: allowed with opt-in** (conditioning after lifting or as PM session; never the day before a game).
3. **Speed + workout same day: v1.5** — requires the generator to turn that day's workout upper-leaning (lower slot moves to another day, weekly coverage preserved). Deferred: it touches pattern rotation at its most sensitive point for a minority of users.
4. **Never:** speed + heavy lower same day, speed + conditioning same day (quality conflict).

### 3.4 Transparency principle

**Every generator session-type decision is announced before it can surprise the user, at the place where they can influence it:**

- Pillar stepper: raising sprints to 3 shows "One of your training days becomes a sprint session." (Level 2: "If your week has room, a sprint session is added.")
- Day step: live exact composition — "Your week: 3 athletic workouts + 1 sprint session + mobility on rest days." Exact, not estimated: day allocation (§2.1a) is deterministic from levels + cap + day count, no generator needed.
- Pre-confirm week overview: per-day session type with icon/label/color; sessions movable afterwards with soft warnings (§5.6).

---

## 4. Scores & Assessments

### 4.1 Raw-value architecture

Per-pillar sport-independent score (0–100, z-score calculators as today) with `source` (`self_estimate | measured`) and timestamp. **Aging:** measured values older than ~4 months fall back to "uncertain" — score stays visible, marked stale, retest prompted. Estimated/stale pillars are the natural assessment trigger: the app requests exactly the assessment that makes the most uncertain pillar measurable.

### 4.2 Consequences of source

`self_estimate` or stale → conservative mode (§2.7) and hard gating: **no max-velocity content without a measured sprint value**, regardless of the distance answer.

### 4.3 Sport weighting as a layer

Raw values never change on sport switch — only the weighting for the overall score and display ("For soccer your sprint value counts double"). Weights live per sport × pillar in the extended `sports_and_relevances`. User-explainable: "Your values are your values; your sport decides which ones shine."

### 4.4 Calculator restructuring (`web/lib/score-calculators`)

- `jumps.ts` + `lower-body-plyometrics.ts` → **one** calculator for the merged pillar (vertical/broad/box jump). Sprint times are removed here.
- **New `sprints.ts`:** 10m (acceleration), 30m, 10m flying (max velocity) — norms already exist, they relocate.
- **New `cod.ts`:** 505 agility (norm exists); T-Drill later.
- **New `conditioning.ts`:** Repeated Sprint Test — 6 × 30m with 25s rest; scored on percentage drop-off from run 1 to run 6 (normalizes for own sprint speed, so it measures fatigue resistance, not speed again). Run 1 additionally feeds the sprint score: one setup, two pillars. Fallback: Cooper 12-minute run (published norm tables by age/sex). The Yo-Yo IR and 30-15 IFT were rejected for space/audio requirements; Assault Bike rejected as standard for device availability.
- `upper-body-plyometrics.ts` dissolved: med ball throws + clap push-ups feed the **strength score** as its explosive upper-body component, sport-weighted (fighters high, soccer near zero) — mirroring where the exercises themselves moved.
- `strength.ts`, `mobility.ts` stay; strength gains the throw component.

### 4.5 Assessment coverage per pillar

| Pillar | Assessments | Status |
|---|---|---|
| Strength | 5× 1RM + max-reps tests (+ med ball throws as weighted component) | exists |
| Lower-Body Plyometrics | Vertical/Broad/Box Jump | exists |
| Sprints | 10m, 30m, 10m flying | exists (recategorized) |
| COD | 505 Agility | exists (recategorized) |
| Conditioning | Repeated Sprint Test; Cooper fallback | **new** |
| Mobility | existing mobility assessment | exists |

### 4.6 Existing-data migration

Existing assessment results stay raw data, re-mapped to new pillars (sprint results → sprint score, 505 → COD, jumps → plyo). Existing users start `measured` where results exist (aging counted from measurement date), otherwise the `self_estimate` gap is collected on next login.

### 4.7 Score logging on pillar level

**Only the six pillar time series are stored. The overall score is never persisted** — it is always computed live: weighted average(pillar values at time t, current sport's weights). Six multiplications per data point, also for history graphs.

- Pillar history is sport-independent and never breaks.
- Overall-score history is reconstructable retroactively for any sport — switching sports re-renders the entire history under the new weights (no gap, no reset to zero).
- Logs per pillar combination were rejected: every combination is derivable from the six series; derived data is computed, not logged.
- Preset weight tuning shifts recomputed history slightly — accepted (presentation, not data loss); no weight versioning in v1 (YAGNI).
- Any currently persisted overall score becomes a pure derivation; old entries serve at most as fallback for pre-pillar-history time.

---

## 5. App UI & Screens

- **5.1 Plan/week view:** each session type gets a visual identity — icon, label, session image (extend `session-images.ts`). A speed session is called "Sprint Session", not "Workout 3". Mobility sessions appear as light cards on rest days (`rest-day-card` as anchor).
- **5.2 Session screen (`session/[id].tsx`):** same screen for all types (payoff of the shared-structure decision). Additions: conditioning blocks render the interval prescription (work/rest/rounds) as a new row variant; sprint exercises show distance + attempts (measurement types exist).
- **5.3 Active session:** the biggest new UI piece is the **interval timer** for conditioning (work/rest countdown, round counter, switch signal). Speed sessions reuse the existing set/rest logic.
- **5.4 Progress/scores:** pillar view filtered to sport-relevant pillars; overall score computed live (§4.7). Per pillar: history graph + **source badge** ("estimated" / "measured" / "stale — retest due") with a CTA to the matching assessment.
- **5.5 Assessments screen:** grouped by pillar; new RST flow (enter six times sequentially, app computes drop-off, writes two pillars); Cooper as alternative; "Recommended for you" row fed by uncertain/stale pillars.
- **5.6 Moving sessions:** session-manage sheet (redesign branch) extended with move/swap + soft warnings that explain the rule in one sentence ("Sprints <72h before your game fatigue you for the weekend") — warn, never block. Moving the speed session to the user's track/field day is the expected normal case (space constraint), not misuse.
- **5.7 Web admin:** exercise create/edit forms get the new metadata fields as selects; AI prefill suggests them; category pickers show the new pillars; PlanSimulator understands session types for testing week placement.
- **5.8 i18n:** new namespaces for session types, pillar names ("Sprungkraft" etc.), pattern labels, warning texts. `block_type.*` keys unchanged.

Not in this list by design: no new session screen, no block-screen changes, no query changes beyond the enum field.

---

## 6. Migration & Rollout

### 6.1 DB migrations (order within the package)

1. `session_type` enum + column (default `workout`) — additive.
2. Exercise metadata columns + interval fields — additive, nullable.
3. Pillar-level storage + translation of existing focus rankings; `sports_and_relevances` extension (preset levels + score weights).
4. Category restructuring: new rows (`sprints`, `cod`, `conditioning`), re-mapping (exercises, rankings, targeted_categories), `jumps`/`upper_body_plyometrics` **deactivated, not deleted** (FK safety; deletion is a later cleanup migration). Runs **after** the app release (§6.3).
5. Pillar time series for scores + mapping of existing assessment results.

Prod DDL with `lock_timeout`, check for orphaned lock-holding sessions first (laterality-cleanup learning).

### 6.2 Exercise backfill — the underestimated chunk

Every strength exercise needs its primary pattern. Three tiers: (a) migration seeds unambiguous cases via slug lists (bench → push_horizontal, RDL → hinge, …); (b) the rest via admin with AI-prefill suggestions; (c) **transition safety in the generator:** exercises without a pattern tag fall back to the existing `BODY_REGION_TO_PATTERN` derivation — the generator works with partially tagged data, backfill can finish iteratively. Backfill must be runnable through the slug-matching prod-sync script (exercise-drift learning).

### 6.3 Rollout chain (major-update gated)

The app has a hard force-update mechanism (`providers/version-check-provider.tsx`): (a) backend gate — `/version-check` against `MIN_SUPPORTED_VERSION` in jemp-api, highest priority; (b) store comparison — a **major** version difference alone triggers the blocking `ForceUpdateScreen` (no dismiss, no children rendered).

1. Additive migrations (6.1 steps 1–3, 5) — invisible to old clients.
2. Deploy worker + edge function (handles old and new data states via §6.2c + sensible defaults for users without new wizard data).
3. **Store release 3.0.0.** The moment `/store-info` reports it, all 2.x users are hard-blocked — the store release *is* the flip; there is no grace period with the current major-diff logic (accepted and intended here).
4. Set `MIN_SUPPORTED_VERSION` to 3.0.0 (belt and braces; highest-priority check, covers store-info fetch failures).
5. **Data migration (6.1 step 4) immediately after** — no old clients remain that could misread the new category list.

Known, accepted gaps: version checks run on app start and after >60s background (a user mid-session finishes their session — good); full fetch failure fails open (offline old app stays usable; anything harmful needs the backend anyway).

### 6.4 Running plans

**Not migrated.** The restructure applies from the next plan generation. Old plans reference exercises directly (not categories) and render unchanged. Regeneration goes through the new wizard (pillar steppers, sprint questions).

### 6.5 Activation rule

The new generator path activates only for users whose pillar levels were **written by the new wizard** (marker on the level data) — not for merely migrated ranking approximations. Until then: workout-only plans via defaults. The legacy generator path is removed once wizard completion rates allow.

### 6.6 Build phases (each independently shippable)

1. **Taxonomy & data:** migrations 6.1 steps 1–3 + backfill start (no behavior change).
2. **Generator:** week layout, fatigue logic, pattern slots, sprint/conditioning content, conservative mode.
3. **Onboarding & wizard:** pillar steppers, sprint questions, day communication.
4. **Session types in the app:** plan view, conditioning timer, move with warnings.
5. **Scores & assessments:** calculator restructuring, time series, RST flow, badges.

Explicitly v1.5/v2: speed double days with workout restructuring (v1.5), pre-fight taper logic (v2), Drop Jump/RSI + T-Drill (v2).

---

## Decision log (key calls and why)

- **Metadata + slots, not new block types:** blocks stay generic containers; meaning comes from generator slots + exercise metadata. UI grouping by pattern remains retrofittable without schema changes.
- **Speed bundles sprints + COD:** same venue, same warmup, similar neural load; variants rotate across weeks. Own types for each pillar would create more session types than training days.
- **Standalone speed as default carrier (level 2+):** different venue than the workout, zero equipment. Integration is the fallback for full weeks; micro-dose is the floor.
- **User picks days, generator picks content:** the user knows their life, the app knows the physiology. Correction happens after generation via move + soft warnings.
- **No user-facing pillar "off":** those who would disable a pillar usually need it most; legitimate zeros are system-derived (preset irrelevance, club coverage, load damping).
- **Deterministic week layout:** 48h/72h guarantees must be real guarantees, so they live in rule code, not prompts.
- **Pillar-level score logging only:** derived data (overall score, per-sport views) is computed, never persisted.
- **`lower_body_plyometrics` keeps its slug:** slugs are internal; relabeling happens in i18n. Keeping it avoids migration churn (calculator, types, existing rankings).
- **Aging threshold ~4 months** and **hard max-velocity gating on measured sprint values**: presented and carried as design decisions; both are single constants and easy to tune later.
