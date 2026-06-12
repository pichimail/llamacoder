import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSettings, setSetting } from "@/lib/settings";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getSettings());
}

const schema = z.object({
  key: z.enum(["saasMode", "googleAuth", "gallery", "autoFixDefault"]),
  value: z.enum(["on", "off"]),
});

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    await setSetting(parsed.data.key, parsed.data.value);
  } catch (e) {
    return NextResponse.json(
      { error: "Settings table missing — run `npx prisma db push` once." },
      { status: 500 },
    );
  }
  return NextResponse.json(await getSettings());
}
