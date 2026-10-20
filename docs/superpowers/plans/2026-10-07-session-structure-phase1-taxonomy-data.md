# Session Structure Redesign — Phase 1: Taxonomy & Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship all additive, behavior-neutral DB groundwork for the session structure redesign — extended session_type enum, new block types, exercise pattern metadata, interval rounds, pillar-level storage, sport-preset extension, and the starter pattern backfill.

**Architecture:** Pure SQL migrations in `supabase/migrations/` (Supabase/Postgres), applied to the local dev DB with `supabase migration up`, plus one regeneration of `database.types.ts`. Nothing in this phase changes runtime behavior: no app, worker, or web code is touched; all columns are nullable or defaulted, all rows additive. Generator/UI phases build on top later (separate plans).

**Tech Stack:** Supabase CLI (local stack, DB on port 54322), PostgreSQL, TypeScript type generation.

**Spec:** `docs/superpowers/specs/2026-10-07-session-structure-redesign-design.md` (§1 data model, §6.1 steps 1–3, §6.2 backfill)

## Global Constraints

- **NEVER run `supabase db reset`.** The local dev DB holds the exercise catalog synced from prod (slug-matching sync script); a reset wipes it. Apply new migrations with `supabase migration up` only.
- **Never touch prod.** All work is local (`feedback_deployment` rule). No `supabase db push`, no `--linked` flags.
- Migration filenames: `YYYYMMDDHHMMSS_<snake_case_name>.sql`, timestamps starting at `20261007120000` and strictly increasing.
- Behavior-neutral: every column nullable or defaulted; every insert additive; no row deleted or updated except the pattern backfill UPDATEs (which set previously non-existent columns).
- Category restructuring (new pillar rows, jumps merge) is **NOT in this phase** — it is §6.1 step 4 and runs after the 3.0.0 app release. Do not create `sprints`/`cod`/`conditioning` category rows here.
- Local psql connection for verification: `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Commit after every task; message style `feat(db): ...` matching repo history; end commit messages with the Claude co-author trailer.

## Review Focus

1. **Enum value used in its creating transaction** — Postgres rejects using an enum value added by `ALTER TYPE ... ADD VALUE` inside the same transaction/migration file. Expected behavior: Task 1 only adds values; no migration in this plan writes `speed`/`mobility`/`conditioning` into a row. Pinned by Task 1 Step 3 (verify-only query, separate psql session).
2. **Duplicate `block_types.slug` rows block the UNIQUE constraint** — if the local DB (prod-synced) ever got duplicate slugs, Task 2's `ADD CONSTRAINT ... UNIQUE` fails mid-migration. Pinned by Task 2 Step 1 (duplicate pre-check must return 0 rows before writing the migration).
3. **Auto-generated CHECK constraint name mismatch** — `sport_category_relevance`'s inline CHECK may not be named `sport_category_relevance_relevance_check` on the prod-synced local DB. Dropping a wrongly guessed name aborts the migration. Pinned by Task 5 Step 1 (query `pg_constraint` for the actual name first).
4. **Backfill UPDATE matching 0 rows hides a slug typo** — `UPDATE ... WHERE slug IN (...)` silently no-ops on misspelled slugs. Expected: known seeded slugs (e.g., `bench_press`, `romanian_deadlift`) must appear in the updated counts. Pinned by Task 6 Step 3 (per-pattern count assertions > 0 and spot-check queries).
5. **`database.types.ts` regeneration breaking existing TypeScript** — new columns are additive, but regeneration rewrites the whole file; a supabase CLI version change can reshape unrelated types. Expected: `npx tsc --noEmit` reports no *new* errors versus the pre-change baseline. Pinned by Task 7 Steps 1 and 4 (baseline before, compare after).

---

### Task 1: Extend the `session_type` enum

The DB already has `CREATE TYPE session_type AS ENUM ('training', 'recovery')` (used by `workout_plan_sessions.session_type` NOT NULL and `workout_sessions.session_type` nullable). `training` plays the role of "workout" in the spec. Add the three new values; change nothing else.

**Files:**
- Create: `supabase/migrations/20261007120000_extend_session_type_enum.sql`

**Interfaces:**
- Consumes: existing enum `session_type` from `20260418153721_create_plan_tables.sql:9`.
- Produces: enum `session_type` with values `training | recovery | speed | mobility | conditioning` — Phase 2 (generator) and Phase 4 (app) rely on exactly these value spellings.

- [ ] **Step 1: Write the migration**

```sql
-- Extend the existing session_type enum (training | recovery) with the
-- new session types from the session structure redesign. 'training'
-- continues to mean a regular workout session. Additive only: no rows
-- are written with the new values in this migration (Postgres forbids
-- using a value added in the same transaction).
ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'speed';
ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'mobility';
ALTER TYPE session_type ADD VALUE IF NOT EXISTS 'conditioning';
```

- [ ] **Step 2: Apply the migration**

Run: `supabase migration up`
Expected: `Applying migration 20261007120000_extend_session_type_enum.sql...` with no error.

- [ ] **Step 3: Verify the enum values**

Run:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT unnest(enum_range(NULL::session_type));"
```
Expected output, exactly five rows: `training`, `recovery`, `speed`, `mobility`, `conditioning`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261007120000_extend_session_type_enum.sql
git commit -m "feat(db): extend session_type enum with speed, mobility, conditioning"
```

---

### Task 2: New block type rows

`block_types` is a plain table (`id`, `slug`, timestamps) seeded with `warmup/primary/secondary/accessory/cooldown`. Add the ten new block types from spec §1.2. `slug` has no UNIQUE constraint yet — add one so the insert can be idempotent.

**Files:**
- Create: `supabase/migrations/20261007120100_add_new_block_types.sql`

**Interfaces:**
- Consumes: `block_types` table from `20260418152938_create_exercises_tables.sql:3`.
- Produces: `block_types` rows with slugs `push`, `pull`, `lower_body`, `rotation`, `core`, `plyo`, `sprint`, `cod`, `conditioning`, `mobility` (exact spellings — generator Phase 2 and app i18n Phase 4 key off them) and constraint `block_types_slug_key`.

- [ ] **Step 1: Pre-check for duplicate slugs (must pass before writing the migration)**

Run:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT slug, count(*) FROM block_types GROUP BY slug HAVING count(*) > 1;"
```
Expected: `(0 rows)`. If any row appears, STOP — the UNIQUE constraint below would fail; report the duplicates instead of proceeding.

