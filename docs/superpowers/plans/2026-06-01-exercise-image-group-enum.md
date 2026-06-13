# Exercise Image Group Enum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native PostgreSQL enum `exercise_image_group` with a nullable column on `exercises`, populate it via migration, and update the frontend to use the DB value with the existing `SLUG_TO_GROUP` map as a fallback.

**Architecture:** Two new migrations (enum+column, then seed UPDATEs) keep DB changes atomic and reviewable. Frontend changes are minimal: `getSessionImage` gets an extra optional param, the plan query fetches `image_group`, and call sites in `(tabs)/plan.tsx` and `(tabs)/index.tsx` pass it through. `exercise-groups.ts` is untouched.

**Tech Stack:** PostgreSQL (Supabase), React Native / Expo Router, TypeScript, TanStack Query

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/20260601100000_add_exercise_image_group_enum.sql` | **Create** — enum type + ALTER TABLE |
| `supabase/migrations/20260601110000_seed_exercise_image_groups.sql` | **Create** — UPDATE for all 19 groups |
| `constants/session-images.ts` | **Modify** — `getSessionImage` accepts optional `imageGroup` |
| `queries/use-plan-query.ts` | **Modify** — select `image_group`, expose `primary_image_group` |
| `app/(tabs)/plan.tsx` | **Modify** — pass `image_group` to `getSessionImage` |
| `app/(tabs)/index.tsx` | **Modify** — pass `image_group` to `getSessionImage` |

---

### Task 1: Migration — enum type and column

**Files:**
- Create: `supabase/migrations/20260601100000_add_exercise_image_group_enum.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260601100000_add_exercise_image_group_enum.sql

CREATE TYPE exercise_image_group AS ENUM (
    'squat_patterns',
    'hip_hinge',
    'hip_thrust',
    'upper_push',
    'upper_pull',
    'olympic_lifts',
    'dumbbell_complex',
    'loaded_carry',
    'vertical_jumps',
    'horizontal_jumps',
    'hurdle_hops',
    'reactive_jumps',
    'sprints',
    'sled_exercises',
    'agility',
    'conditioning',
    'medicine_ball',
    'explosive_push',
    'mobility'
);

ALTER TABLE exercises ADD COLUMN image_group exercise_image_group;
```

- [ ] **Step 2: Apply the migration locally**

```bash
supabase db reset
```

Expected: migration runs without errors. Or if you don't want to reset:

```bash
supabase migration up
```

- [ ] **Step 3: Verify column exists**

```bash
supabase db shell --local
```

```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'exercises' AND column_name = 'image_group';
```

Expected: one row with `udt_name = exercise_image_group`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601100000_add_exercise_image_group_enum.sql
git commit -m "feat: add exercise_image_group enum type and column to exercises"
```

---

### Task 2: Migration — populate existing exercises

**Files:**
- Create: `supabase/migrations/20260601110000_seed_exercise_image_groups.sql`

- [ ] **Step 1: Create the seed migration**

