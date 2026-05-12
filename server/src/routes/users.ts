import { Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { isFiat, currencyForCountry, type FiatCurrency } from '../config/currencies';
import { notifyWalletUpdate } from '../sockets/notifier';

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return true;
  res.status(400).json({ error: 'validation_error', details: errs.array() });
  return false;
}

/**
 * Set / update the user's preferred currency. Used by the frontend right
 * after geolocation kicks in, and again any time the user explicitly picks
 * a currency in settings.
 *
 * IMPORTANT: changing currency does NOT convert existing balance. We
 * snapshot the previous currency in the transaction log so the user can
 * see the change in their history. Conversion can be added later when we
 * support cross-currency swaps.
 */
router.patch(
  '/me/currency',
  requireAuth,
  body('currency').isString().isLength({ min: 3, max: 3 }),
  body('countryCode').optional().isString().isLength({ min: 2, max: 2 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const user = req.user!;
    const next = (req.body.currency as string).toUpperCase();
    if (!isFiat(next)) {
      res.status(400).json({ error: 'unsupported_currency' });
      return;
    }
    const prev = user.currency;
    if (prev !== next) {
      user.currency = next as FiatCurrency;
    }
    if (req.body.countryCode) user.countryCode = req.body.countryCode.toUpperCase();
    await user.save();
    if (prev !== next) notifyWalletUpdate(user._id.toString(), 'currency_changed');
    res.json({ user: user.publicProfile() });
  },
);

/**
 * Lightweight "detect my country" helper. The browser hits an external IP
 * geolocation service, but this endpoint lets the server suggest a currency
 * from the country it was given. Useful for testing and as a fallback.
 */
router.get('/me/suggest-currency', requireAuth, async (req: Request, res: Response) => {
  const country = typeof req.query.country === 'string' ? req.query.country : req.user!.countryCode;
  res.json({ country, currency: currencyForCountry(country) });
});

export default router;