- [ ] **Step 2: Write the migration**

```sql
-- New block types for the session structure redesign (spec §1.2).
-- primary/secondary stay for existing sessions; new plans use these.
-- Only the generator assigns block types, so adding rows is invisible
-- to old clients (safe pre-release).
ALTER TABLE block_types ADD CONSTRAINT block_types_slug_key UNIQUE (slug);

INSERT INTO block_types (slug) VALUES
    ('push'),
    ('pull'),
    ('lower_body'),
    ('rotation'),
    ('core'),
    ('plyo'),
    ('sprint'),
    ('cod'),
    ('conditioning'),
    ('mobility')
ON CONFLICT (slug) DO NOTHING;
```

- [ ] **Step 3: Apply the migration**

Run: `supabase migration up`
Expected: applies without error.

- [ ] **Step 4: Verify rows and constraint**

Run:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT count(*) FROM block_types;" -c "SELECT slug FROM block_types ORDER BY slug;"
```
Expected: count = 15 (5 old + 10 new); slug list contains all ten new slugs exactly as spelled above.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261007120100_add_new_block_types.sql
git commit -m "feat(db): add pattern/session block types (push, pull, lower_body, rotation, core, plyo, sprint, cod, conditioning, mobility)"
```

---

### Task 3: Exercise pattern metadata columns

New enums + nullable columns on `exercises` (spec §1.3). Schema rule from the spec: `core` is a block type, not a `strength_pattern` value — core exercises carry `core_type` instead; `covered_patterns` always holds `strength_pattern` values.

**Files:**
- Create: `supabase/migrations/20261007120200_add_exercise_pattern_metadata.sql`

