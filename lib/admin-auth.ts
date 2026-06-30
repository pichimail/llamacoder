import "server-only";

import { requireCurrentUser } from "@/lib/authz";
import { isAdminEmail } from "@/lib/admin-config";

export { ADMIN_EMAIL, isAdminEmail } from "@/lib/admin-config";

// Kept only so old logout code can clear the previous cookie during rollout.
export const ADMIN_COOKIE = "cc_admin";

export async function isAdminRequest() {
  try {
    const user = await requireCurrentUser();
    return user.isAdmin === true || isAdminEmail(user.email);
  } catch {
    return false;
  }
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();
  if (!user.isAdmin && !isAdminEmail(user.email)) {
    throw Object.assign(new Error("Admin required"), { status: 403 });
  }
  return user;
}

// Password admin login is intentionally disabled. Admin access is Google OAuth only.
export function adminToken() {
  return "";
}

export function verifyAdminCredentials() {
  return false;
}
