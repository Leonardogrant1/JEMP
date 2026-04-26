import { supabase } from '@/services/supabase/client';
import { useQuery } from '@tanstack/react-query';

async function fetchUserAssessment(userAssessmentId: string) {
    const { data } = await supabase
        .from('user_assessments')
        .select(`
            id, status,
            assessment:assessments (
                id, slug, name, name_i18n, description, description_i18n,
                measured_metric_id,
                category_id,
                metric:metrics!measured_metric_id ( id, slug, unit, higher_is_better ),
                category:categories ( slug ),
                assessment_equipments ( equipment:equipments ( slug, name_i18n ) )
            )
        `)
        .eq('id', userAssessmentId)
        .single();

    if (!data) return null;

    const assessment = data.assessment as any;
    return {
        id: data.id,
        status: data.status,
        assessment: {
            ...assessment,
            equipments: (assessment.assessment_equipments ?? [])
                .map((ae: any) => ae.equipment)
                .filter((e: any): e is { slug: string; name_i18n: unknown } => !!e?.slug),
        },
    };
}

export type UserAssessmentDetail = NonNullable<Awaited<ReturnType<typeof fetchUserAssessment>>>;

export function useUserAssessmentQuery(userAssessmentId: string | undefined) {
    return useQuery({
        queryKey: ['user-assessment', userAssessmentId],
        queryFn: () => fetchUserAssessment(userAssessmentId!),
        enabled: !!userAssessmentId,
    });
}
