# Session Structure Redesign — Phase 3a: Pillar Data Migration (§6.1 Step 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the §6.1-step-4 data migration set: the three new pillar category rows, the jumps merge, exercise recategorization, `user_category_levels` seeding for the new categories (the Phase-2b forward-risk fix), the 32-sport × 7-pillar preset matrix, and the legacy ranking translation — applied locally so Phase 3b's wizard UI can be developed against real pillar data.

**Architecture:** Five SQL migrations (one concern each) in `supabase/migrations/`, all carrying a loud **DO-NOT-PUSH-BEFORE-APP-3.0.0** header: per the rollout chain (§6.3) these run on prod only *after* the store release + min-version flip, but they apply locally now — local-first development is exactly our workflow. No app or worker code changes in 3a.

**Tech Stack:** SQL (Supabase/Postgres), psql verification via `docker exec supabase_db_jemp psql -U postgres -d postgres`.

**Spec:** `docs/superpowers/specs/2026-10-07-session-structure-redesign-design.md` (§1.1 pillar table, §1.5 presets/budget, §6.1 step 4, §6.5 translation semantics)

## Global Constraints

- **NEVER push these migrations to prod** (`supabase db push` is forbidden in this phase regardless; see memory `feedback_deployment`). Every file in this plan starts with the header comment `-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.`
- Apply with `supabase migration up` only (never `db reset` — prod-synced catalog).
- `SET LOCAL lock_timeout = '5s';` preamble in every migration.
- Timestamps `20261008100000` onward, strictly increasing.
- Idempotency: every INSERT guarded (`ON CONFLICT` / `WHERE NOT EXISTS`), every UPDATE scoped so a re-run is a no-op — prod rows may differ from local (catalog drift), unmatched slugs must no-op silently.
- `jumps` is **deactivated, never deleted** (`is_active = false`); `upper_body_plyometrics` stays active (own pillar).
- Budget rule (§1.5): for every sport, `sum(levels of pillars with relevance > 0) <= count(pillars with relevance > 0) + 4`. The preset matrix below satisfies it; Task 4 verifies it with SQL.
- Commit per task, `feat(db): ...`, Claude co-author trailer.

## Review Focus

1. **Duplicate user rows after the jumps merge** — a user with rows for both `jumps` and `lower_body_plyometrics` in `user_category_levels`/`user_targeted_categories` would end up with two rows for the same category (neither table has a UNIQUE on user+category). Expected: merge keeps one row (max level / best priority), deletes the loser. Pinned by Task 1 Step 3 duplicate-count queries (must be 0).
2. **Level-window lockout for new categories (the Phase-2b forward risk)** — recategorized exercises become invisible to the generator's level filter unless every user has `user_category_levels` rows for `sprints`/`cod`/`conditioning`. Expected: Task 3 seeds them for ALL users (copy of lower_body_plyometrics level) and the verification counts users without rows (must be 0).
3. **Preset budget violations** — a sport whose preset levels sum past `N+4` makes the Phase-3b stepper UI start in an invalid state. Expected: 0 violating sports. Pinned by Task 4 Step 3's budget-check SQL.
4. **Translation touching the activation gate** — translated rows must carry `set_by_wizard = false` without exception; one `true` would silently flip a legacy user onto the v2 generator. Pinned by Task 5 Step 3 (count of set_by_wizard=true must be 0 after translation on a DB with no wizard users).
5. **Exercise remap slugs drifting on prod** — slug lists must no-op for missing slugs AND the local verification must prove the three new categories are non-trivially populated (sprints ≥ 10, cod ≥ 4, conditioning ≥ 5 locally), so an empty category signals a list error, not silence. Pinned by Task 2 Step 3 counts.

---

### Task 1: New pillar rows + jumps merge

**Files:**
- Create: `supabase/migrations/20261008100000_add_pillar_categories_and_merge_jumps.sql`

