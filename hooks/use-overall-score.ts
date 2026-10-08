import { ALL_STAT_SLUGS } from '@/constants/progress-constants';
import { weightedOverall } from '@/lib/pillar-score';
import { usePillarWeightsQuery } from '@/queries/use-pillar-weights-query';
import { useUserCategoryLevelsQuery } from '@/queries/use-user-category-levels-query';
import { useCurrentUser } from '@/providers/current-user-provider';
import { useMemo } from 'react';

/** Overall level (Spec §4.7): LIVE und sport-gewichtet berechnet — nie persistiert.
 *  Ohne Sport-Gewichte: ungewichteter Durchschnitt (Gewicht 1), wie zuvor. */
export function useOverallScore(userId: string | undefined): number | null {
    const { data: categoryLevels } = useUserCategoryLevelsQuery(userId);
    const { profile } = useCurrentUser();
    const { data: weights } = usePillarWeightsQuery(profile?.sport_id ?? (profile as any)?.sport?.id ?? null);
    return useMemo(() => {
        if (!categoryLevels) return null;
        const values = ALL_STAT_SLUGS
            .filter((s) => categoryLevels[s] !== undefined)
            .map((s) => ({ slug: s as string, level: categoryLevels[s] }));
        if (!values.length) return null;
        const effectiveWeights = weights && weights.length > 0
            ? weights
            : values.map((v) => ({ slug: v.slug, weight: 1 }));
        return weightedOverall(values, effectiveWeights);
    }, [categoryLevels, weights]);
}
