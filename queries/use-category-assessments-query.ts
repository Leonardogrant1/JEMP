import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

export interface CategoryAssessmentEntry {
    assessmentId: string;
    name: string;
    unit: string;
    higherIsBetter: boolean;
    firstValue: number | null;  // null when only one entry in period
    latestValue: number;
    latestScore: number | null;
    /**
     * Percentage change in raw value, already sign-corrected for higher_is_better.
     * Positive = improvement, negative = regression. null if only one entry.
     */
    percentChange: number | null;
    entryCount: number;
}

async function fetchCategoryAssessments(
    userId: string,
    categorySlug: string,
    since: string,
): Promise<CategoryAssessmentEntry[]> {
    // 1. Resolve category id
    const { data: cat, error: catErr } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();
    if (catErr || !cat) throw catErr ?? new Error('Category not found');

    // 2. Fetch assessments for this category + metric info (small set)
    const { data: assessments, error: assessmentsErr } = await supabase
        .from('assessments')
        .select('id, name, metric:metrics!measured_metric_id(unit, higher_is_better)')
        .eq('category_id', cat.id);
    if (assessmentsErr) throw assessmentsErr;
    if (!assessments?.length) return [];

    const assessmentMeta = new Map(
        assessments.map(a => [
            a.id,
            {
                name: a.name as string,
                unit: (a.metric as any)?.unit ?? '',
                higherIsBetter: (a.metric as any)?.higher_is_better ?? true,
            },
        ])
    );
    const assessmentIds = new Set(assessmentMeta.keys());

    // 3. Fetch metric_entries within the timeframe.
    //    Single join to user_assessments only to get assessment_id — no nested WHERE.
    const { data: entries, error: entriesErr } = await supabase
        .from('metric_entries')
        .select('value, score, created_at, user_assessment:user_assessments!inner(assessment_id)')
        .eq('user_id', userId)
        .eq('source_type', 'assessment')
        .gte('created_at', since)
        .order('created_at', { ascending: true });
    if (entriesErr) throw entriesErr;

    // 4. Group by assessment_id, keep only entries belonging to this category
    const groups = new Map<string, { value: number; score: number | null }[]>();

    for (const e of entries ?? []) {
        const assessmentId = (e.user_assessment as any)?.assessment_id as string | undefined;
        if (!assessmentId || !assessmentIds.has(assessmentId)) continue;
        if (!groups.has(assessmentId)) groups.set(assessmentId, []);
        groups.get(assessmentId)!.push({ value: e.value, score: e.score ?? null });
    }

    // 5. Build result rows — sorted by assessment name
    return [...groups.entries()]
        .map(([id, pts]) => {
            const meta = assessmentMeta.get(id)!;
            const first = pts[0];
            const last = pts[pts.length - 1];

            let percentChange: number | null = null;
            if (pts.length >= 2 && first.value !== 0) {
                const rawChange = (last.value - first.value) / Math.abs(first.value);
                // Flip sign for "lower is better" metrics so positive always means improvement
                percentChange = Math.round((meta.higherIsBetter ? rawChange : -rawChange) * 100);
            }

            return {
                assessmentId: id,
                name: meta.name,
                unit: meta.unit,
                higherIsBetter: meta.higherIsBetter,
                firstValue: pts.length >= 2 ? first.value : null,
                latestValue: last.value,
                latestScore: last.score,
                percentChange,
                entryCount: pts.length,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

export function useCategoryAssessmentsQuery(
    userId: string | undefined,
    categorySlug: string | undefined,
    since: string,
) {
    return useQuery({
        queryKey: queryKeys.categoryAssessments(userId, categorySlug, since),
        queryFn: () => fetchCategoryAssessments(userId!, categorySlug!, since),
        enabled: !!userId && !!categorySlug && categorySlug !== 'all',
        staleTime: 5 * 60 * 1000,
    });
}
