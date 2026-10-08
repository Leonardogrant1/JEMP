# Session Structure Redesign (Pillars, Session Types, Fatigue Logic) — Design

**Date:** 2026-10-07
**Branch:** `feat/session-structure`
**Status:** Approved design, pending implementation plan

## Overview

Restructure JEMP's training taxonomy so a plan covers everything an athlete needs. Input came from an athlete with a coaching license plus a session with an athletics coach.

Three big moves:

1. **Seven pillars** replace the current five categories: Strength, Lower-Body Plyometrics (absorbs Jumps), Upper-Body Plyometrics (kept, preset-gated), Sprints, Change of Direction (COD), Conditioning, Mobility. Sport presets hide irrelevant pillars, so users typically see 5–6.
2. **Session types & pattern blocks** — sessions get an enum `workout | speed | mobility | conditioning` (speed bundles sprints + COD), and new block types (`push`, `pull`, `lower_body`, `rotation`, `core`, `plyo`, `sprint`, `cod`, `conditioning`, `mobility`) make the structure mandatory and visible; `primary`/`secondary` remain for existing sessions.
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
| `upper_body_plyometrics` | **stays as its own pillar** — ballistic upper-body power is categorially different from 1RM-driven strength (release instead of deceleration). Preset-gated: visible for combat/throwing/striking sports (boxing, MMA, handball, volleyball, tennis), preset 0 (hidden) for soccer & co. Label: "Oberkörper-Explosivität" / "Explosive Power (Upper)". For fighters this is the signature quality (punch power) — product value, not UI bloat. |
| `sprints` | **new** — sprint exercises move here from lower_body_plyometrics |
| `cod` | **new** — agility drills (505, T-Drill, shuttles) move here |
| `conditioning` | **new** — circuits, intervals, sled conditioning formats |

Exercise re-mapping on migration: sprint drills (sprints, resisted/hill variants, A-/B-skips, wall drills, high knees, etc.) → `sprints`; change-of-direction drills → `cod`. Upper-plyo exercises **stay in their category** and only gain pattern metadata so workout blocks can select them: med ball rotational slams/throws → pattern `rotation` + `plyo_type`; med ball chest pass / plyo push-ups → push pattern + `plyo_type`. Slow, loaded rotation work (e.g., cable rotational punch press) lives in `strength` with pattern `rotation` — the `rotation` block unifies them, not the category.

**Pillar visibility gates prioritization and score display, not exercise availability.** What is forced is the *rotation block*, not any particular exercise: the block is filled from the pool (cable woodchops, landmine rotations, plate rotations, med ball throws), filtered by equipment and biased by pillar levels — a fighter with upper-plyo emphasis gets mostly ballistic variants, a soccer player mostly slow loaded rotation with occasional throws. Rotation itself is genuinely relevant for soccer (the shot is a hip-to-trunk rotational chain, same mechanics as a punch); the difference per sport is dose and prioritization, not availability.

Categories get an active/inactive flag. Deactivated rows keep FK integrity for anything referencing them (score history, old targeted_categories); deletion is a separate cleanup migration months later.

### 1.2 Session types & new block types

A `session_type` enum **already exists** in the DB (`training | recovery`, used by `workout_plan_sessions.session_type` NOT NULL and `workout_sessions.session_type` nullable). It is **extended** with `speed | mobility | conditioning` — `training` plays the role of "workout"; existing rows need no backfill. All session types use the same block tables.

**New block types enforce the structure at the data level** (reversal of an earlier draft that kept blocks generic — see decision log). `block_types` is a table; new rows are added, old rows stay:

