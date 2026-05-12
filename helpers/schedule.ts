/** Converts a sport session intensity (1–10) to a load point value (1–5). */
export function intensityToPoints(intensity: number): number {
  if (intensity <= 2) return 1
  if (intensity <= 4) return 2
  if (intensity <= 6) return 3
  if (intensity <= 8) return 4
  return 5
}

/** Derives the load profile from the total weekly load points. */
export function pointsToLoadProfile(points: number): 'low' | 'medium' | 'high' {
  if (points <= 4) return 'low'
  if (points <= 10) return 'medium'
  return 'high'
}