```sql
-- supabase/migrations/20260601110000_seed_exercise_image_groups.sql
-- Populates image_group for all exercises currently in exercise-groups.ts.
-- Exercises not listed here stay NULL and fall back to SLUG_TO_GROUP client-side.

UPDATE exercises SET image_group = 'squat_patterns'
WHERE slug IN ('back_squat', 'front_squat', 'bulgarian_split_squat', 'pistol_squat');

UPDATE exercises SET image_group = 'hip_hinge'
WHERE slug IN ('conventional_deadlift', 'sumo_deadlift', 'trap_bar_deadlift',
               'romanian_deadlift', 'nordic_curl', 'nordic_hamstring_curl');

UPDATE exercises SET image_group = 'hip_thrust'
WHERE slug IN ('hip_thrust', 'banded_hip_thrust');

UPDATE exercises SET image_group = 'upper_push'
WHERE slug IN ('bench_press', 'incline_bench_press', 'push_up', 'dips',
               'tricep_dip', 'push_press');

UPDATE exercises SET image_group = 'upper_pull'
WHERE slug IN ('pull_up', 'chin_up', 'weighted_pull_up');

UPDATE exercises SET image_group = 'olympic_lifts'
WHERE slug IN ('power_clean', 'hang_power_clean', 'power_snatch', 'hang_power_snatch');

UPDATE exercises SET image_group = 'dumbbell_complex'
WHERE slug IN ('dumbbell_thruster', 'dumbbell_snatch', 'dumbbell_clean', 'dumbbell_swing');

UPDATE exercises SET image_group = 'loaded_carry'
WHERE slug IN ('farmers_walk', 'isometric_mid_thigh_pull');

UPDATE exercises SET image_group = 'vertical_jumps'
WHERE slug IN ('box_jump', 'depth_jump', 'drop_jump', 'vertical_jump',
               'single_leg_box_jump', 'jump_squat', 'squat_jump_to_stick');

UPDATE exercises SET image_group = 'horizontal_jumps'
WHERE slug IN ('broad_jump', 'lateral_bounds', 'lateral_hurdle_hop');

UPDATE exercises SET image_group = 'hurdle_hops'
WHERE slug IN ('hurdle_hops');

UPDATE exercises SET image_group = 'reactive_jumps'
WHERE slug IN ('pogos');

UPDATE exercises SET image_group = 'sprints'
WHERE slug IN ('sprint_10m', 'sprint_30m', 'sprint_10m_flying', 'flying_20_sprint',
               'resisted_sprint', 'sprint_parachute_run', 'sprint_start_blocks',
               'acceleration_sprint_10m', 'banded_sprint_resistance_run',
               'sprint_in_place', 'stair_sprint', 'prowler_push_sprint');

UPDATE exercises SET image_group = 'sled_exercises'
WHERE slug IN ('sled_push', 'sled_pull');

UPDATE exercises SET image_group = 'agility'
WHERE slug IN ('agility_505', 'pro_agility_shuttle', 't_drill',
               'agility_ladder_ickey_shuffle', 'agility_ladder_single_leg_hops',
               'lateral_shuffle');

UPDATE exercises SET image_group = 'conditioning'
WHERE slug IN ('burpee', 'burpee_broad_jump', 'bear_crawl', 'star_jump',
               'jump_rope_double_under', 'mountain_climber', 'shadow_boxing');

UPDATE exercises SET image_group = 'medicine_ball'
WHERE slug IN ('mb_chest_throw', 'mb_overhead_throw', 'mb_rotational_throw',
               'medicine_ball_slam', 'rotational_med_ball_throw',
               'med_ball_chest_pass', 'med_ball_overhead_throw', 'med_ball_scoop_toss');

UPDATE exercises SET image_group = 'explosive_push'
WHERE slug IN ('clap_push_up');

UPDATE exercises SET image_group = 'mobility'
WHERE slug IN (
    'glute_foam_roll', 'yoga_sun_salutation', 'shoulder_cars', 'wrist_mobility_circles',
    'worlds_greatest_stretch', 'standing_spinal_rotation', 'prone_hip_internal_rotation',
    'hip_90_90_stretch', 'leg_swing_side_to_side', 'ankle_cars', 'hip_flexor_lunge_stretch',
    'hip_cars', 'leg_swing_front_to_back', 'supine_twist', 'thoracic_foam_roll',
    'arm_circle', 'quad_foam_roll', 'lat_foam_roll', 'kneeling_adductor_stretch',
    'it_band_foam_roll', 'hamstring_foam_roll', 'diaphragmatic_breathing', 'cat_cow_stretch',
    'childs_pose', 'doorway_chest_stretch', 'box_breathing', 'standing_quad_stretch',
    'banded_ankle_distraction', 'thread_the_needle', 'upper_trap_stretch',
    'thoracic_extension_chair', 'standing_calf_stretch', 'seated_piriformis_stretch'
);
```

- [ ] **Step 2: Apply the migration and verify**

```bash
supabase migration up
```

Then in `supabase db shell --local`:

