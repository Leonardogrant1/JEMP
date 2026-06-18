// externals/jemp-temporal-worker/src/workflows/generate-plan-workflow.ts
import { proxyActivities, ActivityOptions } from '@temporalio/workflow'
import type * as activities from '../activities'
import type { PreviousSessionSummary } from '../plan-generation/prompts'
import type { PlannedSession } from '../plan-generation/generate-plan'

const activityOptions: ActivityOptions = {
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2,
  },
}

const {
  updateJobStatus,
  preparePlanGeneration,
  runSessionPhasesCD,
  savePlan,
} = proxyActivities<typeof activities>(activityOptions)

export async function generatePlanWorkflow(input: {
  userId: string
  jobId: string
}): Promise<void> {
  const { userId, jobId } = input

  try {
    await updateJobStatus({ jobId, status: 'fetching_data' })
    const prepareResult = await preparePlanGeneration({ userId })

    await updateJobStatus({ jobId, status: 'planning_week' })

    const totalSessions = prepareResult.sessionBuildInputs.length
    const plannedSessions: PlannedSession[] = []
    const previousSessionSummaries: PreviousSessionSummary[] = []

    for (let i = 0; i < totalSessions; i++) {
      await updateJobStatus({ jobId, status: 'generating_session', phaseDetail: `${i + 1}/${totalSessions}` })

      const session = await runSessionPhasesCD({
        sessionBuildInput: prepareResult.sessionBuildInputs[i],
        sessionIndex: i,
        totalSessions,
        weekPlanSummary: prepareResult.weekPlanSummary,
        userContext: prepareResult.userContext,
        planName: prepareResult.weekPlan.name,
        planDescription: prepareResult.weekPlan.description,
        previousSessionSummaries,
        exerciseSlugToMeasurementType: prepareResult.exerciseSlugToMeasurementType,
        allExerciseSlugs: prepareResult.allExerciseSlugs,
      })

      plannedSessions.push(session)
      // Build compact summary for next session's prompt context (pure data — ok in workflow)
      previousSessionSummaries.push({
        day_of_week: session.day_of_week,
        mode_slug: session.mode_slug,
        blocks: session.blocks
          .filter(b => b.block_type === 'primary' || b.block_type === 'secondary' || b.block_type === 'accessory')
          .map(b => ({
            block_type: b.block_type as any,
            category_slug: b.focused_category_slug,
            exercises: b.exercises.map(e => ({
              slug: e.exercise_slug,
              sets: e.target_sets,
              load_type: e.target_load_type,
              load_value: e.target_load_value,
            })),
          })),
      })
    }

    await updateJobStatus({ jobId, status: 'saving' })
    const planId = await savePlan({
      userId,
      planName: prepareResult.weekPlan.name,
      planDescription: prepareResult.weekPlan.description,
      sessions: plannedSessions,
      environmentIds: prepareResult.environmentIds,
    })

    await updateJobStatus({ jobId, status: 'completed', planId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    await updateJobStatus({ jobId, status: 'error', errorMessage: message })
  }
}
