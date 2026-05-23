import { z } from "zod"

const exerciseSchema = z.object({
  exercise_slug: z.string(),
  order_index: z.number(),
  notes: z.string(),
  target_sets: z.number(),
  target_reps_min: z.number(),
  target_reps_max: z.number(),
  target_duration_seconds: z.number(),
  target_distance_meters: z.number(),
  target_rest_seconds: z.number(),
  target_load_type: z.enum(["bodyweight", "kg", "rpe", "pace"]),
  target_load_value: z.number(),
})

const blockSchema = z.object({
  block_type: z.enum(["warmup", "primary", "secondary", "accessory", "cooldown"]),
  order_index: z.number(),
  focused_category_slug: z.string(),
  exercises: z.array(exerciseSchema),
})

const sessionSchema = z.object({
  name: z.string(),
  mode_slug: z.enum(["full", "reduced", "activation", "recovery"]),
  estimated_duration_minutes: z.number(),
  day_of_week: z.number(),
  order_index: z.number(),
  session_type: z.enum(["training", "recovery"]),
  description: z.string(),
  pause_between_sets: z.number(),
  blocks: z.array(blockSchema),
})

const planSchema = z.object({
  name: z.string(),
  description: z.string(),
  sessions: z.array(sessionSchema),
})

const bodyRegionEnum = z.enum([
  "quad", "hamstring", "glute", "calf", "hip",
  "lower_back", "core", "chest", "upper_back",
  "shoulder", "tricep", "bicep", "full_body",
])

// Phase A: week planner picks categories per block + body regions per session
const weekPlanSchema = z.object({
  name: z.string(),
  description: z.string(),
  sessions: z.array(z.object({
    day_of_week: z.number(),
    body_regions: z.array(bodyRegionEnum),
    blocks: z.array(z.object({
      block_type: z.enum(["primary", "secondary", "accessory"]),
      category_slug: z.string(),
    })),
  })),
})

// Phase C: main blocks only (primary, secondary, accessory)
const mainBlockSchema = z.object({
  block_type: z.enum(["primary", "secondary", "accessory"]),
  order_index: z.number(),
  focused_category_slug: z.string(),
  exercises: z.array(exerciseSchema),
})

const mainSessionSchema = z.object({
  name: z.string(),
  mode_slug: z.enum(["full", "reduced", "activation", "recovery"]),
  estimated_duration_minutes: z.number(),
  day_of_week: z.number(),
  order_index: z.number(),
  session_type: z.enum(["training", "recovery"]),
  description: z.string(),
  pause_between_sets: z.number(),
  blocks: z.array(mainBlockSchema),
})

// Phase D: warmup and cooldown blocks only
const warmupCooldownBlockSchema = z.object({
  block_type: z.enum(["warmup", "cooldown"]),
  order_index: z.number(),
  focused_category_slug: z.string(),
  exercises: z.array(exerciseSchema),
})

const warmupCooldownSchema = z.object({
  blocks: z.array(warmupCooldownBlockSchema),
})

export {
  blockSchema,
  exerciseSchema,
  mainSessionSchema,
  planSchema,
  sessionSchema,
  warmupCooldownSchema,
  weekPlanSchema,
}
