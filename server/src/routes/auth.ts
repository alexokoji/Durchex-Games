import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { body, validationResult } from 'express-validator';
import { User, hashPassword } from '../models/User';
import { Transaction } from '../models/Transaction';
import { env } from '../config/env';
import { issueTokenPair, verifyToken } from '../services/jwt';
import { sendMail, verificationCodeTemplate, passwordResetTemplate } from '../services/email';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { newReference } from '../services/wallet';
import { attributeReferral, redeemPromo } from '../services/promo';
import { currencyForCountry, isFiat, FIAT, type FiatCurrency } from '../config/currencies';

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return true;
  res.status(400).json({ error: 'validation_error', details: errs.array() });
  return false;
}

function token32(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** 6-digit numeric email-verification code, e.g. "048213". */
function code6(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}
const VERIFICATION_TTL_MS = 20 * 60 * 1000;

/**
 * Default welcome bonus, applied when the user signs up WITHOUT a promo code.
 * Goes into `bonusBalance` (not real balance), with a 5× wagering requirement.
 * Per-currency to give roughly equal value across regions.
 */
const WELCOME_BONUS: Partial<Record<FiatCurrency, number>> = {
  NGN: 1000, USD: 5, EUR: 5, GBP: 5, CAD: 7, AUD: 7,
  GHS: 50, KES: 500, ZAR: 80, ZMW: 100, RWF: 5000, UGX: 15000, TZS: 10000, EGP: 200,
  JPY: 500, INR: 400, BRL: 25, MXN: 100,
};
const DEFAULT_WELCOME_ROLLOVER = 5;
function welcomeBonusFor(currency: FiatCurrency): number {
  return WELCOME_BONUS[currency] ?? 0;
}

router.post(
  '/register',
  body('email').isEmail().normalizeEmail(),
  body('username').isString().isLength({ min: 3, max: 24 }).matches(/^[a-zA-Z0-9_.-]+$/),
  body('password').isString().isLength({ min: 8 }),
  body('countryCode').optional().isString().isLength({ min: 2, max: 2 }),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  body('referralCode').optional().isString().isLength({ min: 3, max: 32 }),
  body('promoCode').optional().isString().isLength({ min: 3, max: 32 }),
  body('deviceSignature').optional().isString().isLength({ min: 8, max: 64 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { email, username, password } = req.body as { email: string; username: string; password: string };
    const countryCode = (req.body.countryCode as string | undefined)?.toUpperCase();
    const hintCurrency = (req.body.currency as string | undefined)?.toUpperCase();
    const referralCode = (req.body.referralCode as string | undefined)?.trim().toUpperCase();
    const promoCode    = (req.body.promoCode    as string | undefined)?.trim().toUpperCase();
    const deviceSignature = (req.body.deviceSignature as string | undefined)?.trim();
    // `trust proxy` is set in index.ts so Express extracts the real IP from
    // the X-Forwarded-For chain; this is the value we hash against later.
    const signupIp = (req.ip ?? req.socket.remoteAddress ?? '').toString();

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      res.status(409).json({ error: existing.email === email ? 'email_taken' : 'username_taken' });
      return;
    }

    const currency: FiatCurrency = (hintCurrency && isFiat(hintCurrency))
      ? hintCurrency
      : currencyForCountry(countryCode);

    const verificationCode = code6();
    const user = await User.create({
      email,
      username,
      passwordHash: await hashPassword(password),
      emailVerificationToken: verificationCode,
      emailVerificationExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
      currency,
      countryCode,
      cryptoBalances: {},
      signupDeviceSignature: deviceSignature,
      signupIp: signupIp || undefined,
    });

    // ─── Referral attribution ────────────────────────────────────────────
    // Best-effort: if the inviter code is invalid we still let signup succeed.
    const referralResult: { applied: boolean; error?: string } = { applied: false };
    if (referralCode) {
      const r = await attributeReferral({
        newUser: user,
        referralCode,
        deviceSignature,
        ip: signupIp,
      });
      if ('ok' in r) referralResult.applied = true;
      else referralResult.error = r.error;
    }

    // ─── Promo code (welcome OR pending-on-first-deposit) ─────────────────
    // Some campaign codes are kind='deposit' (e.g. WELCOME50 → "50% of your
    // first deposit"). Those can't be redeemed at signup time because there's
    // no deposit amount yet — instead we stash the code on the user and the
    // deposit webhook drains it once a real top-up lands.
    let promoApplied: { code: string; bonus: number; rollover: number } | null = null;
    let pendingDepositPromo: string | null = null;
    if (promoCode) {
      const r = await redeemPromo({ user, code: promoCode, trigger: 'signup' });
      if ('ok' in r) {
        promoApplied = {
          code: promoCode,
          bonus: r.data.bonusCredited,
          rollover: r.data.rollover,
        };
      } else if (r.error === 'wrong_kind_for_context') {
        // Probably a deposit-match code — keep it for the first deposit.
        pendingDepositPromo = promoCode;
        user.pendingDepositPromo = promoCode;
        await user.save();
      }
    }
    if (!promoApplied) {
      const bonus = welcomeBonusFor(currency);
      if (bonus > 0) {
        const rollover = bonus * DEFAULT_WELCOME_ROLLOVER;
        user.bonusBalance  = (user.bonusBalance  ?? 0) + bonus;
        user.bonusRollover = (user.bonusRollover ?? 0) + rollover;
        await user.save();
        await Transaction.create({
          userId:   user._id,
          kind:     'bonus',
          status:   'completed',
          method:   'internal',
          amount:   bonus,
          currency,
          reference: newReference('welcome'),
          notes:    `Welcome bonus — ${FIAT[currency].name} (rollover ${rollover.toFixed(2)})`,
          completedAt: new Date(),
        });
        promoApplied = { code: 'WELCOME', bonus, rollover };
      }
    }

    await sendMail({ to: email, ...verificationCodeTemplate(username, verificationCode) });

    // Reload to surface the updated bonusBalance/rollover/referredBy in the response.
    const refreshed = await User.findById(user._id);
    const tokens = issueTokenPair(user._id.toString());
    res.status(201).json({
      user: refreshed?.publicProfile() ?? user.publicProfile(),
      ...tokens,
      referral: referralResult.applied ? { applied: true } : referralResult.error ? { applied: false, error: referralResult.error } : null,
      promo: promoApplied,
      pendingDepositPromo,
    });
  },
);

router.post(
  '/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { email, password } = req.body as { email: string; password: string };

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }
    user.lastLoginAt = new Date();
    await user.save();
    const tokens = issueTokenPair(user._id.toString());
    res.json({ user: user.publicProfile(), ...tokens });
  },
);