- **Workout:** `warmup` → `push` → `pull` → `lower_body` → `rotation` → `core` → `plyo` → `accessory` → `cooldown`
- **Speed:** `warmup` → `sprint` → `cod` → `cooldown`
- **Mobility:** `mobility` (optionally preceded by a light `warmup`)
- **Conditioning:** `warmup` → `conditioning` → `cooldown`
- `primary` / `secondary` stay seeded and active for **existing sessions only**; new plans never assign them.
- **`recovery` is handled the same way:** it stays a valid enum value for existing sessions, but new plans never assign it — its role is superseded by `mobility`. Consequently the expected-block-set validation (below) applies only to sessions generated by the new generator path (`training`/`speed`/`mobility`/`conditioning` with the new block sets); legacy `training` and `recovery` sessions are out of its scope.

Pattern variants (vertical/horizontal, knee/hinge, max/submax, stability/power) are **not** block types — they stay exercise metadata (§1.3) selected *within* a block. Block types make the structure mandatory and visible; exercise metadata keeps the rotation flexible. Validation compares a session against its **expected block set: the full set minus explicitly recorded drops** (§2.9) — a workout missing its pull block *without a recorded drop* is broken and flagged in DB checks and the PlanSimulator; an intended breadth cut is not a false alarm.

Consequence accepted by design: a full workout renders as 7–9 sections with 1–2 exercises each (today: 3–5 blocks of 2–4). Total exercise count stays within the mode budgets; the session reads like a coach's plan. Reduced sessions legitimately show fewer blocks (§2.9).

### 1.3 Exercise metadata (new nullable columns)

- `strength_pattern`: `push_vertical | push_horizontal | pull_vertical | pull_horizontal | knee_dominant | hinge | rotation` — **exactly one primary pattern per exercise**. Hybrid exercises (e.g., cable rotational punch press = push + rotation) get the pattern whose block they fill (here: `rotation` — the training stimulus is rotational force transfer; it competes with woodchops, not bench press).
- `plyo_type`: `maximal | submaximal` (on plyo exercises; also used as a ballistic tag on strength exercises like med ball throws).
- `core_type`: `stability | power`.
- `sprint_type`: `acceleration | max_velocity | resisted`.
- `covered_patterns`: optional array of **secondary** `strength_pattern` values a compound exercise meaningfully hits (KB swing: primary `hinge`, covered `pull_horizontal`; clean & press: primary `hinge`, covered `push_vertical`; thruster: primary `knee_dominant`, covered `push_vertical`; renegade row: a **core** exercise — block assignment via `core_type: stability`, no `strength_pattern` — covered `pull_horizontal`). Schema rule: `core` is a block type, **not** a `strength_pattern` value; core exercises carry `core_type` instead of `strength_pattern`, and `covered_patterns` always holds `strength_pattern` values regardless of the exercise's own block. The primary pattern (or `core_type`/`plyo_type`/`sprint_type` for non-strength blocks) decides which block the exercise lives in; covered patterns feed the weekly coverage ledger as partial stimulus (§2.9). Backfill only the ~20 obvious hybrids.
- `laterality` already exists (bilateral/unilateral/alternating) and covers single/double leg.

### 1.4 Conditioning prescription

Conditioning is prescribed as **formats, not exercises**: the same movement becomes conditioning through duration and rest. The block-exercise rows (`workout_plan_session_block_exercises`, `workout_session_block_exercises`) **already carry** `target_duration_seconds` (= work) and `target_rest_seconds` (= rest); conditioning only adds a nullable `target_rounds` column — used in conditioning blocks instead of sets×reps. No partner exercises (pads/mitts excluded; solo bag work allowed).

### 1.5 Pillar priority (replaces focus ranking)

