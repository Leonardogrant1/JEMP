import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { PillarWeight } from '@/lib/pillar-score';

// Sport-Gewichtungs-Schicht (Spec §4.3): score_weight pro sichtbarer Säule
// (relevance > 0) des User-Sports. Ohne Sport: leeres Array → Aufrufer
// fällt auf Gewicht 1 für alle Säulen zurück.
async function fetchPillarWeights(sportId: string): Promise<PillarWeight[]> {
    const { data, error } = await supabase
        .from('sport_category_relevance')
        .select('relevance, score_weight, categories!inner ( slug, is_active )')
        .eq('sport_id', sportId)
        .eq('categories.is_active', true)
        .gt('relevance', 0);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ slug: r.categories.slug, weight: r.score_weight ?? 1 }));
}

export function usePillarWeightsQuery(sportId: string | null | undefined) {
    return useQuery({
        queryKey: ['pillarWeights', sportId],
        queryFn: () => fetchPillarWeights(sportId!),
        enabled: !!sportId,
        staleTime: 30 * 60 * 1000,
    });
}
