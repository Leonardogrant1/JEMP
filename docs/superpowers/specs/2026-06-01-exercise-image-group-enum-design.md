# Exercise Image Group Enum — Design Spec

**Date:** 2026-06-01

## Problem

The current image loading logic for session cards in `(tabs)/plan` and `(tabs)/` computes the image group client-side via `SLUG_TO_GROUP` in `constants/exercise-groups.ts`. New exercises not listed in that map get no image. There is no way to assign an image group to a new exercise without editing frontend constants.

## Solution

Add a native PostgreSQL enum `exercise_image_group` and a nullable column on `exercises`. The frontend reads this value directly; the existing `SLUG_TO_GROUP` map stays as a fallback for exercises where the column is null.

---

## Database

### New enum type

```sql
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
```

Values mirror the keys of `EXERCISE_GROUPS` in `constants/exercise-groups.ts` exactly.

### Column

```sql
ALTER TABLE exercises ADD COLUMN image_group exercise_image_group;
```

Nullable — exercises without a value fall back to the frontend lookup.

### Migration to populate existing exercises

One `UPDATE` per group, matching on `slug`:

```sql
UPDATE exercises SET image_group = 'squat_patterns'
WHERE slug IN ('back_squat', 'front_squat', 'bulgarian_split_squat', 'pistol_squat');
-- ... repeated for all 19 groups
```

All slugs are sourced directly from `constants/exercise-groups.ts` so the migration matches the current frontend mapping exactly.

---

## Frontend

### `constants/session-images.ts`

`getSessionImage` gets a second optional parameter `imageGroup`:

```typescript
export function getSessionImage(
    exerciseSlug?: string | null,
    imageGroup?: string | null,
): any {
    // Prefer DB value
    if (imageGroup) return GROUP_IMAGES[imageGroup] ?? FALLBACK;
    // Fallback: derive from slug
    if (!exerciseSlug) return FALLBACK;
    const group = SLUG_TO_GROUP[exerciseSlug];
    return GROUP_IMAGES[group] ?? FALLBACK;
}
```

### Queries (plan + home screen)

The exercise select in `use-plan-query.ts` (and any equivalent home-screen query) adds `image_group` to the exercise fields fetched from Supabase.

### Call sites in `(tabs)/plan.tsx` and `(tabs)/index.tsx`

Pass both `primaryExerciseSlug` and `primaryExercise.image_group` to `getSessionImage`.

---

## What stays unchanged

- `constants/exercise-groups.ts` — kept as-is, used as fallback
- `SLUG_TO_GROUP` — kept as-is
- All other exercise queries and components

---

## Adding a new group in the future

1. `ALTER TYPE exercise_image_group ADD VALUE 'new_group';` in a migration
2. Add the asset to `assets/stock_images/`
3. Add the entry to `GROUP_IMAGES` in `session-images.ts`
4. Set `image_group = 'new_group'` on the relevant exercises via migration