**Interfaces:**
- Produces: active `categories` rows `sprints`, `cod`, `conditioning`; `jumps` deactivated with ALL references remapped to `lower_body_plyometrics` (exercises, user_category_levels merged max, user_targeted_categories best-priority, workout_plan_targeted_categories, sport_category_relevance merged max). Tasks 2–5 and Phase 3b depend on these rows.

- [ ] **Step 1: RED — verify current state**

```bash
docker exec supabase_db_jemp psql -U postgres -d postgres -tc "SELECT count(*) FROM categories WHERE slug IN ('sprints','cod','conditioning');" -tc "SELECT is_active FROM categories WHERE slug = 'jumps';"
```
Expected: `0` and `t`.

- [ ] **Step 2: Write the migration**

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- New pillar categories (spec §1.1). categories.slug has no UNIQUE constraint,
-- so guard with NOT EXISTS instead of ON CONFLICT.
INSERT INTO categories (slug)
SELECT s FROM unnest(ARRAY['sprints','cod','conditioning']) AS s
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.slug = s);

-- ── jumps → lower_body_plyometrics merge ──────────────────────────────────
DO $$
DECLARE
  jumps_id uuid;
  lbp_id uuid;
BEGIN
  SELECT id INTO jumps_id FROM categories WHERE slug = 'jumps';
  SELECT id INTO lbp_id   FROM categories WHERE slug = 'lower_body_plyometrics';
  IF jumps_id IS NULL OR lbp_id IS NULL THEN
    RAISE NOTICE 'jumps merge: category missing, skipped';
    RETURN;
  END IF;

  -- Exercises move wholesale.
  UPDATE exercises SET category_id = lbp_id WHERE category_id = jumps_id;

  -- user_category_levels: keep the max level where both rows exist.
  UPDATE user_category_levels lbp SET level_score = GREATEST(lbp.level_score, j.level_score)
  FROM user_category_levels j
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id AND lbp.user_id = j.user_id;
  DELETE FROM user_category_levels j USING user_category_levels lbp
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id AND lbp.user_id = j.user_id;
  UPDATE user_category_levels SET category_id = lbp_id WHERE category_id = jumps_id;

  -- user_targeted_categories: keep the better (lower) priority.
  UPDATE user_targeted_categories lbp SET priority = LEAST(lbp.priority, j.priority)
  FROM user_targeted_categories j
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id AND lbp.user_id = j.user_id;
  DELETE FROM user_targeted_categories j USING user_targeted_categories lbp
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id AND lbp.user_id = j.user_id;
  UPDATE user_targeted_categories SET category_id = lbp_id WHERE category_id = jumps_id;

  -- workout_plan_targeted_categories: same pattern (keep existing lbp row).
  DELETE FROM workout_plan_targeted_categories j USING workout_plan_targeted_categories lbp
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id
    AND j.workout_plan_id = lbp.workout_plan_id;
  UPDATE workout_plan_targeted_categories SET category_id = lbp_id WHERE category_id = jumps_id;

  -- sport_category_relevance: keep the max relevance (UNIQUE(sport_id, category_id) exists).
  UPDATE sport_category_relevance lbp SET relevance = GREATEST(lbp.relevance, j.relevance)
  FROM sport_category_relevance j
  WHERE j.category_id = jumps_id AND lbp.category_id = lbp_id AND lbp.sport_id = j.sport_id;
  DELETE FROM sport_category_relevance WHERE category_id = jumps_id;

  -- Deactivate, never delete (spec §1.1).
  UPDATE categories SET is_active = false WHERE id = jumps_id;
END $$;
```

- [ ] **Step 3: Apply + GREEN verify (incl. duplicate check)**

Run `supabase migration up`, then:
```bash
docker exec supabase_db_jemp psql -U postgres -d postgres \
 -tc "SELECT count(*) FROM categories WHERE slug IN ('sprints','cod','conditioning') AND is_active;" \
 -tc "SELECT is_active FROM categories WHERE slug = 'jumps';" \
 -tc "SELECT count(*) FROM exercises e JOIN categories c ON c.id = e.category_id WHERE c.slug = 'jumps';" \
 -tc "SELECT count(*) FROM (SELECT user_id, category_id FROM user_category_levels GROUP BY 1,2 HAVING count(*) > 1) d;" \
 -tc "SELECT count(*) FROM (SELECT user_id, category_id FROM user_targeted_categories GROUP BY 1,2 HAVING count(*) > 1) d;"
