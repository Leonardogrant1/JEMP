import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Latest logged value for this assessment type across all past attempts
async function fetchLastAssessmentResult(userId: string, assessmentId: string): Promise<number | null> {
    const { data } = await supabase
        .from('metric_entries')
        .select('value, created_at, user_assessment:user_assessments!inner ( assessment_id )')
        .eq('user_id', userId)
        .eq('source_type', 'assessment')
        .eq('user_assessment.assessment_id', assessmentId)
        .order('created_at', { ascending: false })
        .limit(1);

    return data?.[0]?.value ?? null;
}

export function useLastAssessmentResultQuery(userId: string | undefined, assessmentId: string | undefined) {
    return useQuery({
        queryKey: ['last-assessment-result', userId, assessmentId],
        queryFn: () => fetchLastAssessmentResult(userId!, assessmentId!),
        enabled: !!userId && !!assessmentId,
    });
}