Per-user pillar levels: **1 = maintain, 2 = focus, 3 = emphasis**, under a point budget of **`visible pillars + 4`** (e.g., 5 visible → 9, 6 visible → 10). A fixed budget would scale inversely — sports with more relevant pillars would get *less* freedom after the mandatory 1-per-pillar minimum; `N + 4` keeps the headroom constant at 4 points regardless of sport. Maxing everything stays unreachable by design — users trade, not stack.

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
- **The speed day is driven by `speed_level = max(sprint level, COD level)`** — the speed session carries both pillars (§2.5), so a basketball player with COD 3 / sprints 1 gets their speed day through COD. The sprint/COD mix inside the session follows the two levels.
- **Speed level 3:** speed is guaranteed one of the available days; workouts drop to `workouts − 1`, but never below the minimum of 2. A **second** speed day arises only when, after this allocation, a surplus day over the workout cap is still free **and** a legal placement window (72h/48h rules) exists for it — same surplus logic as level 2. **Edge case 2 available days:** reserving a day would push workouts below 2 → no standalone day exists; speed falls back to an **extended** integrated block (§2.5) on the game-farthest workout day.
- **Speed level 2:** speed gets its own day **only if a day is left over the workout cap** (e.g., 4 days available, cap 3 → 3 workouts + 1 speed). No spare day → no standalone; the sprint/COD block integrates into a workout (§2.5).
- **Speed level 1:** micro-dose only, never an own day.
- Mobility never consumes a day from the budget (fatigue 0); standalone mobility session only from mobility level 2, placed on rest days.
- Conditioning session only when weekly load permits (§2.2) and a day is available; otherwise a **conditioning finisher** (~10 min interval block at the end of a workout, minutes budgeted by the duration estimate so the breadth lever compensates — never on the sprint-carrier day, never the day before a game, damped away at high load) — the integrated carrier implemented in Phase 2b.

**2.1b Weekday placement (fatigue rules):**

Fatigue constants per session type (single constants file): mobility 0 · conditioning 2 · workout 3 · speed 4.

1. Place the speed day: never <72h before a `game`/`tournament` (hard rule). The day directly after a game is a **soft penalty**, not a hard exclusion — if it is the only legal window, it is used with a visible note (weekly sprint exposure per §2.5 outranks post-game comfort; amendment from the Phase-2a review). Prefer short-duration days (a speed session needs ~30–40 min).
2. Place the **heavy lower-body emphasis** — case distinction by sprint carrier (§2.5): **standalone speed day exists** → on the workout farthest from the speed day (≥48h); **integrated case (no speed day)** → the game-farthest workout day carries both the sprint/COD block and the heavy lower emphasis (one consolidated high day; the reference point is the game day, not a speed day). Both cases prefer the longest-duration day. The 48h rule applies to the heavy lower day — which the generator itself assigns via pattern rotation, so this is always satisfiable. Duration-aware placement makes block drops rarer, not just better distributed.
3. Workouts adjacent to the speed day get the upper-leaning / light lower-body variant of the weekly rotation.
4. Conditioning never on the day directly before a game.
5. Game weeks: speed session scales to maintenance volume (2–4 × 20–30m) instead of a development session. No legal window at all (two games/week): standalone drops, micro-dose moves into the workout warmup.

Worked example (soccer, club Tue/Thu, game Sat, JEMP days Mon/Wed/Fri/Sun, medium load = cap 3, speed level 2): 1 spare day → speed Monday (MD-5); heavy lower Wednesday; Friday light/upper (pre-game); Sunday moderate; mobility floats onto Tue/Thu evenings or Sat morning. Every placement matches what a coach would do by hand, and none is a special case in code.

### 2.2 Conditioning damping

High weekly club load → conditioning sessions reduced or dropped (club training *is* conditioning: repeated actions, incomplete recovery). No extra onboarding question — weekly load data already exists. Combat-sport presets keep conditioning high (round formats are their best conditioning).

### 2.3 Pillar levels → dose

Constants table per pillar: level 1 = maintenance frequency/volume, 2 = focus, 3 = emphasis. (E.g., sprints: 1 = warmup micro-dose, 2 = one speed session, 3 = one guaranteed speed day plus a second only under the surplus-day + legal-window condition of §2.1a. Upper-body plyo: levels bias the rotation/push blocks toward ballistic variants and raise their volume — the pillar lives inside workouts, no own session type.)

### 2.4 Pattern blocks in workouts