```
Expected: `3`, `f`, `0`, `0`, `0`.

- [ ] **Step 4: Commit** — `git add` + `git commit -m "feat(db): add pillar categories sprints/cod/conditioning, merge jumps into lower_body_plyometrics"`

---

### Task 2: Exercise recategorization

**Files:**
- Create: `supabase/migrations/20261008100100_recategorize_sprint_cod_conditioning_exercises.sql`

**Interfaces:**
- Produces: sprint/COD/conditioning exercises live in their pillar categories. The v2 pool filters (speed/cod/conditioning builders) start matching by their primary category check.

- [ ] **Step 1: Write the migration** (slug lists from the Phase-1 backfill + prod variants; unmatched slugs no-op)

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Sprints: sprint variants + technique drills (spec §1.1).
UPDATE exercises SET category_id = (SELECT id FROM categories WHERE slug = 'sprints')
WHERE slug IN (
  'sprint_10m','sprint_30m','sprint_10m_flying','flying_20_sprint',
  'acceleration_sprint_10m','sprint_start_blocks','stair_sprint',
  'resisted_sprint','sprint_parachute_run','banded_sprint_resistance_run',
  'sled_push','sled_pull','prowler_push_sprint',
  'a_skip_drill','b_skip_drill','high_knees','butt_kicks','wall_drill_march',
  'banded_hip_flexor_march','sprint_in_place'
);

-- COD: change-of-direction drills and tests.
UPDATE exercises SET category_id = (SELECT id FROM categories WHERE slug = 'cod')
WHERE slug IN (
  'agility_505','t_drill','pro_agility_shuttle','lateral_shuffle',
  'agility_ladder_ickey_shuffle','agility_ladder_single_leg_hops'
);

-- Conditioning: circuit/interval movements (format carriers, spec §2.6).
UPDATE exercises SET category_id = (SELECT id FROM categories WHERE slug = 'conditioning')
WHERE slug IN (
  'burpee','burpee_broad_jump','bear_crawl','jumping_jacks',
  'jump_rope_standard','jump_rope_double_under','shadow_boxing','mountain_climber'
);
```

- [ ] **Step 2: Apply** — `supabase migration up`.
- [ ] **Step 3: Verify non-trivial population**

```bash
docker exec supabase_db_jemp psql -U postgres -d postgres -c "SELECT c.slug, count(e.id) FROM categories c LEFT JOIN exercises e ON e.category_id = c.id WHERE c.slug IN ('sprints','cod','conditioning') GROUP BY c.slug;"
```
Expected: sprints ≥ 10, cod ≥ 4, conditioning ≥ 5. Below that → a slug list is wrong; fix before committing.

**Consistency note:** the v2 builders currently also accept `category_slug === 'lower_body_plyometrics'` for cod/conditioning pools (transition fallback) — after this migration both paths match; the fallback stays until a later cleanup.

- [ ] **Step 4: Commit** — `feat(db): recategorize sprint, cod and conditioning exercises into their pillars`

---

### Task 3: user_category_levels seeding for new categories (2b forward-risk fix)

**Files:**
- Create: `supabase/migrations/20261008100200_seed_user_levels_for_new_pillars.sql`

**Interfaces:**
- Produces: every user with a `lower_body_plyometrics` level gets rows for `sprints`/`cod`/`conditioning` (copied level) — the generator's level window keeps matching recategorized exercises (ledger warning from Phase 2b).

