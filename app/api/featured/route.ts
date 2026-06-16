import { NextResponse } from "next/server";
import { getMergedFeaturedApps } from "@/lib/featured-apps-server";

export async function GET() {
  const apps = await getMergedFeaturedApps();
  return NextResponse.json({ apps });
}