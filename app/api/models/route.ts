import { NextResponse } from "next/server";
import { getVisibleModels } from "@/lib/constants";

export async function GET() {
  const hasTogether = Boolean(process.env.TOGETHER_API_KEY);
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const models = getVisibleModels().map((model) => {
    const available = model.provider === "openrouter" ? hasOpenRouter : hasTogether;
    return {
      label: model.label,
      value: model.value,
      provider: model.provider,
      recommended: Boolean(model.recommended),
      status: available ? model.status || "ready" : "needs_key",
      available,
      description: model.description || "",
    };
  });
  return NextResponse.json({ models });
}

export const runtime = "nodejs";