Replaces category quotas + the body_region coverage patch. Every full workout carries the block set from §1.2 — **the base structure is data-enforced**. Variants rotate across the week *within* each block: push/pull vertical↔horizontal, knee↔hinge, laterality single↔double, plyo max↔submax, core stability↔power. Weekly coverage rule: every pattern at least once per week, tracked in a coverage ledger. Patterns come from the new exercise metadata instead of the `BODY_REGION_TO_PATTERN` derivation. CNS mini-steps (fast feet / short accelerations) are a fixed warmup component of every workout. Accessory = small muscles (adductors, hip flexors, calves, feet; optionally biceps/triceps).

### 2.5 Sprint content carriers

Per user, in priority order:

1. **Standalone speed session (default from speed level 2 — `max(sprints, cod)` —, day budget permitting):** its own day, outdoors, **zero equipment** (drills + sprints + COD with nothing but markers). This is the main reason speed stays standalone: it happens at a different location than the workout (park/track vs. gym), and it is the easiest session to schedule anywhere. Structure: warmup → drills (A-/B-skips, wall drills) → sprint main part → COD block — the sprint/COD proportion follows the two pillar levels (COD 3 + sprints 1 → COD-dominant session).
2. **Integrated sprint/COD block (fallback when no day is free):** on the game-farthest workout day, directly after the warmup (high/low principle: consolidate high-CNS content on the same day, sprint first while fresh, then lift — same-session sprint→lift is standard practice; the 48h rule applies between days). By design this day **is** the heavy-lower day — one consolidated high day; the sprint volume there is block-sized, not session-sized. COD drills integrate the same way (they need less space than free sprints). Environment-filtered pool: gym users get resisted/stairs/sprint-in-place variants instead of free 30m sprints.
3. **Micro-dose (default in every workout):** CNS mini-steps + a few short accelerations in the warmup. Exception: omitted in workouts within 24h after a speed session — the CNS stimulus would be redundant volume on the day after.

`sprint_type` gating: acceleration always; max velocity only if the onboarding distance answer is >20m **and** a measured (not estimated) sprint value exists — max velocity is the most expensive, riskiest content and never a default. Combat athletes: acceleration + hill/sled + intervals, no flying sprints (no 40m runway exists in a fight; hills force the forward lean of entries and protect hamstrings).

Weekly sprint exposure is kept even in game weeks (maintenance dose): regular near-max sprinting is hamstring injury *prophylaxis* — players who never sprint in training are most at risk in the match.

### 2.6 Conditioning session content

The generator picks a **format** (machine intervals 30/30, circuit 40/20, repeated sprints, solo bag rounds, tempo runs) matching equipment and sport, then fills it from the pool. Prescription = `target_duration_seconds` (work) / `target_rest_seconds` (rest) / `target_rounds` (§1.4).

### 2.7 Conservative mode for estimated values

Pillars with `self_estimate` or aged-out values → one intensity step down, flatter progression, no max-velocity content, plus an assessment prompt in the app. Measuring is the path to more intense content.

### 2.8 Where it lives

Worker (`generate-plan.ts`, `prompts.ts`, schemas, constants) and the edge-function mirror `supabase/functions/generate-trainings-plan/` — changed in sync, as with previous generator packages.

### 2.9 Session scaling: two independent levers

"Reduced" is not a single mode — the generator computes two independent levers per session, each with its own trigger. There is no user-facing choice; both derive from existing data (preferred_session_duration, weekly schedule, weekload).

| Lever | Trigger | Effect |
|---|---|---|
| **Dose** (volume scaling) | Fatigue context: game proximity, weekload, deload — never time | All blocks stay; sets/intensity scale down (maintenance dosing, same principle as the sprint maintenance dose) |
| **Breadth** (block drops) | Time budget: estimated duration vs the day's budget (per-day override, else global preferred_session_duration) | Blocks drop with full set quality kept; never triggered by fatigue |

Computation order per session:

