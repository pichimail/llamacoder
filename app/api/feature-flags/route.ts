import { NextResponse } from "next/server";
import { getFeatureFlags } from "@/lib/feature-flags";

/** Public read: flag map for client gating. No auth — flags are not secrets. */
export async function GET() {
  const flags = await getFeatureFlags();
  return NextResponse.json({ flags }, { headers: { "Cache-Control": "no-store" } });
}
