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


const planOverviewSchema = z.object({
  name: z.string(),
  description: z.string(),
  plan_markdown: z.string(),
})

export { blockSchema, exerciseSchema, planOverviewSchema, planSchema, sessionSchema }
