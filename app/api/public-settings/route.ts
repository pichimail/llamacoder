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
    // Keep auto-fix opt-in. Silent automatic repair loops can burn API credits
    // when a generated artifact repeatedly fails in the preview sandbox.
    autoFixDefault: false,
  });
}
