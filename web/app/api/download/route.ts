import { NextRequest, NextResponse } from "next/server";

const LEAD_SESSION_COOKIE = "jemp_lead_session";
const LEAD_STORE_CLICK_URL = "https://www.northbyte.studio/api/affiliate/lead/store-click";

export async function GET(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") || "";
  const isAndroid = /android/i.test(userAgent);
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  const playStoreUrl = "https://play.google.com/store/apps/details?id=studio.northbyte.jemp";
  const appStoreUrl = "https://apps.apple.com/app/id6762546573";

  // Affiliate funnel: a session that came in via /c/[code] heads to a store now.
  const sessionId = req.cookies.get(LEAD_SESSION_COOKIE)?.value;
  if (sessionId) {
    try {
      await fetch(LEAD_STORE_CLICK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appSlug: "jemp",
          sessionId,
          platform: isAndroid ? "android" : isIos ? "ios" : "desktop",
        }),
      });
    } catch (e) {
      console.error("[affiliate-lead] failed to mark store click", e);
    }
  }

  // Redirect Android to Google Play Store, everything else (iOS, Desktop, etc.) to iOS App Store as default fallback.
  const redirectUrl = isAndroid ? playStoreUrl : appStoreUrl;

  return NextResponse.redirect(redirectUrl, 302);
}
