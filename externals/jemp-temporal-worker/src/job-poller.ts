// externals/jemp-temporal-worker/src/job-poller.ts
import cron from 'node-cron'
import { Client } from '@temporalio/client'
import { getSupabaseClient } from './utils/supabase'

export function startJobPoller(temporalClient: Client): void {
  // Poll every 5 seconds for pending jobs
  cron.schedule('*/5 * * * * *', async () => {
    const supabase = getSupabaseClient()

    const { data: pendingJobs, error } = await supabase
      .from('plan_generation_jobs')
      .select('id, user_id')
      .eq('status', 'pending')
      .limit(5)

    if (error) {
      console.error('[JobPoller] Failed to fetch pending jobs:', error.message)
      return
    }
    if (!pendingJobs || pendingJobs.length === 0) return

    for (const job of pendingJobs) {
      try {
        // Mark as picked up immediately to avoid double-processing
        await supabase
          .from('plan_generation_jobs')
          .update({ status: 'planning_week' })
          .eq('id', job.id)
          .eq('status', 'pending')  // optimistic lock: only update if still pending

        const handle = await temporalClient.workflow.start('generatePlanWorkflow', {
          taskQueue: 'jemp-queue',
          workflowId: `generate-plan-${job.id}`,
          args: [{ userId: job.user_id, jobId: job.id }],
        })

        await supabase
          .from('plan_generation_jobs')
          .update({ workflow_id: handle.workflowId })
          .eq('id', job.id)

        console.log(`[JobPoller] Started workflow ${handle.workflowId} for job ${job.id}`)
      } catch (err: any) {
        console.error(`[JobPoller] Failed to start workflow for job ${job.id}:`, err.message)
        await supabase
          .from('plan_generation_jobs')
          .update({ status: 'error', error: err.message })
          .eq('id', job.id)
      }
    }
  })

  console.log('[JobPoller] Started — polling for pending plan generation jobs every 5s')
}
