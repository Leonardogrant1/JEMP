// externals/jemp-temporal-worker/src/activities/run-session-phases-cd.ts
import { getOpenAIClient } from 'src/utils/openai'
import { runSessionCD, PlannedSession, SessionBuildInput } from 'src/plan-generation/generate-plan'
import { PreviousSessionSummary } from 'src/plan-generation/prompts'

export async function runSessionPhasesCD(input: {
  sessionBuildInput: SessionBuildInput
  sessionIndex: number
  totalSessions: number
  weekPlanSummary: string
  userContext: string
  planName: string
  planDescription: string
  previousSessionSummaries: PreviousSessionSummary[]
  exerciseSlugToMeasurementType: Record<string, string>
  allExerciseSlugs: string[]
}): Promise<PlannedSession> {
  const openai = getOpenAIClient()
  return runSessionCD(
    input.sessionBuildInput,
    {
      sessionIndex: input.sessionIndex,
      totalSessions: input.totalSessions,
      weekPlanSummary: input.weekPlanSummary,
      userContext: input.userContext,
      planName: input.planName,
      planDescription: input.planDescription,
      previousSessions: input.previousSessionSummaries,
      exerciseSlugToMeasurementType: input.exerciseSlugToMeasurementType,
      allExerciseSlugs: input.allExerciseSlugs,
    },
    openai,
  )
}
