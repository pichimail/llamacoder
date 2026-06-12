import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { isGoogleConfigured } from "@/lib/auth";

export async function GET() {
  const s = await getSettings();
  return NextResponse.json({
    saasMode: s.saasMode === "on",
    googleAuth: s.googleAuth === "on" && isGoogleConfigured(),
    gallery: s.gallery !== "off",
    autoFixDefault: s.autoFixDefault === "on",
  });
}
