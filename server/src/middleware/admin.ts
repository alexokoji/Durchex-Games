import type { Request, Response, NextFunction } from 'express';
import { isAdminEmail, adminEmailCount } from '../config/admin';
import { requireAuth } from './auth';

/**
 * Admin gate — first runs `requireAuth`, then checks the user's email is in
 * the ADMIN_EMAILS allowlist. Matching is normalization-aware (see
 * `config/admin`), so dots/+tags/case in ADMIN_EMAILS don't break access.
 * Add admin emails to server/.env:  ADMIN_EMAILS=ops@you.com,boss@you.com
 */
export { isAdminEmail };

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
  }).catch(() => undefined);
  if (!req.user) return;       // requireAuth has already sent the 401
  if (adminEmailCount() === 0) {
    // Lockdown mode — no admin emails configured = no admin access.
    res.status(403).json({ error: 'admin_not_configured' });
    return;
  }
  if (!isAdminEmail(req.user.email)) {
    res.status(403).json({ error: 'admin_only' });
    return;
  }
  next();
}
