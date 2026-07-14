import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") || "";
  const isAndroid = /android/i.test(userAgent);
  const playStoreUrl = "https://play.google.com/store/apps/details?id=studio.northbyte.jemp";
  const appStoreUrl = "https://apps.apple.com/app/id6762546573";

  // Redirect Android to Google Play Store, everything else (iOS, Desktop, etc.) to iOS App Store as default fallback.
  const redirectUrl = isAndroid ? playStoreUrl : appStoreUrl;

  return NextResponse.redirect(redirectUrl, 302);
}
