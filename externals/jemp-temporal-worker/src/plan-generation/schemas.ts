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

// ── Dynamic schema builders (per-call slug enums) ────────────

function toEnum(slugs: string[]): z.ZodTypeAny {
  const unique = [...new Set(slugs)].filter(Boolean)
  if (unique.length === 0) {
    console.warn("[schema] toEnum called with empty slug list — falling back to z.string()")
    return z.string()
  }
  return z.enum(unique as [string, ...string[]])
}

export function buildWeekPlanSchema(categorySlugs: string[], environmentSlugs: string[]) {
  const categoryEnum = toEnum(categorySlugs)
  const environmentEnum = toEnum(environmentSlugs.length > 0 ? environmentSlugs : ["gym"])
  return z.object({
    name: z.string(),
    description: z.string(),
    sessions: z.array(z.object({
      day_of_week: z.number(),
      environment_slug: environmentEnum,
      body_regions: z.array(bodyRegionEnum),
      blocks: z.array(z.object({
        block_type: z.enum(["primary", "secondary", "accessory"]),
        category_slug: categoryEnum,
      })),
    })),
  })
}

export function buildMainSessionSchema(exerciseSlugs: string[], categorySlugs: string[], minBlocks = 1) {
  const slugEnum = toEnum(exerciseSlugs)
  const categoryEnum = toEnum(categorySlugs)

  const dynExercise = z.object({
    exercise_slug: slugEnum,
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

  const dynBlock = z.object({
    block_type: z.enum(["primary", "secondary", "accessory"]),
    order_index: z.number(),
    focused_category_slug: categoryEnum,
    exercises: z.array(dynExercise),
  })

  return z.object({
    name: z.string(),
    mode_slug: z.enum(["full", "reduced", "activation", "recovery"]),
    estimated_duration_minutes: z.number(),
    day_of_week: z.number(),
    order_index: z.number(),
    session_type: z.enum(["training", "recovery"]),
    description: z.string(),
    pause_between_sets: z.number(),
    // minItems enforces the LLM to output all planned blocks (maps to JSON Schema minItems)
    blocks: z.array(dynBlock).min(minBlocks),
  })
}

export function buildWarmupCooldownSchema(
  warmupSlugs: string[],
  cooldownSlugs: string[],
  categorySlugs: string[],
) {
  const warmupSlugEnum = toEnum(warmupSlugs)
  const cooldownSlugEnum = toEnum(cooldownSlugs)
  const categoryEnum = toEnum(categorySlugs)

  const makeExercise = (slugEnum: z.ZodTypeAny) => z.object({
    exercise_slug: slugEnum,
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

  const warmupBlock = z.object({
    block_type: z.literal("warmup"),
    order_index: z.number(),
    focused_category_slug: categoryEnum,
    exercises: z.array(makeExercise(warmupSlugEnum)),
  })

  const cooldownBlock = z.object({
    block_type: z.literal("cooldown"),
    order_index: z.number(),
    focused_category_slug: categoryEnum,
    exercises: z.array(makeExercise(cooldownSlugEnum)),
  })

  // Use tuple to enforce that BOTH warmup and cooldown are always generated.
  // Separate slug enums also prevent warmup slugs from appearing in cooldown and vice versa.
  return z.object({
    blocks: z.tuple([warmupBlock, cooldownBlock]),
  })
}

export {
  blockSchema,
  exerciseSchema,
  mainSessionSchema,
  planSchema,
  sessionSchema,
  warmupCooldownSchema,
  weekPlanSchema,
}
