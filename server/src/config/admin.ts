/**
 * Admin allowlist — comma-separated emails in the ADMIN_EMAILS env var.
 * Kept in `config/` (not `middleware/`) so model files can use it without
 * pulling in the auth middleware and causing import cycles.
 */
function adminEmails(): Set<string> {
  const raw = (process.env.ADMIN_EMAILS ?? '').trim();
  return new Set(raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}
