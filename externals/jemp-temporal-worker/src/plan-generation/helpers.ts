// externals/jemp-temporal-worker/src/plan-generation/helpers.ts

export function intensityToPoints(intensity: number): number {
  if (intensity <= 3) return 1
  if (intensity <= 5) return 2
  if (intensity <= 7) return 3
  if (intensity <= 9) return 4
  return 5
}

export function pointsToLoadProfile(points: number): "low" | "medium" | "high" {
  if (points <= 6) return "low"
  if (points <= 12) return "medium"
  return "high"
}