**Interfaces:**
- Consumes: `exercises` table.
- Produces: enums `strength_pattern`, `plyo_type`, `core_type`, `sprint_type`; columns `exercises.strength_pattern`, `exercises.plyo_type`, `exercises.core_type`, `exercises.sprint_type` (all nullable, enum-typed), `exercises.covered_patterns strength_pattern[]` (nullable). Task 6 writes these; Phase 2 generator reads them.

- [ ] **Step 1: Write the migration**

```sql
-- Exercise pattern metadata for the session structure redesign (spec §1.3).
-- All columns nullable: untagged exercises fall back to the existing
-- BODY_REGION_TO_PATTERN derivation in the generator (spec §6.2c).

CREATE TYPE strength_pattern AS ENUM (
    'push_vertical',
    'push_horizontal',
    'pull_vertical',
    'pull_horizontal',
    'knee_dominant',
    'hinge',
    'rotation'
);

CREATE TYPE plyo_type AS ENUM ('maximal', 'submaximal');

CREATE TYPE core_type AS ENUM ('stability', 'power');

CREATE TYPE sprint_type AS ENUM ('acceleration', 'max_velocity', 'resisted');

ALTER TABLE exercises
    ADD COLUMN strength_pattern strength_pattern,
    ADD COLUMN plyo_type plyo_type,
    ADD COLUMN core_type core_type,
    ADD COLUMN sprint_type sprint_type,
    ADD COLUMN covered_patterns strength_pattern[];
```

- [ ] **Step 2: Apply the migration**

Run: `supabase migration up`
Expected: applies without error.

- [ ] **Step 3: Verify columns**

Run:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'exercises' AND column_name IN ('strength_pattern','plyo_type','core_type','sprint_type','covered_patterns') ORDER BY column_name;"
```
Expected: 5 rows; `covered_patterns` has `data_type = ARRAY` with `udt_name = _strength_pattern`; the other four are `USER-DEFINED` with their enum names.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261007120200_add_exercise_pattern_metadata.sql
git commit -m "feat(db): add exercise pattern metadata columns (strength_pattern, plyo_type, core_type, sprint_type, covered_patterns)"
```

---

### Task 4: Conditioning rounds + category active flag

Spec §1.4: the block-exercise rows already carry `target_duration_seconds` (= work) and `target_rest_seconds` (= rest); conditioning only needs `target_rounds`. Both the plan blueprint table and the session copy get it. Spec §1.1: categories need an active/inactive flag (used by §6.1 step 4 later; adding the column now is additive and lets the admin/types settle early).

**Files:**
- Create: `supabase/migrations/20261007120300_add_target_rounds_and_category_active.sql`

**Interfaces:**
- Consumes: `workout_plan_session_block_exercises`, `workout_session_block_exercises`, `categories`.
- Produces: `target_rounds INTEGER` (nullable) on both block-exercise tables; `categories.is_active BOOLEAN NOT NULL DEFAULT true`. Phase 2 generator writes `target_rounds`; §6.1-step-4 migration (later) flips `is_active` for `jumps`.

- [ ] **Step 1: Write the migration**

```sql
-- Conditioning interval rounds (spec §1.4): work/rest already exist as
-- target_duration_seconds / target_rest_seconds; only rounds is new.
ALTER TABLE workout_plan_session_block_exercises
    ADD COLUMN target_rounds INTEGER CHECK (target_rounds IS NULL OR target_rounds > 0);

ALTER TABLE workout_session_block_exercises
    ADD COLUMN target_rounds INTEGER CHECK (target_rounds IS NULL OR target_rounds > 0);

-- Category active flag (spec §1.1): deactivated categories keep FK
-- integrity but are never assigned again. All current rows stay active;
-- the jumps merge (spec §6.1 step 4) flips this later, post-app-release.
ALTER TABLE categories
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
```

- [ ] **Step 2: Apply the migration**

Run: `supabase migration up`
Expected: applies without error.

- [ ] **Step 3: Verify**

