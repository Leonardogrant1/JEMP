import { calculateAssessmentScore, AssessmentUserProfile } from '@/lib/score-calculators/assessment-score';
import { queryKeys } from '@/queries/query-keys';
import { supabase } from '@/services/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type CompleteAssessmentParams = {
    userAssessmentId: string;
    assessmentId: string;
    userId: string;
    metricId: string;
    value: number;
    assessmentSlug: string;
    categoryId: string;
    userProfile: AssessmentUserProfile;
};

async function completeAssessment({
    userAssessmentId, assessmentId, userId, metricId, value,
    assessmentSlug, categoryId, userProfile,
}: CompleteAssessmentParams) {
    const score = calculateAssessmentScore(assessmentSlug, value, userProfile);

    // 1. Insert metric entry (with score if calculable)
    const { error: metricError } = await supabase
        .from('metric_entries')
        .insert({
            user_id: userId,
            metric_id: metricId,
            value,
            source_type: 'assessment',
            user_assessment_id: userAssessmentId,
            ...(score !== null && { score }),
        });
    if (metricError) throw metricError;

    // 2. Recalculate category level before marking complete (so this assessment isn't in the query)
    if (score !== null) {
        const { data: entries, error: scoresError } = await supabase
            .from('metric_entries')
            .select(`
                score,
                user_assessment:user_assessments!inner (
                    assessment_id,
                    completed_at,
                    assessment:assessments!inner ( category_id )
                )
            `)
            .eq('user_id', userId)
            .eq('source_type', 'assessment')
            .eq('user_assessment.assessment.category_id', categoryId)
            .not('score', 'is', null);
        if (scoresError) throw scoresError;

        // Keep only the latest score per assessment_id for this category
        // Rows are unordered so track the latest completed_at per assessment
        const latestByAssessment = new Map<string, { score: number; completedAt: string }>();
        for (const me of entries ?? []) {
            const ua = me.user_assessment as any;
            if (!ua || ua.assessment?.category_id !== categoryId) continue;
            const s = me.score as number;
            const existing = latestByAssessment.get(ua.assessment_id);
            if (!existing || ua.completed_at > existing.completedAt) {
                latestByAssessment.set(ua.assessment_id, { score: s, completedAt: ua.completed_at });
            }
        }

        // Include the assessment just completed (not yet in DB)
        latestByAssessment.set(assessmentId, { score, completedAt: new Date().toISOString() });

        const allScores = [...latestByAssessment.values()].map(e => e.score);
        const avgScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);

        const { error: upsertError } = await supabase
            .from('user_category_levels')
            .upsert(
                { user_id: userId, category_id: categoryId, level_score: avgScore },
                { onConflict: 'user_id,category_id' },
            );
        if (upsertError) throw upsertError;

        // Snapshot current levels into history so the chart updates immediately
        const { error: snapshotError } = await supabase.rpc('fn_take_user_category_level_snapshot', {
            p_user_id: userId,
        });
        if (snapshotError) throw snapshotError;
    }

    // 3. Mark assessment as completed (last step — so the query above sees correct state)
    const { error: assessmentError } = await supabase
        .from('user_assessments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', userAssessmentId);
    if (assessmentError) throw assessmentError;
}

export function useCompleteAssessment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: completeAssessment,
        onSuccess: async (_, { userId }) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: queryKeys.userAssessments(userId) }),
                qc.invalidateQueries({ queryKey: queryKeys.userCategoryLevels(userId) }),
                qc.invalidateQueries({ queryKey: ['category-history', userId] }),
            ]);
        },
    });
}
