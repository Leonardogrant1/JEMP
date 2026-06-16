import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"
import { OpenAI } from "openai"
import { generatePlan } from "../_shared/generate-plan.ts"
import { intensityToPoints, pointsToLoadProfile } from "../_shared/helpers.ts"
import { PlanGenerationInput, WeeklySchedule } from "../_shared/types.ts"

// Shape expected from the admin simulator store
type SimUserData = {
  sport: string
  gender: string
  age: number
  height_cm: number
  weight_kg: number
  preferred_workout_days: number[]
  min_session_duration: number
  max_session_duration: number
  weekly_schedule?: WeeklySchedule
  environment_ids?: string[]
  equipment_ids?: string[]
  focus_categories?: { category_slug: string; priority: number }[]
  category_levels?: { category_id: string; level_score: number }[]
  day_environments?: { day_of_week: number; environment_id: string }[]
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  // Admin-only: require service role key in Authorization header
  const authHeader = req.headers.get("Authorization") ?? ""
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  if (!authHeader.includes(serviceRoleKey)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!

  let userData: SimUserData
  try {
    userData = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const openai = new OpenAI({ apiKey: openaiApiKey })

  try {
    // ── Compute load score + profile from weekly_schedule ────────

    const weeklySchedule = userData.weekly_schedule ?? { sessions: [], notes: null }
    const load_score = weeklySchedule.sessions.reduce((sum, s) => sum + intensityToPoints(s.intensity), 0)
    const load_profile = pointsToLoadProfile(load_score)

    // ── Resolve sport slug → required categories ─────────────────

    const { data: sportData } = await supabase
      .from("sports")
      .select("id, slug, sport_category_relevance(relevance, categories(slug))")
      .eq("slug", userData.sport)
      .maybeSingle()

    const sportRequiredCategories = ((sportData?.sport_category_relevance ?? []) as any[])
      .map((r: any) => ({ category: r.categories?.slug, relevance: r.relevance }))
      .filter((r) => r.category)
      .sort((a, b) => b.relevance - a.relevance)

    // ── Resolve environment slugs from IDs ───────────────────────

    const environmentIds = userData.environment_ids ?? []
    let environmentSlugs: string[] = []
    if (environmentIds.length > 0) {
      const { data: envRows } = await supabase
        .from("environments")
        .select("slug")
        .in("id", environmentIds)
      environmentSlugs = (envRows ?? []).map((r: any) => r.slug)
    }

    // ── Build generation input ───────────────────────────────────

    const input: PlanGenerationInput = {
      sport_slug: userData.sport,
      preferred_workout_days: userData.preferred_workout_days,
      min_session_duration: userData.min_session_duration,
      max_session_duration: userData.max_session_duration,
      weekly_schedule: weeklySchedule,
      load_score,
      load_profile,
      environment_ids: environmentIds,
      environment_slugs: environmentSlugs,
      equipment_ids: userData.equipment_ids ?? [],
      category_levels: userData.category_levels ?? [],
      sport_required_categories: sportRequiredCategories,
      user_focus_categories: (userData.focus_categories ?? []).map(fc => ({
        category: fc.category_slug,
        priority: fc.priority,
      })),
      day_environments: userData.day_environments ?? [],
    }

    // ── Generate plan (no DB writes) ─────────────────────────────

    const plan = await generatePlan(input, supabase, openai)

    return new Response(JSON.stringify({ plan, load_score, load_profile }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    console.error("Error simulating plan:", err)
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
