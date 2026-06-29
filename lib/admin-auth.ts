import "server-only";

import { ADMIN_EMAIL, isAdminEmail } from "@/lib/admin-config";
import { requireAdmin, AuthError } from "@/lib/authz";

export { ADMIN_EMAIL, isAdminEmail };

// Kept only so old logout code can clear the previous cookie during rollout.
export const ADMIN_COOKIE = "cc_admin";

export async function getAdminSession() {
  try {
    const user = await requireAdmin();
    return { user };
  } catch {
    return null;
  }
}

export async function isAdminRequest() {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

// Password admin login is intentionally disabled. Admin access is Google OAuth only.
export function adminToken() {
  return "";
}

export function verifyAdminCredentials() {
  return false;
}
