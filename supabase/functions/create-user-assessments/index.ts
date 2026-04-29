import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

const MESSAGES: Record<string, { title: string; body: string }> = {
  en: { title: "New assessments available 📊", body: "Check your progress and update your scores." },
  de: { title: "Neue Assessments verfügbar 📊", body: "Überprüfe deinen Fortschritt und aktualisiere deine Werte." },
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const admin = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Call the DB function that creates assessments for all eligible users
    // and returns the user IDs that received new assessments
    const { data: userIds, error } = await admin.rpc("fn_renew_assessments_for_all_users")
    if (error) throw error

    if (!userIds || userIds.length === 0) {
      return new Response(JSON.stringify({ users_notified: 0 }), { headers: { "Content-Type": "application/json" } })
    }

    // Fetch push tokens + language for affected users
    const { data: profiles, error: profileError } = await admin
      .from("user_profiles")
      .select("id, push_token, preferred_language")
      .in("id", userIds)
      .not("push_token", "is", null)

    if (profileError) throw profileError

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ users_notified: 0 }), { headers: { "Content-Type": "application/json" } })
    }

    const messages = profiles.map((p: any) => {
      const msg = MESSAGES[p.preferred_language ?? "en"] ?? MESSAGES.en
      return {
        to: p.push_token,
        title: msg.title,
        body: msg.body,
        data: { screen: "assessments" },
        sound: "default",
      }
    })

    // Expo Push API accepts up to 100 messages per request
    let totalSent = 0
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100)
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(chunk),
      })
      if (res.ok) totalSent += chunk.length
      else console.error("Expo push error:", await res.text())
    }

    return new Response(
      JSON.stringify({ users_notified: totalSent }),
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