```sql
SELECT image_group, COUNT(*) FROM exercises GROUP BY image_group ORDER BY image_group;
```

Expected: rows for all 19 groups plus a `NULL` row for exercises not yet mapped.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260601110000_seed_exercise_image_groups.sql
git commit -m "feat: seed image_group values for all existing exercises"
```

---

### Task 3: Update `getSessionImage` to accept `imageGroup`

**Files:**
- Modify: `constants/session-images.ts`

- [ ] **Step 1: Update the function signature and logic**

Replace the entire file content:

```typescript
import { SLUG_TO_GROUP } from './exercise-groups';

// Static require map — filenames match assets/stock_images/ exactly
// (two files use .jpeg, rest use .jpg; hurdle_humps and load_carry are filename typos in the assets)
const GROUP_IMAGES: Record<string, any> = {
    squat_patterns:         require('@/assets/stock_images/squat_patterns.jpg'),
    hip_hinge:              require('@/assets/stock_images/hip_hinge.jpeg'),
    hip_thrust:             require('@/assets/stock_images/hip_thrust.jpg'),
    upper_push:             require('@/assets/stock_images/upper_push.jpg'),
    upper_pull:             require('@/assets/stock_images/upper_pull.jpg'),
    olympic_lifts:          require('@/assets/stock_images/olympic_lifts.jpg'),
    dumbbell_complex:       require('@/assets/stock_images/dumbbell_complex.jpg'),
    loaded_carry:           require('@/assets/stock_images/load_carry.jpg'),
    vertical_jumps:         require('@/assets/stock_images/vertical_jumps.jpg'),
    horizontal_jumps:       require('@/assets/stock_images/horizontal_jumps.jpg'),
    hurdle_hops:            require('@/assets/stock_images/hurdle_humps.jpg'),
    reactive_jumps:         require('@/assets/stock_images/reactive_jumps.jpg'),
    sprints:                require('@/assets/stock_images/sprints.jpg'),
    agility:                require('@/assets/stock_images/agility.jpg'),
    conditioning:           require('@/assets/stock_images/conditioning.jpg'),
    medicine_ball:          require('@/assets/stock_images/medicine_ball.jpg'),
    explosive_push:         require('@/assets/stock_images/explosive_push.jpg'),
    sled_exercises:         require('@/assets/stock_images/sled_exercises.jpeg'),
    mobility:               require('@/assets/stock_images/mobility.jpeg'),
};

const FALLBACK = require('@/assets/images/splash-icon.png');

/**
 * Returns a static stock image for a session card.
 * Prefers the DB-stored imageGroup value; falls back to deriving from exerciseSlug
 * via SLUG_TO_GROUP for exercises where image_group is not yet set.
 */
export function getSessionImage(
    exerciseSlug?: string | null,
    imageGroup?: string | null,
): any {
    if (imageGroup) return GROUP_IMAGES[imageGroup] ?? FALLBACK;
    if (!exerciseSlug) return FALLBACK;
    const group = SLUG_TO_GROUP[exerciseSlug];
    return GROUP_IMAGES[group] ?? FALLBACK;
}
```

- [ ] **Step 2: Commit**

```bash
git add constants/session-images.ts
git commit -m "feat: getSessionImage accepts imageGroup param with slug fallback"
```

---

### Task 4: Update plan query to fetch and expose `image_group`

**Files:**
- Modify: `queries/use-plan-query.ts`

- [ ] **Step 1: Add `image_group` to exercise selects and expose `primary_image_group`**

Replace the entire file content:

```typescript
import { useCurrentUser } from '@/providers/current-user-provider';
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

