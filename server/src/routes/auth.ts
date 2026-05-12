import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { body, validationResult } from 'express-validator';
import { User, hashPassword } from '../models/User';
import { Transaction } from '../models/Transaction';
import { env } from '../config/env';
import { issueTokenPair, verifyToken } from '../services/jwt';
import { sendMail, verificationEmailTemplate, passwordResetTemplate } from '../services/email';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { newReference } from '../services/wallet';
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

/**
 * Welcome bonus is a per-currency table. Keep these modest — they're real
 * playable money once a payment provider is wired up.
 */
const WELCOME_BONUS: Partial<Record<FiatCurrency, number>> = {
  NGN: 1000, USD: 5, EUR: 5, GBP: 5, CAD: 7, AUD: 7,
  GHS: 50, KES: 500, ZAR: 80, ZMW: 100, RWF: 5000, UGX: 15000, TZS: 10000, EGP: 200,
  JPY: 500, INR: 400, BRL: 25, MXN: 100,
};
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
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { email, username, password } = req.body as { email: string; username: string; password: string };
    const countryCode = (req.body.countryCode as string | undefined)?.toUpperCase();
    const hintCurrency = (req.body.currency as string | undefined)?.toUpperCase();

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      res.status(409).json({ error: existing.email === email ? 'email_taken' : 'username_taken' });
      return;
    }

    const currency: FiatCurrency = (hintCurrency && isFiat(hintCurrency))
      ? hintCurrency
      : currencyForCountry(countryCode);
    const bonus = welcomeBonusFor(currency);

    const verificationToken = token32();
    const user = await User.create({
      email,
      username,
      passwordHash: await hashPassword(password),
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      currency,
      countryCode,
      balance: bonus,
      cryptoBalances: {},
    });

    if (bonus > 0) {
      await Transaction.create({
        userId:   user._id,
        kind:     'bonus',
        status:   'completed',
        method:   'internal',
        amount:   bonus,
        currency,
        reference: newReference('welcome'),
        notes:    `Welcome bonus — ${FIAT[currency].name}`,
        completedAt: new Date(),
      });
    }

    const link = `${env.clientUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    await sendMail({ to: email, ...verificationEmailTemplate(username, link) });

    const tokens = issueTokenPair(user._id.toString());
    res.status(201).json({ user: user.publicProfile(), ...tokens });
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

router.post('/logout', requireAuth, async (_req: Request, res: Response) => {
  res.json({ ok: true });
});

router.post(
  '/verify-email',
  body('token').isString().isLength({ min: 32, max: 128 }),
  body('email').isEmail().normalizeEmail(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { email, token } = req.body as { email: string; token: string };
    const user = await User.findOne({ email }).select('+emailVerificationToken +emailVerificationExpiresAt');
    if (!user || user.emailVerificationToken !== token) {
      res.status(400).json({ error: 'invalid_token' }); return;
    }
    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt < new Date()) {
      res.status(400).json({ error: 'expired_token' }); return;
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
  const tok = token32();
  user.emailVerificationToken = tok;
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  const link = `${env.clientUrl}/verify-email?token=${tok}&email=${encodeURIComponent(user.email)}`;
  await sendMail({ to: user.email, ...verificationEmailTemplate(user.username, link) });
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
