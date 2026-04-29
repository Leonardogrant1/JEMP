import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

const MESSAGES: Record<string, { title: (name: string) => string; body: (minutes: number | null) => string }> = {
  en: {
    title: (name) => `Today: ${name}`,
    body: (minutes) => minutes ? `${minutes} min · Time to get it done 💪` : "Time to get it done 💪",
  },
  de: {
    title: (name) => `Heute: ${name}`,
    body: (minutes) => minutes ? `${minutes} Min. · Zeit es anzugehen 💪` : "Zeit es anzugehen 💪",
  },
}

Deno.serve(async (req) => {
  // Allow cron calls (no user auth) but require service role key
  const authHeader = req.headers.get("Authorization")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!

  const expectedBearer = `Bearer ${serviceRoleKey}`
  if (!authHeader || authHeader !== expectedBearer) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Fetch all users with a push token and a scheduled session today
  const { data: rows, error } = await admin
    .from("workout_sessions")
    .select(`
      id,
      name,
      estimated_duration_minutes,
      user_id,
      user:user_profiles!inner (
        push_token,
        preferred_language
      )
    `)
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString())
    .lt("scheduled_at", new Date(new Date().setUTCHours(23, 59, 59, 999)).toISOString())
    .not("user_profiles.push_token", "is", null)

  if (error) {
    console.error("Query error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
  }

  const messages = rows.map((session: any) => {
    const lang = session.user?.preferred_language ?? "en"
    const template = MESSAGES[lang] ?? MESSAGES.en
    return {
      to: session.user.push_token,
      title: template.title(session.name),
      body: template.body(session.estimated_duration_minutes),
      data: { sessionId: session.id },
      sound: "default",
    }
  })

  // Expo Push API accepts up to 100 messages per request
  const chunks: typeof messages[] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  let totalSent = 0
  for (const chunk of chunks) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(chunk),
    })
    if (res.ok) totalSent += chunk.length
    else console.error("Expo push error:", await res.text())
  }

  return new Response(JSON.stringify({ sent: totalSent }), { status: 200 })
})