Run:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT table_name FROM information_schema.columns WHERE column_name = 'target_rounds' ORDER BY table_name;" -c "SELECT count(*) FILTER (WHERE is_active) AS active, count(*) AS total FROM categories;"
```
Expected: `target_rounds` present on exactly `workout_plan_session_block_exercises` and `workout_session_block_exercises`; categories active = total (currently 5).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261007120300_add_target_rounds_and_category_active.sql
git commit -m "feat(db): add target_rounds to block exercises and is_active to categories"
```

---

### Task 5: Pillar levels storage + sport preset extension

Spec §1.5: per-user pillar levels (1–3) with the wizard-origin marker (§6.5 activation rule), and `sport_category_relevance` extended to allow relevance 0 (= pillar irrelevant/hidden for the sport) plus a per-sport score weight (§4.3). No data is written here — preset values and the **translation of existing focus rankings are deliberately deferred** to the §6.1-step-4 data migration: the translation targets the final pillar set (which only exists after the category restructuring), and per §6.5 migrated levels don't activate the new generator path anyway, so nothing needs them earlier.

**Files:**
- Create: `supabase/migrations/20261007120400_add_user_pillar_levels_and_sport_preset_extension.sql`

**Interfaces:**
- Consumes: `user_profiles`, `categories`, `sport_category_relevance` (relevance currently `CHECK BETWEEN 1 AND 3`), RLS policy style from `20260419081707_create_rls_policies.sql:99-112`.
- Produces: table `user_pillar_levels(id, user_id, category_id, level INT 1–3, set_by_wizard BOOL, created_at, updated_at, UNIQUE(user_id, category_id))` with owner-scoped RLS; `sport_category_relevance.relevance` allowing 0–3; `sport_category_relevance.score_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0`. Phase 3 wizard writes `user_pillar_levels` with `set_by_wizard = true`; Phase 2 generator reads both.

- [ ] **Step 1: Find the actual CHECK constraint name (must run before writing the migration)**

Run:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT conname FROM pg_constraint WHERE conrelid = 'sport_category_relevance'::regclass AND contype = 'c';"
```
Expected: one row, normally `sport_category_relevance_relevance_check`. **Use the name this query returns** in the DROP CONSTRAINT below; if it differs, substitute it.

- [ ] **Step 2: Write the migration**

```sql
-- Per-user pillar priority levels (spec §1.5). set_by_wizard marks
-- levels written by the new wizard — the activation signal for the new
-- generator path (spec §6.5); translated legacy rankings stay false.
CREATE TABLE IF NOT EXISTS user_pillar_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
    set_by_wizard BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, category_id)
);

ALTER TABLE user_pillar_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pillar levels"
    ON user_pillar_levels FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pillar levels"
    ON user_pillar_levels FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pillar levels"
    ON user_pillar_levels FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pillar levels"
    ON user_pillar_levels FOR DELETE
    USING (auth.uid() = user_id);

-- Sport preset extension (spec §1.5, §4.3): relevance 0 = pillar
-- irrelevant for the sport (hidden from the user); score_weight is the
-- sport weighting layer over the raw pillar scores.
ALTER TABLE sport_category_relevance
    DROP CONSTRAINT sport_category_relevance_relevance_check;
ALTER TABLE sport_category_relevance
    ADD CONSTRAINT sport_category_relevance_relevance_check CHECK (relevance BETWEEN 0 AND 3);
ALTER TABLE sport_category_relevance
    ADD COLUMN score_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0;
