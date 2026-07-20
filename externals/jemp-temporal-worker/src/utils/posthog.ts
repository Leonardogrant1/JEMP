// externals/jemp-temporal-worker/src/utils/posthog.ts
import { PostHog } from 'posthog-node'

let client: PostHog | null = null

export function getPosthogClient(): PostHog | null {
  if (!process.env.POSTHOG_API_KEY) return null
  if (!client) {
    client = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST,
    })
  }
  return client
}