1. **Dose first:** volume multiplier from the week context (normal / maintenance / deload).
2. **Estimate duration** with the scaled volume: blocks × (sets × time-per-set + per-exercise setup overhead). The overhead term is why breadth, not dose, answers time pressure: many one-set blocks maximize setup cost per minute of actual work, and heavy strength work without ramp-up is near-worthless ("touch everything, develop nothing").
3. **Breadth last:** while the estimate exceeds the budget, drop blocks by priority — (a) what the weekly coverage ledger already covered, (b) lowest pillar levels first (user emphases survive), (c) drop rotation (what was dropped last time is kept this time). **Every drop is persisted on the session** (dropped block types + reason: time/coverage; `coverage` also covers the pre-drop of blocks whose exercise pool is empty for this user — amendment from the Phase-2b review: an unsatisfiable block is dropped deterministically before the LLM sees it) — this is what validation and the PlanSimulator audit against (§1.2), and it is also the **state source for the drop rotation**: the generator derives "what was dropped last time" from the persisted drops of prior sessions within the same plan. No separate state object, nothing stored on the user. Plan regeneration starts the rotation fresh — a new plan plans its whole week(s) in one pass, so cross-plan carryover is unnecessary. Selection within remaining blocks biases toward `covered_patterns` hybrids so dropped patterns still get partial stimulus (counted as partial coverage in the ledger — enough in squeezed weeks, never a substitute for a full block in normal weeks). Warmup/cooldown compress but never drop (CNS mini-steps stay).

Full-session default stays single-pattern exercises — for strength development the bench press beats the thruster; compounds are a compromise tool for squeezed sessions, not an upgrade. The mode slugs full/reduced remain as derived labels for pool filtering (`exercise_session_modes`).

---

## 3. Onboarding & Priority UI

### 3.1 New/changed onboarding steps

- **Sprint context (new, 2 questions):** "Do you do sprint sessions with your club?" (yes → system damps the sprint pillar, no sprint sessions) and "How far do you sprint at a stretch in your sport?" (<20m / 20–40m / >40m, with sport examples) → steers acceleration vs. max velocity.
- **Pillar priority (replaces CategoryFocusStep):** sport preset pre-distributes levels; user adjusts one stepper per visible pillar (levels 1–3) under a visible budget counter (`visible pillars + 4` points, §1.5). Pillars with preset 0 don't appear. No user-facing "off".
- **Self-assessment per visible pillar:** simple anchored rating (e.g., "I rarely sprint / regularly / fastest on my team"), stored as `self_estimate` start values. No forced assessments up front — conservative planning protects.
- **Day selection as today** (toggles, workout cap by weekly load), extended with: required-day communication ("Your plan needs 3 workout days + 1 speed day — pick 4 days"), the opt-in "I can train twice a day" (enables conditioning doubles; mobility stacks even without opt-in), and **per-day duration overrides**: `preferred_session_duration` stays the global default; tapping a selected day opens a sheet to adjust that day's duration (same UI pattern as the existing `sport-day-editor`). Nobody is forced to set seven values.
- **Weekly schedule unchanged** — already captures club days, intensity, game/tournament days.

### 3.2 Wizard

Same building blocks mirrored into plan regeneration (pillar steppers, days, opt-in), as weekload/schedule already are.

### 3.3 Multi-session days (stacking matrix)

