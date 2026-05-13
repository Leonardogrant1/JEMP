import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const authHeader = req.headers.get("Authorization")

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  // Resolve the calling user from their JWT
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("push_token, preferred_language, first_name")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404 })
  }

  if (!profile.push_token) {
    return new Response(JSON.stringify({ error: "No push token registered for this user" }), { status: 400 })
  }

  const lang = profile.preferred_language ?? "en"
  const title = lang === "de" ? "Test Notification" : "Test Notification"
  const body = lang === "de"
    ? `Hey ${profile.first_name ?? ""}! Push Notifications funktionieren 🎉`
    : `Hey ${profile.first_name ?? ""}! Push notifications are working 🎉`

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify([{
      to: profile.push_token,
      title,
      body,
      sound: "default",
      channelId: "default",
    }]),
  })

  if (!res.ok) {
    const text = await res.text()
    return new Response(JSON.stringify({ error: "Expo push failed", detail: text }), { status: 500 })
  }

  const result = await res.json()
  return new Response(JSON.stringify({ ok: true, expo: result }), {
    headers: { "Content-Type": "application/json" },
  })
})