- [ ] **Step 1: Write the migration**

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Without these rows the level filter excludes every recategorized exercise
-- (phase-2b review forward risk): seed new-pillar levels from the user's
-- lower_body_plyometrics level (the exercises' previous home).
INSERT INTO user_category_levels (user_id, category_id, level_score)
SELECT ucl.user_id, c_new.id, ucl.level_score
FROM user_category_levels ucl
JOIN categories c_old ON c_old.id = ucl.category_id AND c_old.slug = 'lower_body_plyometrics'
JOIN categories c_new ON c_new.slug IN ('sprints','cod','conditioning')
WHERE NOT EXISTS (
  SELECT 1 FROM user_category_levels x
  WHERE x.user_id = ucl.user_id AND x.category_id = c_new.id
);
```

- [ ] **Step 2: Apply + verify zero lockout**

```bash
docker exec supabase_db_jemp psql -U postgres -d postgres -tc "SELECT count(*) FROM user_category_levels ucl JOIN categories c ON c.id = ucl.category_id AND c.slug = 'lower_body_plyometrics' WHERE NOT EXISTS (SELECT 1 FROM user_category_levels x JOIN categories cn ON cn.id = x.category_id AND cn.slug = 'sprints' WHERE x.user_id = ucl.user_id);"
```
Expected: `0` (every lbp-user has a sprints row; spot-check cod/conditioning analogously).

- [ ] **Step 3: Commit** — `feat(db): seed user levels for new pillar categories`

---

### Task 4: Sport preset matrix (32 sports × 7 pillars)

**Files:**
- Create: `supabase/migrations/20261008100300_seed_pillar_presets.sql`

**Interfaces:**
- Produces: `sport_category_relevance` carries the preset **level** (0–3; 0 = pillar hidden for the sport) for all seven pillars of all 32 sports, `score_weight` stays 1.0 (tuning is Phase 5). Phase 3b's stepper renders exactly this data.

**The matrix** (columns: STR = strength, LBP = lower_body_plyometrics, UBP = upper_body_plyometrics, SPR = sprints, COD = cod, CON = conditioning, MOB = mobility; every row satisfies `sum ≤ visible + 4`):

| sport | STR | LBP | UBP | SPR | COD | CON | MOB |
|---|---|---|---|---|---|---|---|
| soccer, hockey | 2 | 2 | 0 | 2 | 2 | 1 | 1 |
| basketball | 2 | 3 | 0 | 1 | 2 | 1 | 1 |
| volleyball | 2 | 3 | 1 | 1 | 1 | 1 | 1 |
| handball | 2 | 2 | 2 | 1 | 2 | 1 | 1 |
| rugby | 3 | 2 | 0 | 2 | 1 | 1 | 1 |
| football (american) | 3 | 2 | 0 | 2 | 1 | 1 | 1 |
| boxing, kickboxing, karate, taekwondo | 2 | 1 | 3 | 1 | 0 | 2 | 1 |
| mma | 2 | 1 | 2 | 1 | 0 | 3 | 1 |
| bjj | 2 | 1 | 1 | 0 | 0 | 3 | 2 |
| judo, wrestling | 3 | 1 | 1 | 0 | 0 | 2 | 2 |
| sprinting | 2 | 2 | 0 | 3 | 0 | 0 | 1 |
| jumping | 2 | 3 | 0 | 2 | 0 | 0 | 1 |
| throwing | 3 | 1 | 3 | 0 | 0 | 0 | 1 |
| running, triathlon | 2 | 2 | 0 | 1 | 0 | 0 | 2 |
| cycling | 2 | 1 | 0 | 0 | 0 | 0 | 2 |
| swimming | 2 | 0 | 1 | 0 | 0 | 0 | 2 |
| tennis | 1 | 2 | 2 | 1 | 3 | 1 | 1 |
| squash | 1 | 2 | 1 | 1 | 3 | 2 | 1 |
| badminton | 1 | 3 | 1 | 1 | 3 | 1 | 1 |
| powerlifting | 3 | 1 | 0 | 0 | 0 | 1 | 2 |
| weightlifting | 3 | 2 | 0 | 0 | 0 | 0 | 2 |
| crossfit | 2 | 2 | 1 | 0 | 0 | 2 | 1 |
| bodybuilding | 3 | 1 | 0 | 0 | 0 | 1 | 1 |
| climbing | 2 | 1 | 1 | 0 | 0 | 1 | 2 |
| gymnastics | 2 | 2 | 1 | 0 | 0 | 0 | 3 |
| other | 2 | 2 | 0 | 1 | 1 | 1 | 1 |

- [ ] **Step 1: Write the migration** — a `VALUES` list `(sport_slug, category_slug, relevance)` covering every (sport × pillar) cell of the matrix above (including the 0 cells), upserted:

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Pillar preset levels per sport (spec §1.5): 0 = hidden, 1-3 = default level.
-- score_weight stays at its 1.0 default (tuning is phase 5).
INSERT INTO sport_category_relevance (sport_id, category_id, relevance)
SELECT s.id, c.id, v.relevance
FROM (VALUES
  ('soccer','strength',2),('soccer','lower_body_plyometrics',2),('soccer','upper_body_plyometrics',0),('soccer','sprints',2),('soccer','cod',2),('soccer','conditioning',1),('soccer','mobility',1),
  ('hockey','strength',2),('hockey','lower_body_plyometrics',2),('hockey','upper_body_plyometrics',0),('hockey','sprints',2),('hockey','cod',2),('hockey','conditioning',1),('hockey','mobility',1),
  ('basketball','strength',2),('basketball','lower_body_plyometrics',3),('basketball','upper_body_plyometrics',0),('basketball','sprints',1),('basketball','cod',2),('basketball','conditioning',1),('basketball','mobility',1),
  ('volleyball','strength',2),('volleyball','lower_body_plyometrics',3),('volleyball','upper_body_plyometrics',1),('volleyball','sprints',1),('volleyball','cod',1),('volleyball','conditioning',1),('volleyball','mobility',1),
  ('handball','strength',2),('handball','lower_body_plyometrics',2),('handball','upper_body_plyometrics',2),('handball','sprints',1),('handball','cod',2),('handball','conditioning',1),('handball','mobility',1),
  ('rugby','strength',3),('rugby','lower_body_plyometrics',2),('rugby','upper_body_plyometrics',0),('rugby','sprints',2),('rugby','cod',1),('rugby','conditioning',1),('rugby','mobility',1),
  ('football','strength',3),('football','lower_body_plyometrics',2),('football','upper_body_plyometrics',0),('football','sprints',2),('football','cod',1),('football','conditioning',1),('football','mobility',1),
  ('boxing','strength',2),('boxing','lower_body_plyometrics',1),('boxing','upper_body_plyometrics',3),('boxing','sprints',1),('boxing','cod',0),('boxing','conditioning',2),('boxing','mobility',1),
  ('kickboxing','strength',2),('kickboxing','lower_body_plyometrics',1),('kickboxing','upper_body_plyometrics',3),('kickboxing','sprints',1),('kickboxing','cod',0),('kickboxing','conditioning',2),('kickboxing','mobility',1),
  ('karate','strength',2),('karate','lower_body_plyometrics',1),('karate','upper_body_plyometrics',3),('karate','sprints',1),('karate','cod',0),('karate','conditioning',2),('karate','mobility',1),
  ('taekwondo','strength',2),('taekwondo','lower_body_plyometrics',1),('taekwondo','upper_body_plyometrics',3),('taekwondo','sprints',1),('taekwondo','cod',0),('taekwondo','conditioning',2),('taekwondo','mobility',1),
  ('mma','strength',2),('mma','lower_body_plyometrics',1),('mma','upper_body_plyometrics',2),('mma','sprints',1),('mma','cod',0),('mma','conditioning',3),('mma','mobility',1),
  ('bjj','strength',2),('bjj','lower_body_plyometrics',1),('bjj','upper_body_plyometrics',1),('bjj','sprints',0),('bjj','cod',0),('bjj','conditioning',3),('bjj','mobility',2),
  ('judo','strength',3),('judo','lower_body_plyometrics',1),('judo','upper_body_plyometrics',1),('judo','sprints',0),('judo','cod',0),('judo','conditioning',2),('judo','mobility',2),
  ('wrestling','strength',3),('wrestling','lower_body_plyometrics',1),('wrestling','upper_body_plyometrics',1),('wrestling','sprints',0),('wrestling','cod',0),('wrestling','conditioning',2),('wrestling','mobility',2),
  ('sprinting','strength',2),('sprinting','lower_body_plyometrics',2),('sprinting','upper_body_plyometrics',0),('sprinting','sprints',3),('sprinting','cod',0),('sprinting','conditioning',0),('sprinting','mobility',1),
  ('jumping','strength',2),('jumping','lower_body_plyometrics',3),('jumping','upper_body_plyometrics',0),('jumping','sprints',2),('jumping','cod',0),('jumping','conditioning',0),('jumping','mobility',1),
  ('throwing','strength',3),('throwing','lower_body_plyometrics',1),('throwing','upper_body_plyometrics',3),('throwing','sprints',0),('throwing','cod',0),('throwing','conditioning',0),('throwing','mobility',1),
  ('running','strength',2),('running','lower_body_plyometrics',2),('running','upper_body_plyometrics',0),('running','sprints',1),('running','cod',0),('running','conditioning',0),('running','mobility',2),
  ('triathlon','strength',2),('triathlon','lower_body_plyometrics',2),('triathlon','upper_body_plyometrics',0),('triathlon','sprints',1),('triathlon','cod',0),('triathlon','conditioning',0),('triathlon','mobility',2),
  ('cycling','strength',2),('cycling','lower_body_plyometrics',1),('cycling','upper_body_plyometrics',0),('cycling','sprints',0),('cycling','cod',0),('cycling','conditioning',0),('cycling','mobility',2),
  ('swimming','strength',2),('swimming','lower_body_plyometrics',0),('swimming','upper_body_plyometrics',1),('swimming','sprints',0),('swimming','cod',0),('swimming','conditioning',0),('swimming','mobility',2),
  ('tennis','strength',1),('tennis','lower_body_plyometrics',2),('tennis','upper_body_plyometrics',2),('tennis','sprints',1),('tennis','cod',3),('tennis','conditioning',1),('tennis','mobility',1),
  ('squash','strength',1),('squash','lower_body_plyometrics',2),('squash','upper_body_plyometrics',1),('squash','sprints',1),('squash','cod',3),('squash','conditioning',2),('squash','mobility',1),
  ('badminton','strength',1),('badminton','lower_body_plyometrics',3),('badminton','upper_body_plyometrics',1),('badminton','sprints',1),('badminton','cod',3),('badminton','conditioning',1),('badminton','mobility',1),
  ('powerlifting','strength',3),('powerlifting','lower_body_plyometrics',1),('powerlifting','upper_body_plyometrics',0),('powerlifting','sprints',0),('powerlifting','cod',0),('powerlifting','conditioning',1),('powerlifting','mobility',2),
  ('weightlifting','strength',3),('weightlifting','lower_body_plyometrics',2),('weightlifting','upper_body_plyometrics',0),('weightlifting','sprints',0),('weightlifting','cod',0),('weightlifting','conditioning',0),('weightlifting','mobility',2),
  ('crossfit','strength',2),('crossfit','lower_body_plyometrics',2),('crossfit','upper_body_plyometrics',1),('crossfit','sprints',0),('crossfit','cod',0),('crossfit','conditioning',2),('crossfit','mobility',1),
  ('bodybuilding','strength',3),('bodybuilding','lower_body_plyometrics',1),('bodybuilding','upper_body_plyometrics',0),('bodybuilding','sprints',0),('bodybuilding','cod',0),('bodybuilding','conditioning',1),('bodybuilding','mobility',1),
  ('climbing','strength',2),('climbing','lower_body_plyometrics',1),('climbing','upper_body_plyometrics',1),('climbing','sprints',0),('climbing','cod',0),('climbing','conditioning',1),('climbing','mobility',2),
  ('gymnastics','strength',2),('gymnastics','lower_body_plyometrics',2),('gymnastics','upper_body_plyometrics',1),('gymnastics','sprints',0),('gymnastics','cod',0),('gymnastics','conditioning',0),('gymnastics','mobility',3),
  ('other','strength',2),('other','lower_body_plyometrics',2),('other','upper_body_plyometrics',0),('other','sprints',1),('other','cod',1),('other','conditioning',1),('other','mobility',1)
) AS v(sport_slug, category_slug, relevance)
JOIN sports s ON s.slug = v.sport_slug
JOIN categories c ON c.slug = v.category_slug
ON CONFLICT (sport_id, category_id) DO UPDATE SET relevance = EXCLUDED.relevance;
```

- [ ] **Step 2: Apply** — `supabase migration up`.
- [ ] **Step 3: Verify coverage + budget rule**

```bash
docker exec supabase_db_jemp psql -U postgres -d postgres \
 -tc "SELECT count(*) FROM sports s WHERE (SELECT count(*) FROM sport_category_relevance scr JOIN categories c ON c.id = scr.category_id AND c.is_active WHERE scr.sport_id = s.id) <> 7;" \
 -tc "SELECT count(*) FROM (SELECT scr.sport_id, sum(scr.relevance) AS total, count(*) FILTER (WHERE scr.relevance > 0) AS visible FROM sport_category_relevance scr JOIN categories c ON c.id = scr.category_id AND c.is_active GROUP BY scr.sport_id) t WHERE t.total > t.visible + 4;"
```
Expected: `0` (every sport has exactly 7 active-pillar rows) and `0` (no budget violation).

- [ ] **Step 4: Commit** — `feat(db): seed 32-sport pillar preset matrix`

---

### Task 5: Legacy ranking translation → user_pillar_levels

**Files:**
- Create: `supabase/migrations/20261008100400_translate_rankings_to_pillar_levels.sql`

**Interfaces:**
- Produces: `user_pillar_levels` rows (`set_by_wizard = false`) approximating the old focus rankings — priority 1 → level 3, priority 2 → level 2, others → level 1. Purpose: pre-filling the Phase-3b wizard; per §6.5 these rows never activate v2.

- [ ] **Step 1: Write the migration**

```sql
-- ⚠️ ROLLOUT GATE (§6.3): prod-deploy ONLY after app 3.0.0 is live + MIN_SUPPORTED_VERSION flip. Local/dev: safe anytime.
SET LOCAL lock_timeout = '5s';

-- Lossy approximation of the old focus ranking (spec §6.1 step 4 / §6.5):
-- pre-fills the new wizard; set_by_wizard stays false so the v2 generator
-- gate (shouldUseV2) is NEVER activated by translated rows.
INSERT INTO user_pillar_levels (user_id, category_id, level, set_by_wizard)
SELECT utc.user_id, utc.category_id,
  CASE WHEN utc.priority = 1 THEN 3 WHEN utc.priority = 2 THEN 2 ELSE 1 END,
  false
FROM user_targeted_categories utc
JOIN categories c ON c.id = utc.category_id AND c.is_active
ON CONFLICT (user_id, category_id) DO NOTHING;
```

- [ ] **Step 2: Apply + verify the gate stays cold**

```bash
docker exec supabase_db_jemp psql -U postgres -d postgres \
 -tc "SELECT count(*) FROM user_pillar_levels WHERE set_by_wizard = true;" \
 -tc "SELECT count(DISTINCT user_id) FROM user_pillar_levels;" \
 -tc "SELECT count(DISTINCT user_id) FROM user_targeted_categories;"
```
Expected: first count `0` (Review Focus 4 — no wizard rows exist yet); the two user counts equal.

- [ ] **Step 3: Regenerate types + closing verification**

```bash
supabase gen types typescript --local > database.types.ts   # installed CLI, never npx
npx tsc --noEmit 2>&1 | wc -l    # root baseline unchanged
cd externals/jemp-temporal-worker && npm test                # 77/77 — v2 engine unaffected
```

- [ ] **Step 4: Commit** — `feat(db): translate legacy focus rankings to pillar levels (set_by_wizard=false)` (include `database.types.ts` if changed)

---

### Task 6: Legacy-path category freeze (worker guard)

After step 4, `sport_category_relevance` carries 7 pillar rows with preset semantics — but the **legacy** generator keeps serving every non-wizard user and derives its allowed category slugs from exactly this table. Without a guard it would suddenly plan `sprints`/`cod`/`conditioning` blocks (untested behavior drift) and re-weight categories by preset values.

**Files:**
- Create: `externals/jemp-temporal-worker/src/plan-generation/legacy-categories.ts`
- Modify: `externals/jemp-temporal-worker/src/activities/prepare-plan-generation.ts` (legacy input assembly only)
- Test: `externals/jemp-temporal-worker/src/plan-generation/__tests__/legacy-categories.test.ts`

**Interfaces:**
- Produces: `freezeLegacyCategories<T extends { category: string }>(rows: T[]): T[]` — filters to the legacy set `strength, lower_body_plyometrics, upper_body_plyometrics, mobility, jumps` (jumps tolerated pre-merge). Applied to `sport_required_categories` AND `user_focus_categories` in the **legacy** branch only; the v2 branch keeps the full pillar view.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest'
import { freezeLegacyCategories } from '../legacy-categories'

describe('freezeLegacyCategories', () => {
  it('filters post-step-4 pillar rows down to the legacy category set', () => {
    const rows = [
      { category: 'strength', relevance: 2 },
      { category: 'sprints', relevance: 2 },
      { category: 'cod', relevance: 2 },
      { category: 'conditioning', relevance: 1 },
      { category: 'lower_body_plyometrics', relevance: 2 },
      { category: 'mobility', relevance: 1 },
    ]
    expect(freezeLegacyCategories(rows).map((r) => r.category)).toEqual(
      ['strength', 'lower_body_plyometrics', 'mobility'])
  })
  it('passes the pre-step-4 world through unchanged', () => {
    const rows = [{ category: 'jumps', relevance: 2 }, { category: 'strength', relevance: 3 }]
    expect(freezeLegacyCategories(rows)).toEqual(rows)
  })
})
```

- [ ] **Step 2: RED**, then implement:

```typescript
// The legacy generator's world view is frozen to the pre-pillar categories:
// after the §6.1-step-4 data migration the relevance table carries 7 pillar
// rows, but the legacy path must never plan sprints/cod/conditioning blocks
// (untested drift). The v2 path sees the full pillar view.
const LEGACY_CATEGORY_SLUGS = new Set([
  'strength', 'lower_body_plyometrics', 'upper_body_plyometrics', 'mobility', 'jumps',
])

export function freezeLegacyCategories<T extends { category: string }>(rows: T[]): T[] {
  return rows.filter((r) => LEGACY_CATEGORY_SLUGS.has(r.category))
}
```

In `prepare-plan-generation.ts`, wrap the two legacy-input fields:
`sport_required_categories: freezeLegacyCategories(sportRequiredCategories)` and `user_focus_categories: freezeLegacyCategories(userFocusCategories)` — **inside `legacyInput` only** (the v2 branch builds its pillar levels from `user_pillar_levels`, not from these fields, and stays untouched).

- [ ] **Step 3: GREEN + build** — `npm test` (all green incl. 2 new), `npm run build`, worker `npx tsc --noEmit` → 0.
- [ ] **Step 4: Commit** — `feat(worker): freeze legacy generator category view against pillar data migration`
