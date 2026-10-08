// Shared v2 test fixtures.
export const ex = (over: Partial<any>): any => ({
  id: 'x', slug: over.slug ?? 'x', name: 'x', category_slug: 'strength', body_region: null,
  dominant_region: null, strength_pattern: null, plyo_type: null, core_type: null,
  sprint_type: null, covered_patterns: null, laterality: null,
  min_level: 1, max_level: 100, intensity_score: 5, measurement_type: 'reps', ...over,
})

export const day = (over: Partial<any> = {}): any => ({
  day_of_week: 1, session_type: 'speed', minutes: 40, dose: 'normal',
  carries_sprint_block: false, heavy_lower: false, suppress_micro_dose: false, ...over,
})

export const block = (bt: string, variant: string | null = null): any =>
  ({ block_type: bt, variant, emphasis: 'normal' })
