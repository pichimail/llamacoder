import "server-only";
import { createHash } from "crypto";
import { cookies } from "next/headers";

const ADMIN_ID = process.env.ADMIN_ID || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123456";
const SECRET = process.env.AUTH_SECRET || "chinna-coder-dev-secret";

export const ADMIN_COOKIE = "cc_admin";

export function adminToken() {
  return createHash("sha256")
    .update(`${ADMIN_ID}:${ADMIN_PASSWORD}:${SECRET}`)
    .digest("hex");
}

export function verifyAdminCredentials(id: string, password: string) {
  return id === ADMIN_ID && password === ADMIN_PASSWORD;
}

export async function isAdminRequest() {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminToken();
}
