import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getGenerationLogDashboard } from "@/lib/generation-observability";

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model") || undefined;
  const limit = Number(searchParams.get("limit") || 80);

  const dashboard = await getGenerationLogDashboard({ model, limit });
  return NextResponse.json(dashboard);
}
