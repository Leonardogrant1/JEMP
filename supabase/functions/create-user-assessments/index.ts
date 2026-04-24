import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Call the DB function that creates assessments for all eligible users
    // and returns the user IDs that received new assessments
    const { data: userIds, error } = await supabase.rpc("fn_renew_assessments_for_all_users")

    if (error) throw error

    // TODO: Send push notifications to userIds here

    return new Response(
      JSON.stringify({
        users_notified: userIds?.length ?? 0,
        user_ids: userIds ?? [],
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (err: any) {
    console.error("Error creating user assessments:", err)
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
