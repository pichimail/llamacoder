export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

export function isAdminEmail(email?: string | null) {
  if (!ADMIN_EMAIL) return false;
  return Boolean(email && email.trim().toLowerCase() === ADMIN_EMAIL);
}
