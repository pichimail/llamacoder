import { NextResponse } from "next/server";
import { isKieAiConfigured } from "@/lib/kie-ai";

export async function GET() {
  return NextResponse.json({
    configured: isKieAiConfigured(),
  });
}
