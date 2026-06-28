import { NextResponse } from "next/server";
import { ADMIN_EMAIL, isAdminRequest } from "@/lib/admin-auth";

export async function POST() {
  if (await isAdminRequest()) {
    return NextResponse.json({ ok: true, admin: true });
  }

  return NextResponse.json(
    {
      error: "Password admin login is disabled. Sign in with Google using the configured admin email.",
      adminEmail: ADMIN_EMAIL,
      signInUrl: "/api/auth/signin/google",
    },
    { status: 410 },
  );
}