1. **Mobility + anything: always allowed**, no opt-in (fatigue 0; evening after a workout is a classic slot).
2. **Conditioning + workout: allowed with opt-in** (conditioning after lifting or as PM session; never the day before a game).
3. **Speed + workout same day: v1.5** — requires the generator to turn that day's workout upper-leaning (lower_body block moves to another day, weekly coverage preserved). Deferred: it touches pattern rotation at its most sensitive point for a minority of users.
4. **Never:** a **standalone** speed session + the heavy-lower workout on the same day (two separate high-CNS sessions), or speed + conditioning on the same day (quality conflict). This explicitly does **not** apply to the integrated sprint/COD block (§2.5), which deliberately shares the day with heavy lifting — sprints first, then lift (high/low consolidation, block-sized volume).

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
- **New `conditioning.ts`:** Repeated Sprint Test — 6 × 30m with 25s rest; scored on a **combination of drop-off % and absolute mean time**. Pure drop-off has a known validity weakness: a slower athlete works further below their limit in every run and structurally shows less decay, so slowness would be rewarded — the absolute component anchors the score (exact weighting is an implementation constant). Run 1 additionally feeds the sprint score: one setup, two pillars — but as a **lower-priority measured source**: a single 30m run inside a fatigue test differs from a rested, dedicated sprint test (warmup state, pacing instinct). If both exist within the aging limit, the dedicated test wins even when it is older; the RST value only fills the gap when no dedicated sprint test is available. Fallback: Cooper 12-minute run (published norm tables by age/sex). The Yo-Yo IR and 30-15 IFT were rejected for space/audio requirements; Assault Bike rejected as standard for device availability.
- `upper-body-plyometrics.ts` **stays unchanged** (MB chest/rotational/overhead throw + clap push-ups) — own pillar, own score. Strength stays purely 1RM/max-reps based.
- `strength.ts`, `mobility.ts` stay.

### 4.5 Assessment coverage per pillar

| Pillar | Assessments | Status |
|---|---|---|
| Strength | 5× 1RM + max-reps tests | exists |
| Lower-Body Plyometrics | Vertical/Broad/Box Jump | exists |
| Upper-Body Plyometrics | MB chest/rotational/overhead throw, clap push-ups | exists |
| Sprints | 10m, 30m, 10m flying | exists (recategorized) |
| COD | 505 Agility | exists (recategorized) |
| Conditioning | Repeated Sprint Test; Cooper fallback | **new** |
| Mobility | existing mobility assessment | exists |

### 4.6 Existing-data migration

Existing assessment results stay raw data, re-mapped to new pillars (sprint results → sprint score, 505 → COD, jumps → plyo). Existing users start `measured` where results exist (aging counted from measurement date), otherwise the `self_estimate` gap is collected on next login.

### 4.7 Score logging on pillar level

