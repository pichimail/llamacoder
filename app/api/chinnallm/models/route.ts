import { NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";
import { getAllEnabledModels, toPublicModel } from "@/lib/chinnallm/models";
import { rateLimitOrThrow } from "@/lib/rate-limit";

/** User-facing model list. NEVER returns openRouterId. */
export async function GET() {
  try {
    const user = await requireCurrentUser();
    await rateLimitOrThrow(`chinnallm-models:${user.id}`, { limit: 60, windowSeconds: 60 });
    const models = await getAllEnabledModels();
    return NextResponse.json({ models: models.map(toPublicModel) });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return NextResponse.json({ error: "Could not load ChinnaLLM models" }, { status: 500 });
  }
}