async function fetchActivePlan(userId: string) {
    const { data: plan } = await supabase
        .from('workout_plans')
        .select('id, name, start_date, end_date')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .maybeSingle();

    if (!plan) return { plan: null, sessions: [], planSessions: [] };

    const [sessionsRes, planSessionsRes] = await Promise.all([
        supabase
            .from('workout_sessions')
            .select(`
                id, name, description, session_type, scheduled_at, status,
                estimated_duration_minutes, workout_plan_session_id,
                workout_session_blocks(
                    block_type:block_types(slug),
                    workout_session_block_exercises(order_index, exercise:exercises(slug, image_group))
                )
            `)
            .eq('workout_plan_id', plan.id)
            .order('scheduled_at', { ascending: true }),
        supabase
            .from('workout_plan_sessions')
            .select(`
                id, plan_id, name, description, session_type, day_of_week,
                estimated_duration_minutes, mode_slug,
                workout_plan_session_blocks(
                    block_type:block_types(slug),
                    workout_plan_session_block_exercises(order_index, exercise:exercises(slug, image_group))
                )
            `)
            .eq('plan_id', plan.id),
    ]);

    function extractPrimaryExerciseInfo(blocks: any[]): { slug: string | null; imageGroup: string | null } {
        const primary = (blocks ?? []).find((b: any) => b.block_type?.slug === 'primary');
        if (!primary) return { slug: null, imageGroup: null };
        const exercises = (primary.workout_session_block_exercises ?? primary.workout_plan_session_block_exercises ?? []);
        const sorted = [...exercises].sort((a: any, b: any) => a.order_index - b.order_index);
        const first = sorted[0]?.exercise;
        return { slug: first?.slug ?? null, imageGroup: first?.image_group ?? null };
    }

    return {
        plan,
        sessions: (sessionsRes.data ?? []).map(s => {
            const { slug, imageGroup } = extractPrimaryExerciseInfo((s as any).workout_session_blocks ?? []);
            return { ...s, primary_exercise_slug: slug, primary_image_group: imageGroup };
        }),
        planSessions: (planSessionsRes.data ?? []).map(ps => {
            const { slug, imageGroup } = extractPrimaryExerciseInfo((ps as any).workout_plan_session_blocks ?? []);
            return { ...ps, primary_exercise_slug: slug, primary_image_group: imageGroup };
        }),
    };
}

export function usePlanQuery() {
    const { profile } = useCurrentUser();

    return useQuery({
        queryKey: queryKeys.plan(profile?.id),
        queryFn: () => fetchActivePlan(profile!.id),
        enabled: !!profile?.id,
        staleTime: 5 * 60 * 1000,
    });
}
```

- [ ] **Step 2: Commit**

```bash
git add queries/use-plan-query.ts
git commit -m "feat: fetch image_group in plan query, expose primary_image_group"
```

---

### Task 5: Update call sites in plan and home screens

**Files:**
- Modify: `app/(tabs)/plan.tsx`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Update `app/(tabs)/plan.tsx`**

Find the two `getSessionImage` calls (lines ~100 and ~164) and add the `image_group` argument.

Line ~100 — session card:
```typescript
// Before:
source={getSessionImage(session.primary_exercise_slug)}
// After:
source={getSessionImage(session.primary_exercise_slug, session.primary_image_group)}
```

Line ~164 — plan session card:
```typescript
// Before:
source={getSessionImage(planSession.primary_exercise_slug)}
// After:
source={getSessionImage(planSession.primary_exercise_slug, planSession.primary_image_group)}
```

- [ ] **Step 2: Update `app/(tabs)/index.tsx`**

Line ~169 — next session card:
```typescript
// Before:
source={getSessionImage(nextSession.primary_exercise_slug)}
// After:
source={getSessionImage(nextSession.primary_exercise_slug, nextSession.primary_image_group)}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/plan.tsx app/\(tabs\)/index.tsx
git commit -m "feat: pass primary_image_group to getSessionImage in plan and home screens"
```

---

### Task 6: Smoke test

- [ ] **Step 1: Start the dev server**

```bash
npx expo start
```

- [ ] **Step 2: Verify images load on home and plan screens**

Open `(tabs)/` and `(tabs)/plan` in the simulator/device. Session cards should show the same stock images as before. No regression.

- [ ] **Step 3: Verify fallback still works**

If you have a session whose primary exercise is not in the DB `image_group` column (NULL), it should still load the correct image via the `SLUG_TO_GROUP` fallback.
