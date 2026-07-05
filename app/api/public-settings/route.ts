import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { hasAuthSecret, isGoogleConfigured } from "@/lib/auth";

export async function GET() {
  const s = await getSettings();
  const googleReady = isGoogleConfigured() && hasAuthSecret();
  return NextResponse.json({
    saasMode: s.saasMode === "on",
    googleAuth: s.googleAuth === "on" && googleReady,
    authRequired: s.saasMode === "on" && s.googleAuth === "on" && googleReady,
    gallery: s.gallery !== "off",
    // Bug fix: this was previously hardcoded to `false`, which silently
    // overrode whatever value an admin configured in Settings (and the
    // platform default) every single time. Auto-fix has a bounded retry
    // count (MAX_AUTO_FIX_ATTEMPTS) and a separate, tightly-capped
    // continuation loop for truncated generations, so it does not risk
    // runaway credit usage — it now correctly reflects the real setting.
    autoFixDefault: s.autoFixDefault !== "off",
  });
}
