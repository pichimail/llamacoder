export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "pichimail24@gmail.com")
  .trim()
  .toLowerCase();

export function isAdminEmail(email?: string | null) {
  return Boolean(email && email.trim().toLowerCase() === ADMIN_EMAIL);
}