```

- [ ] **Step 3: Apply the migration**

Run: `supabase migration up`
Expected: applies without error.

- [ ] **Step 4: Verify**

Run:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "\d user_pillar_levels" -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'sport_category_relevance_relevance_check';" -c "SELECT count(*) FROM sport_category_relevance WHERE score_weight = 1.0;"
```
Expected: table exists with the UNIQUE(user_id, category_id) constraint and 4 policies; constraint definition shows `BETWEEN 0 AND 3`; score_weight count equals total row count of the table.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261007120400_add_user_pillar_levels_and_sport_preset_extension.sql
git commit -m "feat(db): add user_pillar_levels table and sport preset extension (relevance 0, score_weight)"
```

---

### Task 6: Starter pattern backfill (unambiguous slugs)

Spec §6.2 tier (a): seed the unambiguous cases via slug lists. Explicitly **partial by design** — the admin AI-prefill covers the rest, and untagged exercises use the generator fallback. Slugs below were taken from the seed migrations (`20260420072150`, `20260629100558`); slugs absent from the local catalog no-op harmlessly.

**Files:**
- Create: `supabase/migrations/20261007120500_backfill_exercise_pattern_metadata.sql`

**Interfaces:**
- Consumes: columns from Task 3.
- Produces: tagged exercise rows that Phase 2's pool building selects by. No code interface.

- [ ] **Step 1: Write the migration**

```sql
-- Starter backfill of exercise pattern metadata (spec §6.2 tier a).
-- Partial by design: only unambiguous classifications. The rest is
-- tagged via the admin AI prefill; untagged exercises fall back to
-- BODY_REGION_TO_PATTERN in the generator.

-- === strength_pattern ===

UPDATE exercises SET strength_pattern = 'push_horizontal' WHERE slug IN (
    'bench_press', 'incline_bench_press', 'incline_dumbbell_press',
    'push_up', 'archer_push_up', 'dips'
);

UPDATE exercises SET strength_pattern = 'push_vertical' WHERE slug IN (
    'push_press', 'landmine_press'
);

UPDATE exercises SET strength_pattern = 'pull_vertical' WHERE slug IN (
    'pull_up', 'chin_up', 'weighted_pull_up'
);

UPDATE exercises SET strength_pattern = 'pull_horizontal' WHERE slug IN (
    'dumbbell_row', 'dumbbell_hip_hinge_row'
);

UPDATE exercises SET strength_pattern = 'knee_dominant' WHERE slug IN (
    'back_squat', 'front_squat', 'bulgarian_split_squat', 'split_squat',
    'reverse_lunge', 'pistol_squat', 'assisted_pistol_squat',
    'cossack_squat', 'loaded_cossack_squat', 'atg_split_squat',
    'loaded_atg_split_squat', 'trap_bar_deadlift', 'wall_sit',
    'dumbbell_step_up_to_press'
);

UPDATE exercises SET strength_pattern = 'hinge' WHERE slug IN (
    'romanian_deadlift', 'conventional_deadlift', 'sumo_deadlift',
    'stiff_leg_deadlift', 'hip_thrust', 'single_leg_glute_bridge',
    'nordic_curl', 'nordic_hamstring_curl', 'reverse_hyperextension',
    'back_extension_45deg', 'dumbbell_swing', 'power_clean',
    'hang_power_clean', 'power_snatch', 'hang_power_snatch',
    'dumbbell_snatch', 'dumbbell_clean'
);

UPDATE exercises SET strength_pattern = 'rotation' WHERE slug IN (
    'cable_chop', 'mb_rotational_throw', 'rotational_med_ball_slam'
);

-- === core_type ===
-- Core exercises carry core_type instead of strength_pattern (spec §1.3).

UPDATE exercises SET core_type = 'stability' WHERE slug IN (
    'copenhagen_plank', 'renegade_row', 'suitcase_carry'
);

UPDATE exercises SET core_type = 'power' WHERE slug IN (
    'rotational_med_ball_slam'
);

-- === plyo_type ===

UPDATE exercises SET plyo_type = 'maximal' WHERE slug IN (
    'box_jump', 'depth_jump', 'drop_jump', 'broad_jump', 'vertical_jump',
    'single_leg_box_jump', 'jump_squat', 'squat_jump_to_stick',
    'burpee_broad_jump', 'lateral_bounds',
    'mb_chest_throw', 'mb_overhead_throw', 'mb_rotational_throw',
    'clap_push_up'
);

UPDATE exercises SET plyo_type = 'submaximal' WHERE slug IN (
    'pogos', 'hurdle_hops', 'lateral_hurdle_hop',
    'jump_rope_standard', 'jump_rope_double_under', 'star_jump'
);

