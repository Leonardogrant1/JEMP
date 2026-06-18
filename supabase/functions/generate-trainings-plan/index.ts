import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

  // Verify user auth
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Create plan generation job
  const { data: job, error: insertError } = await supabase
    .from("plan_generation_jobs")
    .insert({ user_id: user.id, status: "pending" })
    .select("id")
    .single()

  if (insertError || !job) {
    return new Response(
      JSON.stringify({ error: `Failed to create job: ${insertError?.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }

  return new Response(
    JSON.stringify({ job_id: job.id }),
    { headers: { "Content-Type": "application/json" } },
  )
})
