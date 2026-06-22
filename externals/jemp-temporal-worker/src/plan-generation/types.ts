// externals/jemp-temporal-worker/src/plan-generation/types.ts

export type SessionModeSlug = "full" | "reduced" | "activation" | "recovery"

export type WeeklyScheduleSession = {
  day_of_week: number
  type: "team_training" | "game" | "individual_training" | "tournament"
  intensity: number
}

export type WeeklySchedule = {
  sessions: WeeklyScheduleSession[]
  notes: string | null
}

export type PlanGenerationInput = {
  sport_slug: string
  sport_group_name?: string
  preferred_workout_days: number[]
  min_session_duration: number
  max_session_duration: number
  weekly_schedule?: WeeklySchedule
  load_score?: number
  load_profile?: "low" | "medium" | "high"
  environment_ids: string[]
  environment_slugs: string[]
  equipment_ids: string[]
  category_levels: { category_id: string; level_score: number }[]
  sport_required_categories: { category: string; relevance: number }[]
  user_focus_categories: { category: string; priority: number }[]
  day_environments?: { day_of_week: number; environment_id: string }[]
  equipment_environments?: { equipment_id: string; environment_ids: string[] }[]
}

export type PlannedBlockSummary = {
  block_type: "primary" | "secondary" | "accessory"
  category_slug: string
  exercise_slugs: string[]
}

export type PlannedSessionSummary = {
  day_of_week: number
  mode_slug: SessionModeSlug
  name: string
  blocks: PlannedBlockSummary[]
}
