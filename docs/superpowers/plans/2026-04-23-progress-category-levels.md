# Progress — Category Levels Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the user's `level_score` per training category as a card grid at the top of the Progress tab.

**Architecture:** New query fetches `user_category_levels` joined with `categories` and returns a `Record<slug, level_score>`. The screen renders two rows of 2 cards + one full-width card (mobility), using existing `getCategoryMeta` and `CATEGORY_ICONS` constants.

**Tech Stack:** React Native, Expo Router, TanStack Query, Supabase, TypeScript

---

### Task 1: Add query key for category levels

**Files:**
- Modify: `queries/query-keys.ts`

- [ ] **Step 1: Add `userCategoryLevels` key**

Replace the contents of `queries/query-keys.ts` with:

```typescript
export const queryKeys = {
    plan: (userId: string | undefined) => ['plan', userId] as const,
    sessionDetail: (sessionId: string | undefined) => ['session-detail', sessionId] as const,
    allSessions: ['session-detail'] as const,
    exerciseDetail: (exerciseId: string | undefined) => ['exercise-detail', exerciseId] as const,
    sessionSummary: (sessionId: string | undefined) => ['session-summary', sessionId] as const,
    userAssessments: (userId: string | undefined) => ['assessments', userId] as const,
    userCategoryLevels: (userId: string | undefined) => ['category-levels', userId] as const,
};
```

---

### Task 2: Create `use-user-category-levels-query.ts`

**Files:**
- Create: `queries/use-user-category-levels-query.ts`

- [ ] **Step 1: Create the query file**

```typescript
import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

async function fetchUserCategoryLevels(userId: string): Promise<Record<string, number>> {
    const { data } = await supabase
        .from('user_category_levels')
        .select(`
            level_score,
            category:categories ( slug )
        `)
        .eq('user_id', userId);

    const result: Record<string, number> = {};
    for (const row of data ?? []) {
        const slug = (row.category as any)?.slug;
        if (slug) result[slug] = row.level_score;
    }
    return result;
}

export function useUserCategoryLevelsQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.userCategoryLevels(userId),
        queryFn: () => fetchUserCategoryLevels(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}
```

---

### Task 3: Build the Progress screen with category level cards

**Files:**
- Modify: `app/(tabs)/progress.tsx`

- [ ] **Step 1: Replace `progress.tsx` with full implementation**

```typescript
import { JempText } from '@/components/jemp-text';
import { getCategoryMeta } from '@/constants/categories';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useUserCategoryLevelsQuery } from '@/queries/use-user-category-levels-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    strength: 'barbell',
    jumps: 'trending-up',
    lower_body_plyometrics: 'flash',
    upper_body_plyometrics: 'fitness',
    mobility: 'body',
};

const GRID_SLUGS = [
    ['strength', 'jumps'],
    ['lower_body_plyometrics', 'upper_body_plyometrics'],
] as const;

const FULL_WIDTH_SLUG = 'mobility';

interface CategoryCardProps {
    slug: string;
    levelScore: number | undefined;
    fullWidth?: boolean;
}

function CategoryCard({ slug, levelScore, fullWidth }: CategoryCardProps) {
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { t } = useTranslation();
    const cat = getCategoryMeta(slug);
    const icon = CATEGORY_ICONS[slug] ?? 'fitness';

    return (
        <View style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: cat.borderColor },
            fullWidth && styles.cardFullWidth,
        ]}>
            {/* Top row: icon + lvl badge */}
            <View style={styles.cardTop}>
                <View style={[styles.iconBox, { backgroundColor: theme.background }]}>
                    <Ionicons name={icon} size={20} color={cat.color} />
                </View>
                {levelScore !== undefined && (
                    <View style={[styles.lvlBadge, { backgroundColor: theme.background }]}>
                        <JempText type="caption" color={theme.textMuted} style={styles.lvlText}>
                            Lvl {levelScore}
                        </JempText>
                    </View>
                )}
            </View>

            {/* Category name */}
            <JempText type="caption" color={theme.textMuted} style={styles.catName}>
                {t(`category.${slug}`, { defaultValue: slug }).toUpperCase()}
            </JempText>

            {/* Score */}
            <View style={styles.scoreRow}>
                <JempText type="h2" color={levelScore !== undefined ? cat.color : theme.textSubtle}>
                    {levelScore !== undefined ? String(levelScore) : '—'}
                </JempText>
                <JempText type="body-sm" color={theme.textSubtle} style={styles.scoreSuffix}>
                    /100
                </JempText>
            </View>
        </View>
    );
}

export default function ProgressScreen() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[(colorScheme ?? 'dark') as 'light' | 'dark'];
    const { profile } = useCurrentUser();

    const { data: categoryLevels, isLoading } = useUserCategoryLevelsQuery(profile?.id);

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
                    {/* 2×2 grid */}
                    {GRID_SLUGS.map((row, i) => (
                        <View key={i} style={styles.row}>
                            {row.map(slug => (
                                <CategoryCard
                                    key={slug}
                                    slug={slug}
                                    levelScore={categoryLevels?.[slug]}
                                />
                            ))}
                        </View>
                    ))}

                    {/* Full-width mobility card */}
                    <CategoryCard
                        slug={FULL_WIDTH_SLUG}
                        levelScore={categoryLevels?.[FULL_WIDTH_SLUG]}
                        fullWidth
                    />
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

    row: {
        flexDirection: 'row',
        gap: 12,
    },

    card: {
        flex: 1,
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        gap: 8,
    },
    cardFullWidth: {
        flex: 0,
    },

    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
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

    catName: {
        letterSpacing: 1,
        fontSize: 11,
    },

    scoreRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
    },
    scoreSuffix: {
        paddingBottom: 3,
    },
});
```

---

### Task 4: Add missing i18n key for progress tab

**Files:**
- Modify: `i18n/locales/en.ts`
- Modify: `i18n/locales/de.ts`

- [ ] **Step 1: Verify `tab.progress` key exists in both locale files**

Run:
```bash
grep -n "tab.progress" i18n/locales/en.ts i18n/locales/de.ts
```

If the key is missing in either file, add it alongside the other `tab.*` keys:

In `en.ts`: `'tab.progress': 'Progress',`  
In `de.ts`: `'tab.progress': 'Fortschritt',`
