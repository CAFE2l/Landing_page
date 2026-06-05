export const ADMIN_EMAILS = ["gutiajs@gmail.com"];

export function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