// Dedicated admin login — validates credentials against env (ADMIN_USERNAME /
// ADMIN_PASSWORD), then issues normal tokens for the backing admin user.
router.post(
  '/admin-login',
  body('username').isString().notEmpty(),
  body('password').isString().notEmpty(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { username, password } = req.body as { username: string; password: string };
    const { validateAdminCreds, ensureAdminUser } = await import('../services/adminAuth');
    if (!validateAdminCreds(username, password)) {
      res.status(401).json({ error: 'invalid_admin_credentials' });
      return;
    }
    const user = await ensureAdminUser();
    if (!user) { res.status(503).json({ error: 'admin_login_disabled' }); return; }
    user.lastLoginAt = new Date();
    await user.save();
    const tokens = issueTokenPair(user._id.toString());
    res.json({ user: user.publicProfile(), ...tokens });
  },
);

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) { res.status(400).json({ error: 'missing_refresh_token' }); return; }
  try {
    const payload = verifyToken(refreshToken);
    if (payload.type !== 'refresh') throw new HttpError(401, 'wrong_token_type');
    const user = await User.findById(payload.sub);
    if (!user) throw new HttpError(401, 'user_not_found');
    const tokens = issueTokenPair(user._id.toString());
    res.json({ user: user.publicProfile(), ...tokens });
  } catch {
    res.status(401).json({ error: 'invalid_refresh_token' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  res.json({ user: req.user!.publicProfile() });
});

/** Public VIP ladder — exposed so the VIP page can render thresholds + perks
 *  without re-importing the server module on the client. */
router.get('/vip-tiers', async (_req: Request, res: Response) => {
  const mod = await import('../services/vip');
  res.json({ tiers: mod.VIP_TIERS });
});

router.post('/logout', requireAuth, async (_req: Request, res: Response) => {
  res.json({ ok: true });
});

router.post(
  '/verify-email',
  // `token` carries the 6-digit code (the field name is kept for client compat).
  body('token').isString().trim().isLength({ min: 4, max: 128 }),
  body('email').isEmail().normalizeEmail(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { email, token } = req.body as { email: string; token: string };
    const code = token.trim();
    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpiresAt');
    if (!user) { res.status(400).json({ error: 'invalid_code' }); return; }
    if (user.emailVerified) { res.json({ ok: true }); return; }
    if (!user.emailVerificationToken || user.emailVerificationToken !== code) {
      res.status(400).json({ error: 'invalid_code' }); return;
    }
    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
      res.status(400).json({ error: 'expired_code' }); return;
    }
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    res.json({ ok: true });
  },
);

router.post('/resend-verification', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.emailVerified) { res.json({ ok: true }); return; }
  const code = code6();
  user.emailVerificationToken = code;
  user.emailVerificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
  await user.save();
  await sendMail({ to: user.email, ...verificationCodeTemplate(user.username, code) });
  res.json({ ok: true });
});

router.post(
  '/forgot-password',
  body('email').isEmail().normalizeEmail(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { email } = req.body as { email: string };
    const user = await User.findOne({ email });
    if (user) {
      const tok = token32();
      user.passwordResetToken = tok;
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      const link = `${env.clientUrl}/reset-password?token=${tok}&email=${encodeURIComponent(email)}`;
      await sendMail({ to: user.email, ...passwordResetTemplate(user.username, link) });
    }
    res.json({ ok: true });
  },
);

router.post(
  '/reset-password',
  body('email').isEmail().normalizeEmail(),
  body('token').isString().isLength({ min: 32, max: 128 }),
  body('newPassword').isString().isLength({ min: 8 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { email, token, newPassword } = req.body as { email: string; token: string; newPassword: string };
    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpiresAt +passwordHash');
    if (!user || user.passwordResetToken !== token) {
      res.status(400).json({ error: 'invalid_token' }); return;
    }
    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) {
      res.status(400).json({ error: 'expired_token' }); return;
    }
    user.passwordHash = await hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    res.json({ ok: true });
  },
);

export default router;
