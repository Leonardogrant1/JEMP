# Progress Screen — Category History Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Progress tab to a vertical list of category cards, each showing the current level score and a sparkline chart of historical level scores.

**Architecture:** New `user_category_level_history` table stores a snapshot each time a category level is updated. A new query fetches all-time history per category. A new `Sparkline` SVG component renders the trend line. The progress screen is rebuilt as a vertical list using this data.

**Tech Stack:** React Native, Supabase, TanStack Query, react-native-svg (already installed), TypeScript

---

### Task 1: Migration — create history table + RLS

**Files:**
- Create: `supabase/migrations/20260423130000_create_category_level_history.sql`

- [ ] **Step 1: Create the migration file**

```sql
CREATE TABLE IF NOT EXISTS user_category_level_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    level_score INTEGER NOT NULL CHECK (level_score BETWEEN 1 AND 100),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_level_history_user_id
    ON user_category_level_history (user_id, category_id, recorded_at);

ALTER TABLE user_category_level_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own history"
    ON user_category_level_history
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```

---

### Task 2: Add history query key + new query

**Files:**
- Modify: `queries/query-keys.ts`
- Create: `queries/use-user-category-history-query.ts`

- [ ] **Step 1: Add key to `queries/query-keys.ts`**

Add after `userCategoryLevels`:
```typescript
userCategoryHistory: (userId: string | undefined) => ['category-history', userId] as const,
```

- [ ] **Step 2: Create `queries/use-user-category-history-query.ts`**

```typescript
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

async function fetchUserCategoryHistory(userId: string): Promise<Record<string, number[]>> {
    const { data, error } = await supabase
        .from('user_category_level_history')
        .select('level_score, category:categories ( slug )')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: true });

    if (error) throw error;

    const result: Record<string, number[]> = {};
    for (const row of data ?? []) {
        const slug = (row.category as any)?.slug;
        if (!slug) continue;
        if (!result[slug]) result[slug] = [];
        result[slug].push(row.level_score);
    }
    return result;
}

export function useUserCategoryHistoryQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.userCategoryHistory(userId),
        queryFn: () => fetchUserCategoryHistory(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
```

---

### Task 3: Write history snapshot in mutation

**Files:**
- Modify: `mutations/use-complete-assessment.ts`

After the `user_category_levels` upsert (the last line in the `if (score !== null)` block), add a history insert:

- [ ] **Step 1: Read the current file and locate the upsert block**

The upsert block ends with:
```typescript
        if (upsertError) throw upsertError;
    }
```

- [ ] **Step 2: Add history insert immediately after the upsert, before the closing `}`**

Replace:
```typescript
        const { error: upsertError } = await supabase
            .from('user_category_levels')
            .upsert(
                { user_id: userId, category_id: categoryId, level_score: avgScore },
                { onConflict: 'user_id,category_id' },
            );
        if (upsertError) throw upsertError;
    }
```

With:
```typescript
        const { error: upsertError } = await supabase
            .from('user_category_levels')
            .upsert(
                { user_id: userId, category_id: categoryId, level_score: avgScore },
                { onConflict: 'user_id,category_id' },
            );
        if (upsertError) throw upsertError;

        const { error: historyError } = await supabase
            .from('user_category_level_history')
            .insert({ user_id: userId, category_id: categoryId, level_score: avgScore });
        if (historyError) throw historyError;
    }
```

- [ ] **Step 3: Invalidate history query in `onSuccess`**

Replace:
```typescript
        onSuccess: async (_, { userId }) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: queryKeys.userAssessments(userId) }),
                qc.invalidateQueries({ queryKey: queryKeys.userCategoryLevels(userId) }),
            ]);
        },
```

With:
```typescript
        onSuccess: async (_, { userId }) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: queryKeys.userAssessments(userId) }),
                qc.invalidateQueries({ queryKey: queryKeys.userCategoryLevels(userId) }),
                qc.invalidateQueries({ queryKey: queryKeys.userCategoryHistory(userId) }),
            ]);
        },
```

---

### Task 4: Sparkline component

**Files:**
- Create: `components/sparkline.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { Electric } from '@/constants/theme';
import { useMemo } from 'react';
import { Path, Svg } from 'react-native-svg';

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    strokeWidth?: number;
}

/**
 * Minimal SVG sparkline. Renders a smooth line through normalised data points.
 * Needs at least 2 data points to draw anything.
 */
export function Sparkline({
    data,
    width = 100,
    height = 40,
    color = Electric[500],
    strokeWidth = 2,
}: SparklineProps) {
    const path = useMemo(() => {
        if (data.length < 2) return null;

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1; // avoid division by zero when all values equal

        const pad = strokeWidth;
        const innerW = width - pad * 2;
        const innerH = height - pad * 2;

        const points = data.map((v, i) => ({
            x: pad + (i / (data.length - 1)) * innerW,
            y: pad + (1 - (v - min) / range) * innerH,
        }));

        // Catmull-Rom to cubic bezier approximation for smooth curve
        const d = points.reduce((acc, p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = points[i - 1];
            const cp1x = prev.x + (p.x - prev.x) / 3;
            const cp1y = prev.y;
            const cp2x = p.x - (p.x - prev.x) / 3;
            const cp2y = p.y;
            return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
        }, '');

        return d;
    }, [data, width, height, strokeWidth]);

    if (!path) return null;

    return (
        <Svg width={width} height={height}>
            <Path
                d={path}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}
```

