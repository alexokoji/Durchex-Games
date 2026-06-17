import crypto from 'node:crypto';
import { env } from '../config/env';
import { User, hashPassword, type IUser } from '../models/User';

/**
 * Credential-based admin login. Credentials live in env (ADMIN_USERNAME /
 * ADMIN_PASSWORD / optional ADMIN_EMAIL). Env is the live source of truth for
 * the password (validated on every login), and a backing User document holds
 * the admin identity so the rest of the stack (req.user, audit, email hub)
 * works unchanged.
 */

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** True when username (or admin email) + password exactly match the env config. */
export function validateAdminCreds(username: string, password: string): boolean {
  if (!env.admin.enabled) return false;
  const u = (username ?? '').trim().toLowerCase();
  const userOk = u === env.admin.username.toLowerCase() || u === env.admin.email.toLowerCase();
  if (!userOk) return false;
  return timingSafeEqual(password ?? '', env.admin.password);
}

/** Upsert the backing admin user from env. Returns null when admin login is off. */
export async function ensureAdminUser(): Promise<IUser | null> {
  if (!env.admin.enabled) return null;
  let user = await User.findOne({ email: env.admin.email });
  if (!user) {
    user = await User.create({
      email:         env.admin.email,
      username:      env.admin.username,
      passwordHash:  await hashPassword(env.admin.password),
      isAdmin:       true,
      emailVerified: true,
      currency:      'USD',
      cryptoBalances: {},
    });
  } else if (!user.isAdmin) {
    user.isAdmin = true;
    await user.save();
  }
  return user;
}
