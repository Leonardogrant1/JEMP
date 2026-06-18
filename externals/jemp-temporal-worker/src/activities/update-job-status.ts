// externals/jemp-temporal-worker/src/activities/update-job-status.ts
import { getSupabaseClient } from 'src/utils/supabase'

export async function updateJobStatus(input: {
  jobId: string
  status: string
  phaseDetail?: string
  planId?: string
}): Promise<void> {
  const supabase = getSupabaseClient()
  const { jobId, status, phaseDetail, planId } = input
  const { error } = await supabase
    .from('plan_generation_jobs')
    .update({
      status,
      ...(phaseDetail !== undefined && { phase_detail: phaseDetail }),
      ...(planId !== undefined && { plan_id: planId }),
    })
    .eq('id', jobId)
  if (error) throw new Error(`updateJobStatus failed: ${error.message}`)
}
