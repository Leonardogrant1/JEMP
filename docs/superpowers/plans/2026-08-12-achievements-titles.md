# Achievements & Titles v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gamification layer: a tier-based title derived from the overall score (shown in the profile) plus permanent, absolute assessment milestones ("100kg Bench") persisted in Supabase, with an achievements screen and an unlock celebration.

**Architecture:** Achievement definitions live as a TypeScript catalog in `constants/achievements.ts` (mirrors the app's client-side-scoring pattern). Unlocks are persisted in a new `user_achievements` table. Awarding happens inside the existing `use-complete-assessment` mutation via a pure `computeNewUnlocks` function; a chronological-replay backfill grants historical unlocks to existing users. Titles are never persisted — they derive from the overall score via a new shared tier helper.

**Tech Stack:** Expo Router / React Native, Supabase (local dev DB), TanStack Query, react-i18next, jest (`jest-expo` preset), TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-12-achievements-titles-design.md`

## Global Constraints

- Branch: `feat/achievements-titles`. Commit per task on this branch only.
- **Supabase: local dev DB only.** Apply migrations with `npx supabase migration up`. NEVER run anything against production (no `supabase db push` to a linked remote).
- Tests: `npx jest <path>` (config in `jest.config.js`, preset `jest-expo`, moduleNameMapper `@/ → <rootDir>/`).
- Typecheck: `npx tsc --noEmit`. Lint: `npx expo lint` (optional per task, must pass before final review).
- Code style: 4-space indent, single quotes, existing file/naming conventions (`kebab-case` files, `queries/use-*-query.ts`, `mutations/use-*.ts`).
- i18n: every user-facing string gets a key in BOTH `i18n/locales/en.ts` and `i18n/locales/de.ts` (flat `'namespace.key': 'value'` maps). Tier display names stay English in both locales.
- All stored measurement values are metric; imperial is display-only via `helpers/units.ts` → `displayMetricValue`.
- Scores are 1–100 integers app-wide.

---

### Task 1: Tier system helper (`constants/tiers.ts`) + onboarding refactor

**Files:**
- Create: `constants/tiers.ts`
- Create: `constants/__tests__/tiers.test.ts`
- Modify: `components/onboarding/steps/category-level-step.tsx` (remove `scoreToLabelKey`, lines 41–47, and its usage at line 135)
- Modify: `i18n/locales/en.ts` (replace keys around line 483), `i18n/locales/de.ts` (around line 485)

**Interfaces:**
- Consumes: nothing.
- Produces: `TierSlug`, `Tier = { slug: TierSlug; min: number; color: string; i18nKey: string }`, `TIERS: Tier[]` (ordered top-down), `tierForScore(score: number): Tier`, `nextTier(score: number): Tier | null`. Later tasks import all of these from `@/constants/tiers`.

- [ ] **Step 1: Write the failing test**

Create `constants/__tests__/tiers.test.ts`:

```ts
import { TIERS, tierForScore, nextTier } from '../tiers';

describe('tierForScore', () => {
    it.each([
        [1, 'novice'], [24, 'novice'],
        [25, 'beginner'], [44, 'beginner'],
        [45, 'average'], [64, 'average'],
        [65, 'advanced'], [84, 'advanced'],
        [85, 'elite'], [89, 'elite'],
        [90, 'apex'], [100, 'apex'],
    ])('score %i → %s', (score, slug) => {
        expect(tierForScore(score).slug).toBe(slug);
    });

    it('clamps out-of-range scores', () => {
        expect(tierForScore(0).slug).toBe('novice');
        expect(tierForScore(-5).slug).toBe('novice');
        expect(tierForScore(140).slug).toBe('apex');
    });

    it('rounds fractional scores', () => {
        expect(tierForScore(89.6).slug).toBe('apex');
        expect(tierForScore(89.4).slug).toBe('elite');
    });
});

describe('nextTier', () => {
    it('returns the next-higher tier', () => {
        expect(nextTier(70)?.slug).toBe('elite');
        expect(nextTier(86)?.slug).toBe('apex');
    });
    it('returns null at the top', () => {
        expect(nextTier(95)).toBeNull();
    });
});

describe('TIERS', () => {
    it('is ordered top-down by min', () => {
        for (let i = 1; i < TIERS.length; i++) {
            expect(TIERS[i].min).toBeLessThan(TIERS[i - 1].min);
        }
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest constants/__tests__/tiers.test.ts`
Expected: FAIL — cannot find module `../tiers`.

- [ ] **Step 3: Write the implementation**

Create `constants/tiers.ts`:

```ts
export type TierSlug = 'apex' | 'elite' | 'advanced' | 'average' | 'beginner' | 'novice';

export type Tier = {
    slug: TierSlug;
    min: number;      // inclusive lower bound of the 1-100 score range
    color: string;    // accent for chips and labels
    i18nKey: string;  // display name (English in all locales)
};

// Ordered top-down; tierForScore picks the first tier whose min the score reaches.
export const TIERS: Tier[] = [
    { slug: 'apex',     min: 90, color: '#FFD700', i18nKey: 'tiers.apex' },
    { slug: 'elite',    min: 85, color: '#A78BFA', i18nKey: 'tiers.elite' },
    { slug: 'advanced', min: 65, color: '#22D3EE', i18nKey: 'tiers.advanced' },
    { slug: 'average',  min: 45, color: '#C0C0C0', i18nKey: 'tiers.average' },
    { slug: 'beginner', min: 25, color: '#CD7F32', i18nKey: 'tiers.beginner' },
    { slug: 'novice',   min: 1,  color: '#94A3B8', i18nKey: 'tiers.novice' },
];

export function tierForScore(score: number): Tier {
    const clamped = Math.max(1, Math.min(100, Math.round(score)));
    return TIERS.find(t => clamped >= t.min) ?? TIERS[TIERS.length - 1];
}

/** The next-higher tier, or null when already at the top. */
export function nextTier(score: number): Tier | null {
    const current = tierForScore(score);
    const idx = TIERS.indexOf(current);
    return idx > 0 ? TIERS[idx - 1] : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest constants/__tests__/tiers.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Add i18n keys**

In `i18n/locales/en.ts`, REPLACE the five `'onboarding.category_level_elite'` … `'onboarding.category_level_novice'` entries (around line 483) with:

```ts
    'tiers.apex': 'Apex',
    'tiers.elite': 'Elite',
    'tiers.advanced': 'Advanced',
    'tiers.average': 'Average',
    'tiers.beginner': 'Beginner',
    'tiers.novice': 'Novice',
```

In `i18n/locales/de.ts`, REPLACE the five `'onboarding.category_level_*'` entries (around line 485) with the SAME six English values (decision: tier names stay English in all locales):

```ts
    'tiers.apex': 'Apex',
    'tiers.elite': 'Elite',
    'tiers.advanced': 'Advanced',
    'tiers.average': 'Average',
    'tiers.beginner': 'Beginner',
    'tiers.novice': 'Novice',
```

Note: the other `onboarding.category_level_title` / `_subtitle` keys stay untouched — only the five level-label keys are replaced.

- [ ] **Step 6: Refactor onboarding step to use the helper**

In `components/onboarding/steps/category-level-step.tsx`:
1. Add import: `import { tierForScore } from '@/constants/tiers';`
2. Delete the whole `scoreToLabelKey` function (lines 41–47).
3. Replace its single usage (line 135) `{t(scoreToLabelKey(score)).toUpperCase()}` with `{t(tierForScore(score).i18nKey).toUpperCase()}`.

- [ ] **Step 7: Verify no stale references and typecheck**

Run: `grep -rn "category_level_elite\|category_level_advanced\|category_level_average\|category_level_beginner\|category_level_novice\|scoreToLabelKey" --include="*.ts" --include="*.tsx" . | grep -v node_modules`
Expected: no matches.
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add constants/tiers.ts constants/__tests__/tiers.test.ts components/onboarding/steps/category-level-step.tsx i18n/locales/en.ts i18n/locales/de.ts
git commit -m "feat: add shared 6-tier score system with apex top tier"
```

---

### Task 2: Achievement catalog + `computeNewUnlocks`

**Files:**
- Create: `constants/achievements.ts`
- Create: `lib/achievements.ts`
- Create: `lib/__tests__/achievements.test.ts`

**Interfaces:**
- Consumes: `CategorySlug` from `@/constants/categories`; (test only) `calculateAssessmentScore` from `@/lib/score-calculators/assessment-score`.
- Produces:
  - `AchievementDef = { slug: string; assessmentSlug: string; category: CategorySlug; threshold: number; unit: 'kg' | 'cm' | 's' | 'count'; direction: 'gte' | 'lte'; gender?: 'male' | 'female' }`
  - `ACHIEVEMENTS: AchievementDef[]`
  - `laddersForGender(gender: 'male' | 'female'): { assessmentSlug: string; category: CategorySlug; defs: AchievementDef[] }[]`
  - `computeNewUnlocks(input: { assessmentSlug: string; value: number; gender: 'male' | 'female'; alreadyUnlocked: Set<string> }): AchievementDef[]`
  - `meetsThreshold(def: AchievementDef, value: number): boolean`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/achievements.test.ts`:

```ts
import { ACHIEVEMENTS, laddersForGender } from '@/constants/achievements';
import { computeNewUnlocks } from '../achievements';
import { calculateAssessmentScore } from '@/lib/score-calculators/assessment-score';

const DUMMY_PROFILE = { gender: 'male' as const, weight_kg: 80, height_cm: 182, birth_date: '2000-01-15' };

describe('ACHIEVEMENTS catalog integrity', () => {
    it('has unique slugs', () => {
        const slugs = ACHIEVEMENTS.map(a => a.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
    });

    it('every assessmentSlug is scoreable (exists in ASSESSMENT_SCORE_MAP)', () => {
        const assessmentSlugs = [...new Set(ACHIEVEMENTS.map(a => a.assessmentSlug))];
        for (const slug of assessmentSlugs) {
            expect(calculateAssessmentScore(slug, 2, DUMMY_PROFILE)).not.toBeNull();
        }
    });

    it('ladders are strictly ordered along their direction', () => {
        for (const { defs } of laddersForGender('male').concat(laddersForGender('female'))) {
            for (let i = 1; i < defs.length; i++) {
                if (defs[i].direction === 'gte') {
                    expect(defs[i].threshold).toBeGreaterThan(defs[i - 1].threshold);
                } else {
                    expect(defs[i].threshold).toBeLessThan(defs[i - 1].threshold);
                }
            }
        }
    });
});

describe('computeNewUnlocks', () => {
    it('unlocks every rung at or below the value (ladder auto-unlock)', () => {
        const unlocks = computeNewUnlocks({
            assessmentSlug: 'bench_press_1rm', value: 100, gender: 'male', alreadyUnlocked: new Set(),
        });
        expect(unlocks.map(u => u.slug).sort()).toEqual(
            ['bench_press_1rm_100_m', 'bench_press_1rm_60_m', 'bench_press_1rm_80_m'],
        );
    });

    it('skips already-unlocked rungs', () => {
        const unlocks = computeNewUnlocks({
            assessmentSlug: 'bench_press_1rm', value: 100, gender: 'male',
            alreadyUnlocked: new Set(['bench_press_1rm_60_m', 'bench_press_1rm_80_m']),
        });
        expect(unlocks.map(u => u.slug)).toEqual(['bench_press_1rm_100_m']);
    });

    it('uses the female ladder for female athletes', () => {
        const unlocks = computeNewUnlocks({
            assessmentSlug: 'bench_press_1rm', value: 60, gender: 'female', alreadyUnlocked: new Set(),
        });
        expect(unlocks.map(u => u.slug).sort()).toEqual(
            ['bench_press_1rm_40_f', 'bench_press_1rm_60_f'],
        );
    });

    it('handles lte direction (sprint times)', () => {
        const unlocks = computeNewUnlocks({
            assessmentSlug: 'sprint_30m', value: 4.1, gender: 'male', alreadyUnlocked: new Set(),
        });
        expect(unlocks.map(u => u.slug).sort()).toEqual(['sprint_30m_4_2', 'sprint_30m_4_6']);
    });

    it('returns empty for unknown assessments and missed thresholds', () => {
        expect(computeNewUnlocks({ assessmentSlug: 'deep_squat_hold', value: 10, gender: 'male', alreadyUnlocked: new Set() })).toEqual([]);
        expect(computeNewUnlocks({ assessmentSlug: 'bench_press_1rm', value: 50, gender: 'male', alreadyUnlocked: new Set() })).toEqual([]);
    });

    it('gender-neutral ladders apply to everyone', () => {
        const male = computeNewUnlocks({ assessmentSlug: 'max_pullups', value: 10, gender: 'male', alreadyUnlocked: new Set() });
        const female = computeNewUnlocks({ assessmentSlug: 'max_pullups', value: 10, gender: 'female', alreadyUnlocked: new Set() });
        expect(male.map(u => u.slug)).toEqual(['max_pullups_5', 'max_pullups_10']);
        expect(female.map(u => u.slug)).toEqual(['max_pullups_5', 'max_pullups_10']);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest lib/__tests__/achievements.test.ts`
Expected: FAIL — cannot find module `@/constants/achievements`.

- [ ] **Step 3: Write the catalog**

Create `constants/achievements.ts`:

```ts
import type { CategorySlug } from '@/constants/categories';

export type AchievementDef = {
    slug: string;               // unique, e.g. 'bench_press_1rm_100_m'
    assessmentSlug: string;     // must exist in ASSESSMENT_SCORE_MAP (guarded by test)
    category: CategorySlug;     // grouping on the achievements screen
    threshold: number;          // metric base unit (kg, cm, s, reps); weighted pull-ups = ADDED weight
    unit: 'kg' | 'cm' | 's' | 'count';
    direction: 'gte' | 'lte';   // lte for times (lower is better)
    gender?: 'male' | 'female'; // omitted = applies to everyone
};

function ladder(
    assessmentSlug: string,
    category: CategorySlug,
    unit: AchievementDef['unit'],
    direction: AchievementDef['direction'],
    thresholds: number[],
    gender?: 'male' | 'female',
): AchievementDef[] {
    const suffix = gender === 'female' ? '_f' : gender === 'male' ? '_m' : '';
    return thresholds.map(t => ({
        slug: `${assessmentSlug}_${String(t).replace('.', '_')}${suffix}`,
        assessmentSlug,
        category,
        threshold: t,
        unit,
        direction,
        ...(gender && { gender }),
    }));
}

// Thresholds are curated values — metric-round by design (the "100kg Club" stays 100 kg,
// imperial users see the converted display value). Gender-split ladders exist for the
// 1RM lifts; everything else is neutral. Mobility has no absolute milestones (1-10 self-rating).
export const ACHIEVEMENTS: AchievementDef[] = [
    // ── Strength — 1RM (gender-specific) ─────────────────────────────
    ...ladder('bench_press_1rm', 'strength', 'kg', 'gte', [60, 80, 100, 140], 'male'),
    ...ladder('bench_press_1rm', 'strength', 'kg', 'gte', [40, 60, 80, 100], 'female'),
    ...ladder('back_squat_1rm', 'strength', 'kg', 'gte', [100, 140, 180, 220], 'male'),
    ...ladder('back_squat_1rm', 'strength', 'kg', 'gte', [60, 90, 120, 150], 'female'),
    ...ladder('romanian_deadlift_1rm', 'strength', 'kg', 'gte', [100, 140, 180, 220], 'male'),
    ...ladder('romanian_deadlift_1rm', 'strength', 'kg', 'gte', [60, 90, 120, 150], 'female'),
    ...ladder('hip_thrust_1rm', 'strength', 'kg', 'gte', [140, 180, 220, 260], 'male'),
    ...ladder('hip_thrust_1rm', 'strength', 'kg', 'gte', [100, 140, 180, 220], 'female'),
    // Weighted pull-ups: threshold = ADDED weight in kg (matches the assessment input)
    ...ladder('weighted_pullups_1rm', 'strength', 'kg', 'gte', [10, 20, 40], 'male'),
    ...ladder('weighted_pullups_1rm', 'strength', 'kg', 'gte', [5, 12, 25], 'female'),
    // ── Strength — bodyweight reps (neutral) ─────────────────────────
    ...ladder('max_pullups', 'strength', 'count', 'gte', [5, 10, 15, 20]),
    ...ladder('max_pushups', 'strength', 'count', 'gte', [20, 40, 60]),
    ...ladder('max_dips', 'strength', 'count', 'gte', [10, 20, 30]),
    // ── Jumps ─────────────────────────────────────────────────────────
    ...ladder('vertical_jump', 'jumps', 'cm', 'gte', [40, 50, 60, 70]),
    ...ladder('broad_jump', 'jumps', 'cm', 'gte', [200, 250, 300]),
    ...ladder('box_jump', 'jumps', 'cm', 'gte', [80, 100, 120]),
    // ── Upper-body plyometrics ────────────────────────────────────────
    ...ladder('mb_chest_throw', 'upper_body_plyometrics', 'cm', 'gte', [400, 500, 600]),
    ...ladder('mb_overhead_throw', 'upper_body_plyometrics', 'cm', 'gte', [800, 1000, 1200]),
    ...ladder('mb_rotational_throw', 'upper_body_plyometrics', 'cm', 'gte', [500, 650, 800]),
    ...ladder('clap_pushups', 'upper_body_plyometrics', 'count', 'gte', [5, 15, 30]),
    // ── Speed (lower is better) ───────────────────────────────────────
    ...ladder('sprint_10m', 'lower_body_plyometrics', 's', 'lte', [2.0, 1.85, 1.7]),
    ...ladder('sprint_30m', 'lower_body_plyometrics', 's', 'lte', [4.6, 4.2, 3.9]),
    ...ladder('sprint_10m_flying', 'lower_body_plyometrics', 's', 'lte', [1.25, 1.1, 1.0]),
    ...ladder('agility_505', 'lower_body_plyometrics', 's', 'lte', [2.6, 2.4, 2.2]),
];

export type AchievementLadder = {
    assessmentSlug: string;
    category: CategorySlug;
    defs: AchievementDef[];
};

/** Ladders applicable to a gender, in catalog order, grouped per assessment. */
export function laddersForGender(gender: 'male' | 'female'): AchievementLadder[] {
    const ladders: AchievementLadder[] = [];
    for (const def of ACHIEVEMENTS) {
        if (def.gender && def.gender !== gender) continue;
        const existing = ladders.find(l => l.assessmentSlug === def.assessmentSlug);
        if (existing) existing.defs.push(def);
        else ladders.push({ assessmentSlug: def.assessmentSlug, category: def.category, defs: [def] });
    }
    return ladders;
}
```

- [ ] **Step 4: Write the unlock logic**

Create `lib/achievements.ts`:

```ts
import { ACHIEVEMENTS, AchievementDef } from '@/constants/achievements';

export type UnlockInput = {
    assessmentSlug: string;
    value: number;
    gender: 'male' | 'female';
    alreadyUnlocked: Set<string>;
};

export function meetsThreshold(def: AchievementDef, value: number): boolean {
    return def.direction === 'gte' ? value >= def.threshold : value <= def.threshold;
}

/** Pure award check: which catalog entries does this result newly unlock? */
export function computeNewUnlocks({ assessmentSlug, value, gender, alreadyUnlocked }: UnlockInput): AchievementDef[] {
    return ACHIEVEMENTS.filter(def =>
        def.assessmentSlug === assessmentSlug
        && (!def.gender || def.gender === gender)
        && !alreadyUnlocked.has(def.slug)
        && meetsThreshold(def, value),
    );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest lib/__tests__/achievements.test.ts`
Expected: PASS. If the "scoreable" test fails, an `assessmentSlug` in the catalog is misspelled — fix the catalog, not the test (valid slugs are the keys of `ASSESSMENT_SCORE_MAP` in `lib/score-calculators/assessment-score.ts:20-59`).

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit` — expected: no errors.

```bash
git add constants/achievements.ts lib/achievements.ts lib/__tests__/achievements.test.ts
git commit -m "feat: add achievement catalog and pure unlock computation"
```

---

### Task 3: `user_achievements` migration + type regeneration

**Files:**
- Create: `supabase/migrations/20260812100000_create_user_achievements.sql`
- Modify: `database.types.ts` (regenerated, not hand-edited)

**Interfaces:**
- Consumes: existing `user_profiles` table.
- Produces: `user_achievements` table with columns `id`, `user_id`, `achievement_slug`, `unlocked_at`, `value`; unique on `(user_id, achievement_slug)`. Supabase client typings for it in `database.types.ts`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260812100000_create_user_achievements.sql`:

```sql
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    achievement_slug TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    value NUMERIC,
    UNIQUE (user_id, achievement_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id
    ON user_achievements (user_id);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Unlocks are immutable: SELECT + INSERT only, no UPDATE/DELETE policies.
CREATE POLICY "Users can read their own achievements"
    ON user_achievements
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
    ON user_achievements
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Apply to the LOCAL dev DB**

Run: `npx supabase migration up`
Expected: migration `20260812100000` applied without error. (Local only — never push to production.)

- [ ] **Step 3: Verify table + policies exist**

Run: `npx supabase db diff --schema public | head -5` (expected: no diff for this table) or, simpler:
`psql "$(npx supabase status --output json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).DB_URL||JSON.parse(s).db_url))')" -c "\d user_achievements"`
If the psql one-liner is awkward in this environment, `npx supabase migration list` showing the migration as applied locally is sufficient.

- [ ] **Step 4: Regenerate database types**

Run: `npx supabase gen types typescript --local > database.types.ts`
Then: `npx tsc --noEmit` — expected: no errors, and `database.types.ts` now contains `user_achievements` Row/Insert types.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260812100000_create_user_achievements.sql database.types.ts
git commit -m "feat: add user_achievements table with RLS"
```

---

### Task 4: Data layer — achievements query + best-values query

**Files:**
- Modify: `queries/query-keys.ts`
- Create: `queries/use-user-achievements-query.ts`
- Create: `queries/use-assessment-best-values-query.ts`

**Interfaces:**
- Consumes: `supabase` client from `@/services/supabase/client`, `queryKeys`.
- Produces:
  - `queryKeys.userAchievements(userId)` → `['user-achievements', userId]`, `queryKeys.assessmentBestValues(userId)` → `['assessment-best-values', userId]`
  - `useUserAchievementsQuery(userId: string | undefined)` → `UserAchievementRow[]` where `UserAchievementRow = { achievement_slug: string; unlocked_at: string; value: number | null }`
  - `useAssessmentBestValuesQuery(userId: string | undefined)` → `BestValues = Record<string, { max: number; min: number }>` keyed by assessment slug.

- [ ] **Step 1: Add query keys**

In `queries/query-keys.ts`, add inside the `queryKeys` object (after `userCategoryHistory`):

```ts
    userAchievements: (userId: string | undefined) => ['user-achievements', userId] as const,
    assessmentBestValues: (userId: string | undefined) => ['assessment-best-values', userId] as const,
```

- [ ] **Step 2: Write the achievements query hook**

Create `queries/use-user-achievements-query.ts`:

```ts
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

export type UserAchievementRow = {
    achievement_slug: string;
    unlocked_at: string;
    value: number | null;
};

async function fetchUserAchievements(userId: string): Promise<UserAchievementRow[]> {
    const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_slug, unlocked_at, value')
        .eq('user_id', userId);
    if (error) throw error;
    return data ?? [];
}

export function useUserAchievementsQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.userAchievements(userId),
        queryFn: () => fetchUserAchievements(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
```

- [ ] **Step 3: Write the best-values query hook**

Create `queries/use-assessment-best-values-query.ts`:

```ts
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/** Best (max and min) raw metric value per assessment slug, from all assessment entries. */
export type BestValues = Record<string, { max: number; min: number }>;

async function fetchBestValues(userId: string): Promise<BestValues> {
    const { data, error } = await supabase
        .from('metric_entries')
        .select(`
            value,
            user_assessment:user_assessments!inner (
                assessment:assessments!inner ( slug )
            )
        `)
        .eq('user_id', userId)
        .eq('source_type', 'assessment');
    if (error) throw error;

    const result: BestValues = {};
    for (const row of data ?? []) {
        const slug = (row.user_assessment as any)?.assessment?.slug as string | undefined;
        if (!slug || row.value == null) continue;
        const v = Number(row.value);
        const cur = result[slug];
        result[slug] = cur
            ? { max: Math.max(cur.max, v), min: Math.min(cur.min, v) }
            : { max: v, min: v };
    }
    return result;
}

export function useAssessmentBestValuesQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.assessmentBestValues(userId),
        queryFn: () => fetchBestValues(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
```

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit` — expected: no errors.

```bash
git add queries/query-keys.ts queries/use-user-achievements-query.ts queries/use-assessment-best-values-query.ts
git commit -m "feat: add achievements and best-values query hooks"
```

---

### Task 5: Award flow in `use-complete-assessment`

**Files:**
- Modify: `mutations/use-complete-assessment.ts`

**Interfaces:**
- Consumes: `computeNewUnlocks` from `@/lib/achievements`, `AchievementDef` from `@/constants/achievements`, `queryKeys.userAchievements` / `queryKeys.assessmentBestValues` (Task 4).
- Produces: the mutation's `mutationFn` now RETURNS `{ newUnlocks: AchievementDef[] }` (previously `void`). Task 9 consumes this in `app/assessment/[id].tsx` `onSuccess(data)`.

- [ ] **Step 1: Add imports and awarding logic**

In `mutations/use-complete-assessment.ts`:

Add imports at the top:

```ts
import { AchievementDef } from '@/constants/achievements';
import { computeNewUnlocks } from '@/lib/achievements';
```

Change the `completeAssessment` signature to declare the return type, and add step 4 before the function's end (after the `user_assessments` update block at line 89–93), then return:

```ts
async function completeAssessment({
    userAssessmentId, assessmentId, userId, metricId, value,
    assessmentSlug, categoryId, userProfile,
}: CompleteAssessmentParams): Promise<{ newUnlocks: AchievementDef[] }> {
```

```ts
    // 4. Award achievements (non-fatal — never block completion on gamification)
    let newUnlocks: AchievementDef[] = [];
    try {
        const { data: existing, error: existingError } = await supabase
            .from('user_achievements')
            .select('achievement_slug')
            .eq('user_id', userId);
        if (existingError) throw existingError;

        newUnlocks = computeNewUnlocks({
            assessmentSlug,
            value,
            gender: userProfile.gender,
            alreadyUnlocked: new Set((existing ?? []).map(r => r.achievement_slug)),
        });

        if (newUnlocks.length > 0) {
            const { error: unlockError } = await supabase
                .from('user_achievements')
                .upsert(
                    newUnlocks.map(def => ({ user_id: userId, achievement_slug: def.slug, value })),
                    { onConflict: 'user_id,achievement_slug', ignoreDuplicates: true },
                );
            if (unlockError) throw unlockError;
        }
    } catch (e) {
        console.warn('[achievements] award check failed', e);
        newUnlocks = [];
    }

    return { newUnlocks };
```

- [ ] **Step 2: Invalidate the new queries on success**

In `useCompleteAssessment`'s `onSuccess`, extend the `Promise.all` array (lines 101–106) with:

```ts
                qc.invalidateQueries({ queryKey: queryKeys.userAchievements(userId) }),
                qc.invalidateQueries({ queryKey: queryKeys.assessmentBestValues(userId) }),
```

- [ ] **Step 3: Verify unit tests still pass and typecheck**

Run: `npx jest lib/__tests__/achievements.test.ts constants/__tests__/tiers.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: no errors (the existing `onSuccess` in `app/assessment/[id].tsx` ignores the new return value — that is fine until Task 9).

- [ ] **Step 4: Commit**

```bash
git add mutations/use-complete-assessment.ts
git commit -m "feat: award achievements on assessment completion"
```

---

### Task 6: Backfill for existing users

**Files:**
- Create: `lib/achievements-backfill.ts`
- Create: `hooks/use-achievements-backfill.ts`

**Interfaces:**
- Consumes: `computeNewUnlocks` (Task 2), `useUserAchievementsQuery` + `queryKeys` (Task 4), `useCurrentUser` from `@/providers/current-user-provider`.
- Produces: `backfillAchievements(userId: string, gender: 'male' | 'female'): Promise<number>` (count of inserted unlocks) and `useAchievementsBackfill(): void` — a fire-and-forget hook that Tasks 7/8 mount on the profile and achievements screens.

- [ ] **Step 1: Write the backfill function**

Create `lib/achievements-backfill.ts`:

```ts
import { computeNewUnlocks } from '@/lib/achievements';
import { supabase } from '@/services/supabase/client';

/**
 * Grants historical unlocks from existing metric entries. Chronological replay:
 * entries are walked oldest-first so each unlock keeps the timestamp of the
 * result that actually earned it. Idempotent via the (user_id, achievement_slug)
 * unique constraint + ignoreDuplicates.
 * Returns the number of inserted unlock rows.
 */
export async function backfillAchievements(userId: string, gender: 'male' | 'female'): Promise<number> {
    const { data, error } = await supabase
        .from('metric_entries')
        .select(`
            value,
            created_at,
            user_assessment:user_assessments!inner (
                assessment:assessments!inner ( slug )
            )
        `)
        .eq('user_id', userId)
        .eq('source_type', 'assessment');
    if (error) throw error;

    const entries = (data ?? [])
        .map(row => ({
            slug: (row.user_assessment as any)?.assessment?.slug as string | undefined,
            value: row.value == null ? null : Number(row.value),
            createdAt: row.created_at as string,
        }))
        .filter((e): e is { slug: string; value: number; createdAt: string } => !!e.slug && e.value !== null)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const unlocked = new Set<string>();
    const rows: { user_id: string; achievement_slug: string; value: number; unlocked_at: string }[] = [];
    for (const entry of entries) {
        const defs = computeNewUnlocks({
            assessmentSlug: entry.slug,
            value: entry.value,
            gender,
            alreadyUnlocked: unlocked,
        });
        for (const def of defs) {
            unlocked.add(def.slug);
            rows.push({
                user_id: userId,
                achievement_slug: def.slug,
                value: entry.value,
                unlocked_at: entry.createdAt,
            });
        }
    }

    if (rows.length === 0) return 0;

    const { error: insertError } = await supabase
        .from('user_achievements')
        .upsert(rows, { onConflict: 'user_id,achievement_slug', ignoreDuplicates: true });
    if (insertError) throw insertError;

    return rows.length;
}
```

- [ ] **Step 2: Write the trigger hook**

Create `hooks/use-achievements-backfill.ts`:

```ts
import { backfillAchievements } from '@/lib/achievements-backfill';
import { useCurrentUser } from '@/providers/current-user-provider';
import { queryKeys } from '@/queries/query-keys';
import { useUserAchievementsQuery } from '@/queries/use-user-achievements-query';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Once per app session per user — the backfill itself is idempotent, this just avoids noise.
const attempted = new Set<string>();

/** Silently grants historical unlocks when a user has results but no achievement rows yet. */
export function useAchievementsBackfill() {
    const { profile } = useCurrentUser();
    const qc = useQueryClient();
    const achievements = useUserAchievementsQuery(profile?.id);

    useEffect(() => {
        const userId = profile?.id;
        if (!userId || !achievements.isSuccess) return;
        if (achievements.data.length > 0 || attempted.has(userId)) return;
        attempted.add(userId);
        const gender = profile?.gender === 'female' ? 'female' : 'male';
        backfillAchievements(userId, gender)
            .then(count => {
                if (count > 0) qc.invalidateQueries({ queryKey: queryKeys.userAchievements(userId) });
            })
            .catch(err => console.warn('[achievements] backfill failed', err));
    }, [profile?.id, profile?.gender, achievements.isSuccess, achievements.data, qc]);
}
```

Note the gender mapping: `'other'`/null → `'male'`, mirroring how the assessment flow narrows gender for the score calculators (`app/assessment/[id].tsx:242`).

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit` — expected: no errors.

```bash
git add lib/achievements-backfill.ts hooks/use-achievements-backfill.ts
git commit -m "feat: add achievements backfill for existing users"
```

---

### Task 7: Overall-score hook + profile title chip + progress hero tier subline

**Files:**
- Create: `hooks/use-overall-score.ts`
- Create: `components/profile/title-chip.tsx`
- Modify: `app/(tabs)/profile.tsx` (hero section, around line 204 after the sport tag)
- Modify: `app/(tabs)/progress.tsx` (replace `overallScore` memo at lines 83–88; pass tier to hero card)
- Modify: `components/progress/progress-hero-card.tsx` (new optional `tier` prop)
- Modify: `i18n/locales/en.ts`, `i18n/locales/de.ts`

**Interfaces:**
- Consumes: `tierForScore`, `Tier` (Task 1), `useUserCategoryLevelsQuery`, `ALL_STAT_SLUGS` from `@/constants/progress-constants`, `useAchievementsBackfill` (Task 6).
- Produces: `useOverallScore(userId: string | undefined): number | null`; `TitleChip` component with props `{ score: number | null; onPress: () => void }`; `ProgressHeroCard` accepts optional `tier?: { label: string; color: string } | null`.

- [ ] **Step 1: Write the overall-score hook**

Create `hooks/use-overall-score.ts`:

```ts
import { ALL_STAT_SLUGS } from '@/constants/progress-constants';
import { useUserCategoryLevelsQuery } from '@/queries/use-user-category-levels-query';
import { useMemo } from 'react';

/** Overall level: rounded average of the per-category levels (same math as the progress tab). */
export function useOverallScore(userId: string | undefined): number | null {
    const { data: categoryLevels } = useUserCategoryLevelsQuery(userId);
    return useMemo(() => {
        if (!categoryLevels) return null;
        const scores = ALL_STAT_SLUGS.map(s => categoryLevels[s]).filter((v): v is number => v !== undefined);
        if (!scores.length) return null;
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }, [categoryLevels]);
}
```

- [ ] **Step 2: Refactor `progress.tsx` to use the hook**

In `app/(tabs)/progress.tsx`: delete the `overallScore` `useMemo` (lines 83–88) and replace with `const overallScore = useOverallScore(profile?.id);` — check how the file currently obtains the user id (it already calls `useUserCategoryLevelsQuery` with one; use the same variable) and add the import. The existing `categoryLevels` query usage stays for the per-category values.

- [ ] **Step 3: Add the tier subline to the hero card**

In `components/progress/progress-hero-card.tsx`:

Add to `ProgressHeroCardProps`:

```ts
    tier?: { label: string; color: string } | null; // overall tier subline, e.g. "Apex"
```

In the JSX, inside the `scoreRow` view, directly after the score `JempText` (line 50) and before the trend pill:

```tsx
                    {tier && (
                        <JempText type="body-sm" color={tier.color} style={styles.tierLabel}>
                            {tier.label.toUpperCase()}
                        </JempText>
                    )}
```

Add to styles: `tierLabel: { letterSpacing: 1, fontWeight: '700' },`
Destructure `tier` in the component's props.

In `app/(tabs)/progress.tsx`, where `<ProgressHeroCard` is rendered, pass:

```tsx
                    tier={selectedCategory === 'all' && heroScore !== null
                        ? { label: t(tierForScore(heroScore).i18nKey), color: tierForScore(heroScore).color }
                        : null}
```

with import `import { tierForScore } from '@/constants/tiers';`.

- [ ] **Step 4: Build the title chip**

Create `components/profile/title-chip.tsx`:

```tsx
import { JempText } from '@/components/jemp-text';
import { Colors } from '@/constants/theme';
import { tierForScore } from '@/constants/tiers';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type TitleChipProps = {
    score: number | null;   // overall 1-100 level, null = no completed assessments
    onPress: () => void;
};

/** Glass pill showing the user's tier title; empty state prompts to earn one. */
export function TitleChip({ score, onPress }: TitleChipProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const tier = score !== null ? tierForScore(score) : null;
    const color = tier?.color ?? theme.textMuted;

    return (
        <Pressable onPress={onPress} hitSlop={8}>
            <View style={[styles.chip, { borderColor: color, backgroundColor: theme.surface }]}>
                <Ionicons
                    name={tier?.slug === 'apex' ? 'trophy' : 'ribbon'}
                    size={13}
                    color={color}
                />
                <JempText type="caption" color={color} style={styles.text}>
                    {(tier ? t(tier.i18nKey) : t('achievements.earn_title')).toUpperCase()}
                </JempText>
                {score !== null && (
                    <JempText type="caption" color={theme.textMuted} style={styles.score}>
                        {score}
                    </JempText>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1.5,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 5,
    },
    text: { letterSpacing: 1.5, fontSize: 11, fontWeight: '700' },
    score: { fontSize: 11, fontWeight: '600' },
});
```

- [ ] **Step 5: Mount chip + backfill in the profile screen**

In `app/(tabs)/profile.tsx`:

Imports:

```ts
import { TitleChip } from '@/components/profile/title-chip';
import { useAchievementsBackfill } from '@/hooks/use-achievements-backfill';
import { useOverallScore } from '@/hooks/use-overall-score';
```

Inside `ProfileScreen`, after the `useCurrentUser()` line:

```ts
    const overallScore = useOverallScore(profile?.id);
    useAchievementsBackfill();
```

In the hero JSX, directly AFTER the sport-tag `LinearGradient` block (after line 204):

```tsx
                    <TitleChip
                        score={overallScore}
                        onPress={() => router.push(overallScore !== null ? '/achievements' : '/(tabs)/assessments')}
                    />
```

(The `/achievements` route is created in Task 8; expo-router typed routes may flag the string until then — if `npx tsc --noEmit` complains about the route string, defer the typecheck gate of this step to Task 8, but everything else must compile.)

- [ ] **Step 6: Add i18n keys**

Add to `i18n/locales/en.ts`:

```ts
    'achievements.earn_title': 'Earn your title',
```

Add to `i18n/locales/de.ts`:

```ts
    'achievements.earn_title': 'Verdiene deinen Titel',
```

- [ ] **Step 7: Typecheck and commit**

Run: `npx tsc --noEmit` — expected: no errors (modulo the route-string caveat in Step 5).

```bash
git add hooks/use-overall-score.ts components/profile/title-chip.tsx app/\(tabs\)/profile.tsx app/\(tabs\)/progress.tsx components/progress/progress-hero-card.tsx i18n/locales/en.ts i18n/locales/de.ts
git commit -m "feat: show tier title in profile and progress hero"
```

---

### Task 8: Achievements screen + route + settings row

**Files:**
- Create: `app/achievements.tsx`
- Modify: `app/_layout.tsx` (register route, next to `assessment/[id]` at line 161)
- Modify: `app/(tabs)/profile.tsx` (settings row in the Profile group, after the language row at line 286)
- Modify: `i18n/locales/en.ts`, `i18n/locales/de.ts`

**Interfaces:**
- Consumes: `laddersForGender`, `AchievementDef` (Task 2), `meetsThreshold` (Task 2), `tierForScore`, `nextTier` (Task 1), `useUserAchievementsQuery`, `useAssessmentBestValuesQuery` (Task 4), `useOverallScore` (Task 7), `useAchievementsBackfill` (Task 6), `displayMetricValue`, `UnitSystem` from `@/helpers/units`, `getCategoryMeta` from `@/constants/categories` — check its return shape for the label (it returns `CategoryMeta`; use the i18n label pattern the progress tab uses via `STAT_LABELS`/`getCategoryLabelShort` if `CategoryMeta` has no direct label; fall back to `t('achievements.category_' + slug)` keys defined below).
- Produces: pushed route `/achievements`.

- [ ] **Step 1: Register the route**

In `app/_layout.tsx`, after the `assessment/[id]` screen (line 161), add:

```tsx
        <Stack.Screen name="achievements" options={{ animation: 'slide_from_right', headerShown: false }} />
```

- [ ] **Step 2: Add i18n keys**

`i18n/locales/en.ts`:

```ts
    'achievements.screen_title': 'Achievements',
    'achievements.unlocked_count': '{{count}} / {{total}} unlocked',
    'achievements.points_to_next': '{{points}} points to {{tier}}',
    'achievements.top_tier_reached': 'Top tier reached',
    'achievements.next_up': 'Next up: {{amount}} to go',
    'achievements.unlocked_on': 'Unlocked {{date}}',
    'achievements.empty_hint': 'Complete assessments to start unlocking achievements.',
    'achievements.category_strength': 'Strength',
    'achievements.category_jumps': 'Jumps',
    'achievements.category_upper_body_plyometrics': 'Explosive Power',
    'achievements.category_lower_body_plyometrics': 'Speed & Agility',
    'achievements.exercise.bench_press_1rm': 'Bench Press',
    'achievements.exercise.back_squat_1rm': 'Back Squat',
    'achievements.exercise.romanian_deadlift_1rm': 'Romanian Deadlift',
    'achievements.exercise.hip_thrust_1rm': 'Hip Thrust',
    'achievements.exercise.weighted_pullups_1rm': 'Weighted Pull-ups',
    'achievements.exercise.max_pullups': 'Pull-ups',
    'achievements.exercise.max_pushups': 'Push-ups',
    'achievements.exercise.max_dips': 'Dips',
    'achievements.exercise.vertical_jump': 'Vertical Jump',
    'achievements.exercise.broad_jump': 'Broad Jump',
    'achievements.exercise.box_jump': 'Box Jump',
    'achievements.exercise.mb_chest_throw': 'MB Chest Throw',
    'achievements.exercise.mb_overhead_throw': 'MB Overhead Throw',
    'achievements.exercise.mb_rotational_throw': 'MB Rotational Throw',
    'achievements.exercise.clap_pushups': 'Clap Push-ups',
    'achievements.exercise.sprint_10m': '10m Sprint',
    'achievements.exercise.sprint_30m': '30m Sprint',
    'achievements.exercise.sprint_10m_flying': 'Flying 10m Sprint',
    'achievements.exercise.agility_505': '5-0-5 Agility',
```

`i18n/locales/de.ts`:

```ts
    'achievements.screen_title': 'Achievements',
    'achievements.unlocked_count': '{{count}} / {{total}} freigeschaltet',
    'achievements.points_to_next': 'Noch {{points}} Punkte bis {{tier}}',
    'achievements.top_tier_reached': 'Höchste Stufe erreicht',
    'achievements.next_up': 'Als Nächstes: noch {{amount}}',
    'achievements.unlocked_on': 'Freigeschaltet am {{date}}',
    'achievements.empty_hint': 'Schließe Assessments ab, um Achievements freizuschalten.',
    'achievements.category_strength': 'Kraft',
    'achievements.category_jumps': 'Sprünge',
    'achievements.category_upper_body_plyometrics': 'Explosivkraft',
    'achievements.category_lower_body_plyometrics': 'Speed & Agilität',
    'achievements.exercise.bench_press_1rm': 'Bankdrücken',
    'achievements.exercise.back_squat_1rm': 'Kniebeuge',
    'achievements.exercise.romanian_deadlift_1rm': 'Rumänisches Kreuzheben',
    'achievements.exercise.hip_thrust_1rm': 'Hip Thrust',
    'achievements.exercise.weighted_pullups_1rm': 'Klimmzüge mit Gewicht',
    'achievements.exercise.max_pullups': 'Klimmzüge',
    'achievements.exercise.max_pushups': 'Liegestütze',
    'achievements.exercise.max_dips': 'Dips',
    'achievements.exercise.vertical_jump': 'Vertikalsprung',
    'achievements.exercise.broad_jump': 'Standweitsprung',
    'achievements.exercise.box_jump': 'Box Jump',
    'achievements.exercise.mb_chest_throw': 'MB Brustwurf',
    'achievements.exercise.mb_overhead_throw': 'MB Überkopfwurf',
    'achievements.exercise.mb_rotational_throw': 'MB Rotationswurf',
    'achievements.exercise.clap_pushups': 'Clap Push-ups',
    'achievements.exercise.sprint_10m': '10m Sprint',
    'achievements.exercise.sprint_30m': '30m Sprint',
    'achievements.exercise.sprint_10m_flying': 'Fliegender 10m Sprint',
    'achievements.exercise.agility_505': '5-0-5 Agility',
```

- [ ] **Step 3: Build the screen**

Create `app/achievements.tsx`. Full component:

```tsx
import { JempText } from '@/components/jemp-text';
import { AchievementDef, laddersForGender } from '@/constants/achievements';
import { Colors } from '@/constants/theme';
import { nextTier, tierForScore } from '@/constants/tiers';
import { displayMetricValue, UnitSystem } from '@/helpers/units';
import { useAchievementsBackfill } from '@/hooks/use-achievements-backfill';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOverallScore } from '@/hooks/use-overall-score';
import { meetsThreshold } from '@/lib/achievements';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useAssessmentBestValuesQuery } from '@/queries/use-assessment-best-values-query';
import { useUserAchievementsQuery } from '@/queries/use-user-achievements-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORY_ORDER = ['strength', 'jumps', 'upper_body_plyometrics', 'lower_body_plyometrics'] as const;

function formatThreshold(def: AchievementDef, unitSystem: UnitSystem): string {
    const { value, unit } = displayMetricValue(def.threshold, def.unit === 'count' ? 'count' : def.unit, unitSystem);
    const prefix = def.assessmentSlug === 'weighted_pullups_1rm' ? '+' : '';
    if (def.unit === 'count') return `${prefix}${value}×`;
    if (def.unit === 's') return `${prefix}${value}s`;
    return `${prefix}${value} ${unit}`;
}

export default function AchievementsScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    useAchievementsBackfill();
    const overallScore = useOverallScore(profile?.id);
    const achievementsQuery = useUserAchievementsQuery(profile?.id);
    const bestValuesQuery = useAssessmentBestValuesQuery(profile?.id);

    const unitSystem: UnitSystem = profile?.unit_system === 'imperial' ? 'imperial' : 'metric';
    const gender = profile?.gender === 'female' ? 'female' as const : 'male' as const;

    const unlockedBySlug = useMemo(() => {
        const map = new Map<string, { unlocked_at: string; value: number | null }>();
        for (const row of achievementsQuery.data ?? []) {
            map.set(row.achievement_slug, { unlocked_at: row.unlocked_at, value: row.value });
        }
        return map;
    }, [achievementsQuery.data]);

    const ladders = useMemo(() => laddersForGender(gender), [gender]);
    const totalCount = useMemo(() => ladders.reduce((sum, l) => sum + l.defs.length, 0), [ladders]);
    const unlockedCount = useMemo(
        () => ladders.reduce((sum, l) => sum + l.defs.filter(d => unlockedBySlug.has(d.slug)).length, 0),
        [ladders, unlockedBySlug],
    );

    const tier = overallScore !== null ? tierForScore(overallScore) : null;
    const upcoming = overallScore !== null ? nextTier(overallScore) : null;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="arrow-back" size={26} color={theme.text} />
                </Pressable>
                <JempText type="h1" style={styles.headerTitle}>{t('achievements.screen_title')}</JempText>
                <View style={{ width: 26 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* ── Title hero ── */}
                <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: tier?.color ?? theme.borderStrong }]}>
                    <Ionicons name="trophy" size={28} color={tier?.color ?? theme.textMuted} />
                    <JempText type="h1" color={tier?.color ?? theme.textMuted} style={styles.heroTier}>
                        {tier ? t(tier.i18nKey).toUpperCase() : '—'}
                    </JempText>
                    {overallScore !== null ? (
                        <JempText type="body-sm" color={theme.textMuted}>
                            {upcoming
                                ? t('achievements.points_to_next', { points: upcoming.min - overallScore, tier: t(upcoming.i18nKey) })
                                : t('achievements.top_tier_reached')}
                        </JempText>
                    ) : (
                        <JempText type="body-sm" color={theme.textMuted}>{t('achievements.empty_hint')}</JempText>
                    )}
                    <JempText type="caption" color={theme.textSubtle}>
                        {t('achievements.unlocked_count', { count: unlockedCount, total: totalCount })}
                    </JempText>
                </View>

                {/* ── Ladders by category ── */}
                {CATEGORY_ORDER.map(cat => {
                    const catLadders = ladders.filter(l => l.category === cat);
                    if (!catLadders.length) return null;
                    return (
                        <View key={cat} style={styles.section}>
                            <JempText type="caption" color={theme.textMuted} style={styles.sectionLabel}>
                                {t(`achievements.category_${cat}`).toUpperCase()}
                            </JempText>
                            {catLadders.map(ladder => {
                                const best = bestValuesQuery.data?.[ladder.assessmentSlug];
                                const bestValue = best
                                    ? (ladder.defs[0].direction === 'gte' ? best.max : best.min)
                                    : null;
                                const next = ladder.defs.find(d => !unlockedBySlug.has(d.slug));
                                const gap = next && bestValue !== null && !meetsThreshold(next, bestValue)
                                    ? Math.abs(next.direction === 'gte' ? next.threshold - bestValue : bestValue - next.threshold)
                                    : null;
                                return (
                                    <View key={ladder.assessmentSlug} style={[styles.ladderCard, { backgroundColor: theme.surface }]}>
                                        <JempText type="body-l" style={styles.ladderTitle}>
                                            {t(`achievements.exercise.${ladder.assessmentSlug}`)}
                                        </JempText>
                                        <View style={styles.rungRow}>
                                            {ladder.defs.map(def => {
                                                const unlock = unlockedBySlug.get(def.slug);
                                                return (
                                                    <View
                                                        key={def.slug}
                                                        style={[
                                                            styles.rung,
                                                            unlock
                                                                ? { borderColor: '#FFD700', backgroundColor: 'rgba(255, 215, 0, 0.12)' }
                                                                : { borderColor: theme.borderStrong },
                                                        ]}
                                                    >
                                                        <Ionicons
                                                            name={unlock ? 'trophy' : 'lock-closed-outline'}
                                                            size={12}
                                                            color={unlock ? '#FFD700' : theme.textSubtle}
                                                        />
                                                        <JempText type="caption" color={unlock ? theme.text : theme.textSubtle}>
                                                            {formatThreshold(def, unitSystem)}
                                                        </JempText>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                        {gap !== null && next && (
                                            <JempText type="caption" color={theme.textMuted} style={styles.nextUp}>
                                                {t('achievements.next_up', {
                                                    amount: formatThreshold({ ...next, threshold: Math.round(gap * 100) / 100 }, unitSystem),
                                                })}
                                            </JempText>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: { fontSize: 22 },
    content: { paddingHorizontal: 20, paddingBottom: 40, gap: 24 },
    heroCard: {
        alignItems: 'center',
        gap: 6,
        borderWidth: 1.5,
        borderRadius: 20,
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    heroTier: { letterSpacing: 2 },
    section: { gap: 10 },
    sectionLabel: { letterSpacing: 1 },
    ladderCard: { borderRadius: 16, padding: 14, gap: 10 },
    ladderTitle: { fontWeight: '600' },
    rungRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    rung: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 100,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    nextUp: { fontStyle: 'italic' },
});
```

Implementation notes for this step:
- Verify `displayMetricValue`'s unit passthrough: it only converts `kg` and `cm` (`helpers/units.ts:68-77`); `'s'`/`'count'` pass through — the `formatThreshold` above relies on that.
- `theme.borderStrong`, `theme.surface`, `theme.textSubtle`, `theme.textMuted` all exist (used in `category-level-step.tsx` and `profile.tsx`); if a name differs, mirror what `profile.tsx` uses.
- The `next_up` gap for `lte` ladders reads e.g. "0.2s to go" — the direction-agnostic `Math.abs` handles both.

- [ ] **Step 4: Add the settings row**

In `app/(tabs)/profile.tsx`, inside the Profile `SettingsGroup` after the language `SettingsRow` (line 286), add:

```tsx
                        <SettingsRow
                            icon={<Ionicons name="trophy-outline" size={20} color={theme.textMuted} />}
                            label={t('achievements.screen_title')}
                            onPress={() => router.push('/achievements')}
                        />
```

- [ ] **Step 5: Typecheck, lint, run all tests**

Run: `npx tsc --noEmit` — expected: no errors (including the Task 7 route string, now that the route exists).
Run: `npx jest` — expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add app/achievements.tsx app/_layout.tsx app/\(tabs\)/profile.tsx i18n/locales/en.ts i18n/locales/de.ts
git commit -m "feat: add achievements screen with ladders and next-up hints"
```

---

### Task 9: Unlock celebration + assessment integration

**Files:**
- Create: `components/achievements/achievement-celebration.tsx`
- Modify: `app/assessment/[id].tsx` (both `onSuccess` callbacks at lines ~248-254 and ~279-286; render block near `SuccessOverlay` at line 689)
- Modify: `i18n/locales/en.ts`, `i18n/locales/de.ts`

**Interfaces:**
- Consumes: `AchievementDef` (Task 2), the `{ newUnlocks }` mutation result (Task 5), `Confetti` from `@/components/confetti` (existing, exported at `components/confetti.tsx:76`), Lottie asset `@/assets/animations/throphy.json` (existing; note the filename typo is real), `formatThreshold`-equivalent display via `displayMetricValue`.
- Produces: `AchievementCelebration` component with props `{ visible: boolean; unlocks: AchievementDef[]; onDone: () => void; onViewAll: () => void }`.

- [ ] **Step 1: Add i18n keys**

`i18n/locales/en.ts`:

```ts
    'achievements.celebration_title': 'Achievement unlocked!',
    'achievements.celebration_also': 'Also unlocked',
    'achievements.view_all': 'View all achievements',
    'achievements.continue': 'Continue',
```

`i18n/locales/de.ts`:

```ts
    'achievements.celebration_title': 'Achievement freigeschaltet!',
    'achievements.celebration_also': 'Ebenfalls freigeschaltet',
    'achievements.view_all': 'Alle Achievements ansehen',
    'achievements.continue': 'Weiter',
```

- [ ] **Step 2: Build the celebration component**

Create `components/achievements/achievement-celebration.tsx`:

```tsx
import { Confetti } from '@/components/confetti';
import { JempText } from '@/components/jemp-text';
import { AchievementDef } from '@/constants/achievements';
import { Colors, GRADIENT } from '@/constants/theme';
import { displayMetricValue, UnitSystem } from '@/helpers/units';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

type AchievementCelebrationProps = {
    visible: boolean;
    unlocks: AchievementDef[];
    unitSystem: UnitSystem;
    onDone: () => void;     // dismiss (assessment screen navigates back)
    onViewAll: () => void;  // dismiss + open the achievements screen
};

function formatThreshold(def: AchievementDef, unitSystem: UnitSystem): string {
    const { value, unit } = displayMetricValue(def.threshold, def.unit === 'count' ? 'count' : def.unit, unitSystem);
    const prefix = def.assessmentSlug === 'weighted_pullups_1rm' ? '+' : '';
    if (def.unit === 'count') return `${prefix}${value}×`;
    if (def.unit === 's') return `${prefix}${value}s`;
    return `${prefix}${value} ${unit}`;
}

/** One sheet per completion: the highest new rung per ladder is celebrated big, the rest listed small. */
export function AchievementCelebration({ visible, unlocks, unitSystem, onDone, onViewAll }: AchievementCelebrationProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];

    // Highest rung per assessment ladder (catalog order is ascending within a ladder,
    // so the last unlock per assessmentSlug is the highest one).
    const { headline, rest } = useMemo(() => {
        const bySlug = new Map<string, AchievementDef>();
        for (const def of unlocks) bySlug.set(def.assessmentSlug, def);
        const headliners = [...bySlug.values()];
        const headlineSlugs = new Set(headliners.map(d => d.slug));
        return {
            headline: headliners,
            rest: unlocks.filter(d => !headlineSlugs.has(d.slug)),
        };
    }, [unlocks]);

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible>
            <View style={styles.backdrop}>
                <Confetti />
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <LottieView
                        autoPlay
                        loop={false}
                        source={require('@/assets/animations/throphy.json')}
                        style={styles.trophy}
                    />
                    <JempText type="h1" style={styles.title}>{t('achievements.celebration_title')}</JempText>

                    {headline.map(def => (
                        <View key={def.slug} style={[styles.badge, { borderColor: '#FFD700' }]}>
                            <JempText type="h2" color="#FFD700">
                                {formatThreshold(def, unitSystem)} {t(`achievements.exercise.${def.assessmentSlug}`)}
                            </JempText>
                        </View>
                    ))}

                    {rest.length > 0 && (
                        <JempText type="caption" color={theme.textMuted} style={styles.also}>
                            {t('achievements.celebration_also')}: {rest.map(d => formatThreshold(d, unitSystem)).join(' · ')}
                        </JempText>
                    )}

                    <Pressable onPress={onViewAll} style={styles.viewAll}>
                        <JempText type="body-sm" color={theme.textMuted}>{t('achievements.view_all')}</JempText>
                    </Pressable>

                    <Pressable onPress={onDone} style={styles.continueBtn}>
                        <LinearGradient
                            colors={GRADIENT}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.continueGradient}
                        >
                            <JempText type="button" color="#fff">{t('achievements.continue')}</JempText>
                        </LinearGradient>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
    },
    card: {
        width: '100%',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        gap: 14,
    },
    trophy: { width: 110, height: 110 },
    title: { textAlign: 'center' },
    badge: {
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    also: { textAlign: 'center' },
    viewAll: { paddingVertical: 4 },
    continueBtn: { width: '100%', borderRadius: 100, overflow: 'hidden', marginTop: 4 },
    continueGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 3: Integrate into the assessment screen**

In `app/assessment/[id].tsx`:

Imports:

```ts
import { AchievementCelebration } from '@/components/achievements/achievement-celebration';
import { AchievementDef } from '@/constants/achievements';
import { UnitSystem } from '@/helpers/units';
```

State (next to the existing `showSuccess` state):

```ts
    const [celebrationUnlocks, setCelebrationUnlocks] = useState<AchievementDef[] | null>(null);
```

Change BOTH `onSuccess` callbacks (rating-based ~line 248 and value-based ~line 279) from:

```ts
            onSuccess: () => {
                trackerManager.track('assessment_completed', { ... });
                setShowSuccess(true);
            },
```

to:

```ts
            onSuccess: (result) => {
                trackerManager.track('assessment_completed', {
                    assessment_slug: assessment.slug,
                    category_id: assessment.category_id,
                });
                if (result.newUnlocks.length > 0) setCelebrationUnlocks(result.newUnlocks);
                else setShowSuccess(true);
            },
```

(keep each callback's existing `track` payload unchanged).

Render, directly after the existing `<SuccessOverlay …/>` (line 689-695):

```tsx
            <AchievementCelebration
                visible={celebrationUnlocks !== null}
                unlocks={celebrationUnlocks ?? []}
                unitSystem={(profile?.unit_system === 'imperial' ? 'imperial' : 'metric') as UnitSystem}
                onDone={() => {
                    setCelebrationUnlocks(null);
                    router.back();
                }}
                onViewAll={() => {
                    setCelebrationUnlocks(null);
                    router.back();
                    router.push('/achievements');
                }}
            />
```

- [ ] **Step 4: Typecheck, lint, full test run**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npx expo lint` — expected: no new errors in touched files.
Run: `npx jest` — expected: all suites pass.

- [ ] **Step 5: Commit**

```bash
git add components/achievements/achievement-celebration.tsx app/assessment/\[id\].tsx i18n/locales/en.ts i18n/locales/de.ts
git commit -m "feat: celebrate new achievement unlocks after assessments"
```

---

### Task 10: End-to-end verification against the local dev DB

**Files:** none created — manual verification pass (use the `verify` skill if available).

- [ ] **Step 1: Start the app against the local Supabase** (`npx supabase status` must show it running; `yarn ios` or the project's usual dev flow).
- [ ] **Step 2: Verify the award flow** — complete a bench-press assessment with a value over a threshold (e.g. 100): celebration sheet appears, shows "100 kg Bench Press" plus lower rungs as "also unlocked"; `user_achievements` contains the rows; completing the SAME assessment again with the same value produces NO new celebration (falls back to the plain success overlay).
- [ ] **Step 3: Verify the achievements screen** — chip in profile opens it; unlocked rungs gold, locked rungs gray; "next up" gap correct for a `gte` ladder and an `lte` (sprint) ladder; imperial account shows converted values.
- [ ] **Step 4: Verify the backfill** — with a user that has historical `metric_entries` but no `user_achievements` rows: open the profile tab, wait for the query, confirm rows appear with `unlocked_at` matching the old entry dates and NO celebration fired.
- [ ] **Step 5: Verify titles** — profile chip shows the tier for the overall score; progress hero shows "· TIER" subline only on the overall view; onboarding level step still shows tier labels (now from `tiers.*` keys); a user with no completed assessments sees "Earn your title" linking to assessments.
- [ ] **Step 6: Report results** — list what was verified with actual observed behavior; any deviation goes back into the relevant task before merge.

---

## Self-Review Notes (already applied)

- Spec coverage: tiers (T1), catalog + gender ladders + units (T2), DB + RLS (T3), queries (T4), award flow (T5), backfill (T6), profile chip + progress subline + overall-score helper (T7), screen + entry points (T8), celebration (T9), manual verification (T10). Deferred spec items (relative milestones, per-category titles, social) intentionally have no tasks.
- Type consistency: `AchievementDef` shape identical in Tasks 2/5/9; `computeNewUnlocks` signature identical in Tasks 2/5/6; `queryKeys.userAchievements` / `assessmentBestValues` used consistently in Tasks 4/5/6.
- Known judgment calls an implementer may adjust with evidence: exact JempText `type` variants (`h2`, `body-sm`, `caption`) must match `components/jemp-text.tsx`'s accepted values; theme token names must match `constants/theme.ts`. Check both files when wiring UI, keep everything else as specified.