---

### Task 5: Redesign progress.tsx

**Files:**
- Modify: `app/(tabs)/progress.tsx`

Replace the entire file with the vertical-list layout. Each card is full-width with: icon + name (left), level badge (right) in the header row; big score number (left) + sparkline chart (right) in the body.

- [ ] **Step 1: Replace `app/(tabs)/progress.tsx`**

```typescript
import { Sparkline } from '@/components/sparkline';
import { getCategoryMeta } from '@/constants/categories';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useUserCategoryHistoryQuery } from '@/queries/use-user-category-history-query';
import { useUserCategoryLevelsQuery } from '@/queries/use-user-category-levels-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JempText } from '@/components/jemp-text';

const CATEGORY_SLUGS = [
    'strength',
    'jumps',
    'lower_body_plyometrics',
    'upper_body_plyometrics',
    'mobility',
] as const;

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    strength: 'barbell',
    jumps: 'trending-up',
    lower_body_plyometrics: 'flash',
    upper_body_plyometrics: 'fitness',
    mobility: 'body',
};

interface CategoryCardProps {
    slug: string;
    levelScore: number | undefined;
    history: number[];
}

function CategoryCard({ slug, levelScore, history }: CategoryCardProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t } = useTranslation();
    const cat = getCategoryMeta(slug);
    const icon = CATEGORY_ICONS[slug] ?? 'fitness';

    const trend = history.length >= 2
        ? history[history.length - 1] - history[history.length - 2]
        : null;

    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: cat.borderColor }]}>
            {/* Header row */}
            <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                    <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
                        <Ionicons name={icon} size={18} color={cat.color} />
                    </View>
                    <JempText type="caption" color={theme.textMuted} style={styles.catName}>
                        {t(`category.${slug}`, { defaultValue: slug }).toUpperCase()}
                    </JempText>
                </View>
                {levelScore !== undefined && (
                    <View style={[styles.lvlBadge, { backgroundColor: theme.background }]}>
                        <JempText type="caption" color={theme.textMuted} style={styles.lvlText}>
                            Lvl {levelScore}
                        </JempText>
                    </View>
                )}
            </View>

            {/* Body: score + chart */}
            <View style={styles.cardBody}>
                <View style={styles.scoreCol}>
                    <View style={styles.scoreRow}>
                        <JempText type="h1" color={levelScore !== undefined ? cat.color : theme.textSubtle}>
                            {levelScore !== undefined ? String(levelScore) : '—'}
                        </JempText>
                        {levelScore !== undefined && (
                            <JempText type="body-sm" color={theme.textSubtle} style={styles.scoreSuffix}>
                                /100
                            </JempText>
                        )}
                    </View>
                    {trend !== null && (
                        <View style={styles.trendRow}>
                            <Ionicons
                                name={trend >= 0 ? 'arrow-up' : 'arrow-down'}
                                size={12}
                                color={trend >= 0 ? cat.color : theme.textSubtle}
                            />
                            <JempText
                                type="caption"
                                color={trend >= 0 ? cat.color : theme.textSubtle}
                                style={styles.trendText}
                            >
                                {Math.abs(trend)} since last test
                            </JempText>
                        </View>
                    )}
                </View>

                {history.length >= 2 && (
                    <Sparkline
                        data={history}
                        width={110}
                        height={48}
                        color={cat.color}
                        strokeWidth={2}
                    />
                )}
            </View>
        </View>
    );
}

export default function ProgressScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const { data: categoryLevels, isLoading: levelsLoading } = useUserCategoryLevelsQuery(profile?.id);
    const { data: categoryHistory, isLoading: historyLoading } = useUserCategoryHistoryQuery(profile?.id);

    const isLoading = levelsLoading || historyLoading;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.headerSection}>
                <JempText type="h1" style={styles.title}>{t('tab.progress')}</JempText>
            </View>

            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {CATEGORY_SLUGS.map(slug => (
                        <CategoryCard
                            key={slug}
                            slug={slug}
                            levelScore={categoryLevels?.[slug]}
                            history={categoryHistory?.[slug] ?? []}
                        />
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    headerSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    title: { letterSpacing: -0.5 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },

    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        gap: 12,
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catName: {
        letterSpacing: 1,
        fontSize: 11,
    },
    lvlBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    lvlText: {
        fontSize: 12,
        letterSpacing: 0.2,
    },

    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scoreCol: {
        gap: 4,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
    },
    scoreSuffix: {
        paddingBottom: 4,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    trendText: {
        fontSize: 11,
    },
});
```

---

## Verification

1. Run migration: `supabase db push`
2. Complete an assessment in the app
3. Check in Supabase Studio:
   - `user_category_level_history` has a new row with the correct `level_score`
4. Complete a second assessment in the same category
5. Progress tab shows:
   - Card with correct level score
   - Sparkline with 2 data points
   - Trend indicator (↑ or ↓ with delta)
6. With only 1 data point: sparkline and trend row are hidden, only score shows
