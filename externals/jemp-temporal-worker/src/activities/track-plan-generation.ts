// externals/jemp-temporal-worker/src/activities/track-plan-generation.ts
import { getPosthogClient } from 'src/utils/posthog'

export async function trackPlanGeneration(input: {
  userId: string
  event: 'plan_generation_success' | 'plan_generation_failed'
  properties?: Record<string, unknown>
}): Promise<void> {
  // Tracking must never fail the workflow — swallow all errors
  try {
    const posthog = getPosthogClient()
    if (!posthog) return
    posthog.capture({
      distinctId: input.userId,
      event: input.event,
      properties: input.properties,
    })
    await posthog.flush()
  } catch (err) {
    console.warn(`trackPlanGeneration failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
