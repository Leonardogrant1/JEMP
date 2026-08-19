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
