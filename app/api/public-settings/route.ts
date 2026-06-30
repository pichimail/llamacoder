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
    autoFixDefault: s.autoFixDefault === "on",
  });
}