-- === sprint_type ===
-- Only actual sprint variants; technique drills (a_skip_drill etc.)
-- stay untagged — they live in warmups, not sprint main parts.

UPDATE exercises SET sprint_type = 'acceleration' WHERE slug IN (
    'sprint_10m', 'sprint_30m', 'acceleration_sprint_10m',
    'sprint_start_blocks', 'stair_sprint'
);

UPDATE exercises SET sprint_type = 'max_velocity' WHERE slug IN (
    'sprint_10m_flying', 'flying_20_sprint'
);

UPDATE exercises SET sprint_type = 'resisted' WHERE slug IN (
    'resisted_sprint', 'sprint_parachute_run',
    'banded_sprint_resistance_run', 'sled_push', 'sled_pull',
    'prowler_push_sprint'
);

-- === covered_patterns (compound hybrids, spec §1.3) ===

UPDATE exercises SET covered_patterns = ARRAY['pull_horizontal']::strength_pattern[]
WHERE slug IN ('dumbbell_swing', 'renegade_row');

UPDATE exercises SET covered_patterns = ARRAY['pull_vertical']::strength_pattern[]
WHERE slug IN ('power_clean', 'hang_power_clean', 'power_snatch', 'hang_power_snatch', 'dumbbell_snatch', 'dumbbell_clean');

UPDATE exercises SET covered_patterns = ARRAY['knee_dominant']::strength_pattern[]
WHERE slug IN ('push_press');

UPDATE exercises SET covered_patterns = ARRAY['push_vertical']::strength_pattern[]
WHERE slug IN ('dumbbell_step_up_to_press');
```

- [ ] **Step 2: Apply the migration**

Run: `supabase migration up`
Expected: applies without error.

- [ ] **Step 3: Verify counts (slug-typo guard)**

Run:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT strength_pattern, count(*) FROM exercises WHERE strength_pattern IS NOT NULL GROUP BY strength_pattern ORDER BY strength_pattern;" -c "SELECT sprint_type, count(*) FROM exercises WHERE sprint_type IS NOT NULL GROUP BY sprint_type;" -c "SELECT slug, strength_pattern, covered_patterns FROM exercises WHERE slug IN ('bench_press','romanian_deadlift','pull_up','back_squat','cable_chop','dumbbell_swing');"
```
Expected: every `strength_pattern` value has count ≥ 1 (all seven appear); all three `sprint_type` values appear; the spot-check returns 6 rows with the classifications from Step 1 (`dumbbell_swing` shows `{pull_horizontal}` in covered_patterns). If a known-seeded slug shows NULL, a slug in the migration is misspelled — fix and re-apply before committing.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261007120500_backfill_exercise_pattern_metadata.sql
git commit -m "feat(db): backfill pattern metadata for unambiguous exercises"
```

---

### Task 7: Regenerate database.types.ts and prove behavior-neutrality

**Files:**
- Modify: `database.types.ts` (root, regenerated)

**Interfaces:**
- Consumes: all migrations from Tasks 1–6.
- Produces: up-to-date TypeScript types — Phase 2–5 code imports the new column/enum types from here.

- [ ] **Step 1: Record the typecheck baseline (BEFORE regenerating)**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Note the exact error count (ideally 0). This is the baseline.

- [ ] **Step 2: Regenerate types**

Run: `npx supabase gen types typescript --local > database.types.ts`
Expected: file rewritten; `git diff --stat database.types.ts` shows changes.

- [ ] **Step 3: Verify the new types are present**

Run: `grep -n "strength_pattern\|target_rounds\|user_pillar_levels\|score_weight\|is_active" database.types.ts | head -20`
Expected: hits for all five identifiers.

- [ ] **Step 4: Typecheck against baseline**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: error count identical to the Step 1 baseline (additions are nullable/defaulted, so no existing code should break). If new errors appear, inspect — they indicate the regeneration reshaped existing types; fix forward only if the cause is our migrations, otherwise report.

- [ ] **Step 5: Commit**

```bash
git add database.types.ts
git commit -m "chore(types): regenerate database types for phase 1 taxonomy migrations"
```
