import "server-only";

import { auth } from "@/lib/auth";
import { ADMIN_EMAIL, isAdminEmail } from "@/lib/admin-config";

export { ADMIN_EMAIL, isAdminEmail };

// Kept only so old logout code can clear the previous cookie during rollout.
export const ADMIN_COOKIE = "cc_admin";

export async function getAdminSession() {
  const session = await auth();
  return isAdminEmail(session?.user?.email) ? session : null;
}

export async function isAdminRequest() {
  return Boolean(await getAdminSession());
}

// Password admin login is intentionally disabled. Admin access is Google OAuth only.
export function adminToken() {
  return "";
}

export function verifyAdminCredentials() {
  return false;
}
