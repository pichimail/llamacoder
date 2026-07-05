/** Shared admin guard (Phase 4). */
import { NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse } from "@/lib/authz";

export async function requireAdmin() {
  const user = await requireCurrentUser();
  if (!user.isAdmin) {
    const error: any = new Error("Admin access required");
    error.status = 403;
    throw error;
  }
  return user;
}

export function adminErrorResponse(error: unknown) {
  if (error && typeof error === "object" && (error as any).status === 403) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return authErrorResponse(error);
}
