import { NextRequest, NextResponse } from "next/server";

const CODE_PATTERN = /^[a-zA-Z0-9_-]{2,32}$/;
// Link-preview crawlers (TikTok, WhatsApp, etc.) — not real clicks.
const BOT_PATTERN = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|curl|wget/i;

const LEAD_SESSION_COOKIE = "jemp_lead_session";
const LEAD_VIEW_URL = "https://www.northbyte.studio/api/affiliate/lead/view";

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await ctx.params;
  const code = rawCode.toLowerCase();
  const response = NextResponse.redirect(new URL("/", req.url), 302);

  const userAgent = req.headers.get("user-agent") ?? "";
  if (!CODE_PATTERN.test(code) || BOT_PATTERN.test(userAgent)) {
    return response;
  }

  let sessionId = req.cookies.get(LEAD_SESSION_COOKIE)?.value;
  if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    sessionId = crypto.randomUUID();
  }
  response.cookies.set(LEAD_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  try {
    await fetch(LEAD_VIEW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appSlug: "jemp",
        affiliateCode: code,
        sessionId,
        referer: req.headers.get("referer") ?? undefined,
        country: req.headers.get("x-vercel-ip-country") ?? undefined,
      }),
    });
  } catch (e) {
    console.error("[affiliate-lead] failed to log view", e);
  }

  return response;
}
