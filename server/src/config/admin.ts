/**
 * Admin allowlist — comma-separated emails in the ADMIN_EMAILS env var.
 * Kept in `config/` (not `middleware/`) so model files can use it without
 * pulling in the auth middleware and causing import cycles.
 *
 * Emails are stored through express-validator's normalizeEmail() at signup
 * (lowercased; Gmail dots and +subaddress stripped). We normalise BOTH the
 * stored email and each ADMIN_EMAILS entry the same way before comparing, so
 * "John.Doe+ops@gmail.com" in ADMIN_EMAILS still matches the stored
 * "johndoe@gmail.com". Without this, a dot or capital silently breaks access.
 */
const GMAIL = new Set(['gmail.com', 'googlemail.com']);
const SUBADDRESS_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'yahoo.com', 'icloud.com', 'me.com',
]);

function normalizeForMatch(raw: string): string {
  const e = raw.trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 0) return e;
  let local = e.slice(0, at);
  let domain = e.slice(at + 1);
  if (GMAIL.has(domain)) { local = local.replace(/\./g, ''); domain = 'gmail.com'; }
  if (SUBADDRESS_PROVIDERS.has(domain)) local = local.split('+')[0];
  return `${local}@${domain}`;
}

function adminEmails(): Set<string> {
  const raw = (process.env.ADMIN_EMAILS ?? '').trim();
  return new Set(raw.split(',').map(normalizeForMatch).filter(Boolean));
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return adminEmails().has(normalizeForMatch(email));
}

/** Count of configured admin emails — for a safe startup diagnostic (no values logged). */
export function adminEmailCount(): number {
  return adminEmails().size;
}