**Only the seven pillar time series are stored. The overall score is never persisted** — it is always computed live: weighted average(pillar values at time t, current sport's weights). Seven multiplications per data point, also for history graphs.

- Pillar history is sport-independent and never breaks.
- **Carry-forward rule:** "pillar values at time t" means each pillar's most recent value at or before t (last observation carried forward). Pillars with no value yet at t are excluded and the sport weights renormalize over the present ones — without this rule the live computation would be undefined, since pillar values arrive at different times.
- Overall-score history is reconstructable retroactively for any sport — switching sports re-renders the entire history under the new weights (no gap, no reset to zero).
- Logs per pillar combination were rejected: every combination is derivable from the seven series; derived data is computed, not logged.
- Preset weight tuning shifts recomputed history slightly — accepted (presentation, not data loss); no weight versioning in v1 (YAGNI).
- Any currently persisted overall score becomes a pure derivation; old entries serve at most as fallback for pre-pillar-history time.

---

## 5. App UI & Screens

- **5.1 Plan/week view:** each session type gets a visual identity — icon, label, session image (extend `session-images.ts`). A speed session is called "Sprint Session", not "Workout 3". Mobility sessions appear as light cards on rest days (`rest-day-card` as anchor).
- **5.2 Session screen (`session/[id].tsx`):** same screen for all types; block labels already render generically via `t('block_type.${slug}')`, so new blocks appear as sections automatically — the pattern structure becomes visible UI for free. To update: the small hardcoded slug lists (hero image pick, focus chips, isMainBlock in `session/[id].tsx`, mirrored in session-summary, active-session, SessionHeader) extend to the new types or become data-driven. Additions: conditioning blocks render the interval prescription (work/rest/rounds) as a new row variant; sprint exercises show distance + attempts (measurement types exist). Full workouts render 7–9 shorter sections (§1.2); reduced sessions show honestly fewer blocks.
- **5.3 Active session:** the biggest new UI piece is the **interval timer** for conditioning (work/rest countdown, round counter, switch signal). Speed sessions reuse the existing set/rest logic.
- **5.4 Progress/scores:** pillar view filtered to sport-relevant pillars; overall score computed live (§4.7). Per pillar: history graph + **source badge** ("estimated" / "measured" / "stale — retest due") with a CTA to the matching assessment.
- **5.5 Assessments screen:** grouped by pillar; new RST flow (enter six times sequentially, app computes drop-off, writes two pillars); Cooper as alternative; "Recommended for you" row fed by uncertain/stale pillars.
- **5.6 Moving sessions:** session-manage sheet (redesign branch) extended with move/swap + soft warnings that explain the rule in one sentence ("Sprints <72h before your game fatigue you for the weekend") — warn, never block. Moving the speed session to the user's track/field day is the expected normal case (space constraint), not misuse.
- **5.7 Web admin:** exercise create/edit forms get the new metadata fields as selects; AI prefill suggests them; category pickers show the new pillars; PlanSimulator understands session types for testing week placement.
- **5.8 i18n:** new namespaces for session types, pillar names ("Sprungkraft" etc.), warning texts, and new `block_type.*` keys for the new block types (existing keys unchanged).

Not in this list by design: no new session screen and no query changes beyond the enum field — new block types flow through the existing generic block rendering.

---

## 6. Migration & Rollout

### 6.1 DB migrations (order within the package)

1. Extend the **existing** `session_type` enum (`training | recovery`) with `speed`, `mobility`, `conditioning` (§1.2) — additive, no new column, no backfill. New `block_types` rows (§1.2) — also additive and safe pre-release: only the generator assigns block types, old clients never see them in sessions.
2. Exercise metadata columns (incl. `covered_patterns`) + `target_rounds` on both block-exercise tables (§1.4) — additive, nullable.
3. Pillar-level storage + translation of existing focus rankings; `sports_and_relevances` extension (preset levels + score weights).
4. Category restructuring: new rows (`sprints`, `cod`, `conditioning`), re-mapping (exercises, rankings, targeted_categories), `jumps` **deactivated, not deleted** (FK safety; deletion is a later cleanup migration). `upper_body_plyometrics` stays active and untouched. Runs **after** the app release (§6.3).
5. Pillar time series for scores + mapping of existing assessment results.

Prod DDL with `lock_timeout`, check for orphaned lock-holding sessions first (laterality-cleanup learning).

### 6.2 Exercise backfill — the underestimated chunk

Every strength exercise needs its primary pattern. Three tiers: (a) migration seeds unambiguous cases via slug lists (bench → push_horizontal, RDL → hinge, …); (b) the rest via admin with AI-prefill suggestions; (c) **transition safety in the generator:** exercises without a pattern tag fall back to the existing `BODY_REGION_TO_PATTERN` derivation — the generator works with partially tagged data, backfill can finish iteratively. Backfill must be runnable through the slug-matching prod-sync script (exercise-drift learning).

### 6.3 Rollout chain (major-update gated)

The app has a hard force-update mechanism (`providers/version-check-provider.tsx`): (a) backend gate — `/version-check` against `MIN_SUPPORTED_VERSION` in jemp-api, highest priority; (b) store comparison — a **major** version difference alone triggers the blocking `ForceUpdateScreen` (no dismiss, no children rendered).

1. Additive migrations (6.1 steps 1–3, 5) — invisible to old clients.
2. Deploy worker + edge function (handles old and new data states via §6.2c + sensible defaults for users without new wizard data).
3. **Store release 3.0.0** with phased/staged rollout disabled (100% availability in all regions), so no user sees a block before the binary is downloadable. Caveat: the automatic store-diff check fires as soon as `/store-info` reports 3.0.0 — it cannot be sequenced independently, which is why availability must come first.
4. **Flip `MIN_SUPPORTED_VERSION` to 3.0.0 — the primary, deliberate gate:** controllable timing, reversible, and the highest-priority check. The automatic store-diff is the second line (covers version-check fetch failures). Consciously accepted consequence: users who technically cannot update (old OS versions) are locked out — justified for a restructure of this size.
5. **Data migration (6.1 step 4) immediately after** — no old clients remain that could misread the new category list.

Known, accepted gaps: version checks run on app start and after >60s background (a user mid-session finishes their session — good); full fetch failure fails open (offline old app stays usable; anything harmful needs the backend anyway).

### 6.4 Running plans

**Not migrated.** The restructure applies from the next plan generation. Old plans reference exercises directly (not categories) and render unchanged. Regeneration goes through the new wizard (pillar steppers, sprint questions).

### 6.5 Activation rule

The new generator path activates only for users whose pillar levels were **written by the new wizard** (marker on the level data) — not for merely migrated ranking approximations. Until then: workout-only plans via defaults. The legacy generator path is removed once wizard completion rates allow.

### 6.6 Build phases (each independently shippable)

1. **Taxonomy & data:** migrations 6.1 steps 1–3 + backfill start (no behavior change).
2. **Generator:** week layout, fatigue logic, pattern blocks, block drop/dose levers, sprint/conditioning content, conservative mode.
3. **Onboarding & wizard:** pillar steppers, sprint questions, day communication.
4. **Session types in the app:** plan view, conditioning timer, move with warnings.
5. **Scores & assessments:** calculator restructuring, time series, RST flow, badges.

Explicitly v1.5/v2: speed double days with workout restructuring (v1.5), pre-fight taper logic (v2), Drop Jump/RSI + T-Drill (v2).

---

## Decision log (key calls and why)

- **New block types enforce the structure (reversed from the earlier metadata+slots-only draft):** originally rejected as invasive, but the landscape changed — keeping `primary`/`secondary` for existing sessions removes the data migration, the 3.0.0 force-update removes the old-client problem, the generator is rewritten in phase 2 anyway, and the app renders block labels generically (only small slug lists to extend). In return the structure is data-enforced (a workout missing its pull block without a recorded drop is visibly broken and validatable) and the method becomes visible UI for free. Exercise pattern metadata stays — block types make it mandatory, variants stay flexible within blocks.
- **Two independent scaling levers, no "reduced type" choice:** dose (volume) is triggered by fatigue context, breadth (block drops) by the time budget; computed per session in that order. Compounds (`covered_patterns`) compensate dropped patterns with partial stimulus in squeezed sessions only.
- **Speed bundles sprints + COD:** same venue, same warmup, similar neural load; variants rotate across weeks. Own types for each pillar would create more session types than training days.
- **Standalone speed as default carrier (level 2+):** different venue than the workout, zero equipment. Integration is the fallback for full weeks; micro-dose is the floor.
- **User picks days, generator picks content:** the user knows their life, the app knows the physiology. Correction happens after generation via move + soft warnings.
- **No user-facing pillar "off":** those who would disable a pillar usually need it most; legitimate zeros are system-derived (preset irrelevance, club coverage, load damping).
- **Deterministic week layout:** 48h/72h guarantees must be real guarantees, so they live in rule code, not prompts.
- **Pillar-level score logging only:** derived data (overall score, per-sport views) is computed, never persisted.
- **`lower_body_plyometrics` keeps its slug:** slugs are internal; relabeling happens in i18n. Keeping it avoids migration churn (calculator, types, existing rankings).
- **`upper_body_plyometrics` stays a pillar (reversed from an earlier draft that dissolved it into strength):** ballistic throws are categorially not strength exercises; preset filtering removes the UI-bloat objection (soccer never sees the pillar); keeping it is *less* migration (no exercise recategorization, calculator unchanged, strength score stays 1RM-pure); and for combat/throwing sports it is the signature quality — an own score is product value.
- **Aging threshold ~4 months** and **hard max-velocity gating on measured sprint values**: presented and carried as design decisions; both are single constants and easy to tune later.
