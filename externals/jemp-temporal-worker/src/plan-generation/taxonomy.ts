// Pure Übungs-Taxonomie — auch von jemp-api (Swap-Endpoint) gebundelt: hier NIE openai/zod/temporal importieren.

export const BODY_REGION_TO_PATTERN: Record<string, string> = {
  quad: 'squat',
  hamstring: 'hinge', glute: 'hinge',
  chest: 'push', shoulder: 'push', tricep: 'push',
  upper_back: 'pull', bicep: 'pull',
}

// Effektive Region einer Übung für Filter und Kraftmuster: full_body-Übungen
// mit gepflegter dominant_region (z.B. power_clean → glute) werden über diese
// sichtbar; ohne dominant_region bleiben sie bewusst allgemein.
export function effectiveRegion(e: { body_region?: string | null; dominant_region?: string | null }): string | null {
  if (e.body_region === 'full_body') return e.dominant_region ?? e.body_region ?? null
  return e.body_region ?? null
}
