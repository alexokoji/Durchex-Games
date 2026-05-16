import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { isAdminEmail } from '../config/admin';
import { requireAuth } from './auth';

/**
 * Admin gate — first runs `requireAuth`, then checks the user's email is
 * in the ADMIN_EMAILS allowlist (comma-separated, case-insensitive).
 * Add admin emails to server/.env:  ADMIN_EMAILS=ops@you.com,boss@you.com
 */
export { isAdminEmail };

function adminEmails(): Set<string> {
  const raw = (process.env.ADMIN_EMAILS ?? '').trim();
  return new Set(raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
  }).catch(() => undefined);
  if (!req.user) return;       // requireAuth has already sent the 401
  const allowed = adminEmails();
  if (allowed.size === 0) {
    // Lockdown mode — no admin emails configured = no admin access.
    res.status(403).json({ error: 'admin_not_configured' });
    return;
  }
  if (!allowed.has(req.user.email.toLowerCase())) {
    res.status(403).json({ error: 'admin_only' });
    return;
  }
  next();
  void env;
}
