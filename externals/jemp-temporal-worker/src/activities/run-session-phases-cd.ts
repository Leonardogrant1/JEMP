// externals/jemp-temporal-worker/src/activities/run-session-phases-cd.ts
import { getOpenAIClient } from 'src/utils/openai'
import { runSessionCD, PlannedSession, SessionBuildInput } from 'src/plan-generation/generate-plan'
import { runSessionV2 } from 'src/plan-generation/v2/run-session-v2'
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
  exerciseSlugToBodyRegion: Record<string, string>
  allExerciseSlugs: string[]
}): Promise<PlannedSession> {
  const openai = getOpenAIClient()
  // v2 path (phase 2b): fixed block structure from the week-layout engine.
  if (input.sessionBuildInput.v2) {
    return runSessionV2({
      ...input.sessionBuildInput.v2,
      userContext: input.userContext,
      weekSummary: input.weekPlanSummary,
      previousSummaries: input.previousSessionSummaries.map((ps: PreviousSessionSummary) =>
        `Tag ${ps.day_of_week}: ${ps.blocks.map((b: PreviousSessionSummary['blocks'][number]) => b.exercises.map((e: { slug: string }) => e.slug).join(', ')).join(' | ')}`),
      orderIndex: input.sessionIndex,
    }, openai) as Promise<PlannedSession>
  }
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
      exerciseSlugToBodyRegion: input.exerciseSlugToBodyRegion,
      allExerciseSlugs: input.allExerciseSlugs,
    },
    openai,
  )
}
