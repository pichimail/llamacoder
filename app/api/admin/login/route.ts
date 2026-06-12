import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminCredentials, adminToken, ADMIN_COOKIE } from "@/lib/admin-auth";

const schema = z.object({ id: z.string().min(1), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { id, password } = parsed.data;
  if (!verifyAdminCredentials(id, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
