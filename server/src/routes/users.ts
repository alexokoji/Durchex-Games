import { Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { isFiat, currencyForCountry, convert, type FiatCurrency } from '../config/currencies';
import { notifyWalletUpdate } from '../sockets/notifier';
import { Bet } from '../models/Bet';
import { Transaction } from '../models/Transaction';
import crypto from 'node:crypto';

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return true;
  res.status(400).json({ error: 'validation_error', details: errs.array() });
  return false;
}

/**
 * Set / update the user's preferred currency.
 *
 * When the currency actually changes (prev !== next):
 *   1. Rejects if the user has any pending (unsettled) bets — settling those
 *      bets would credit the OLD currency amount into the NEW balance, which
 *      would produce the wrong number.
 *   2. Converts balance and bonusBalance using static FX reference rates.
 *   3. Writes a 'swap' Transaction so the change is auditable.
 *
 * If this is just a first-time geo-sync (user.currency was already next, or
 * the call comes in right after signup) the balance is untouched.
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

    const prev = user.currency as FiatCurrency;

    if (prev !== next) {
      // Block currency switch while bets are unsettled — settling would
      // credit the old-currency payout to the new-currency balance at 1:1.
      const pendingCount = await Bet.countDocuments({ userId: user._id, status: 'pending' });
      if (pendingCount > 0) {
        res.status(409).json({
          error: 'currency_change_blocked_pending_bets',
          pendingCount,
        });
        return;
      }

      // Convert balance and bonus balance to the new currency.
      const newBalance      = parseFloat(convert(user.balance      ?? 0, prev, next as FiatCurrency).toFixed(8));
      const newBonusBalance = parseFloat(convert(user.bonusBalance  ?? 0, prev, next as FiatCurrency).toFixed(8));
      const newRollover     = parseFloat(convert(user.bonusRollover ?? 0, prev, next as FiatCurrency).toFixed(8));

      // Write a swap transaction as an audit trail (two records: debit old, credit new).
      const ref = crypto.randomBytes(8).toString('hex');
      await Transaction.create([
        {
          userId: user._id, kind: 'swap', status: 'completed', method: 'internal',
          amount: -(user.balance ?? 0), currency: prev,
          reference: `swap-debit-${ref}`,
          notes: `Currency swap ${prev}→${next}`,
          completedAt: new Date(),
        },
        {
          userId: user._id, kind: 'swap', status: 'completed', method: 'internal',
          amount: newBalance, currency: next,
          reference: `swap-credit-${ref}`,
          notes: `Currency swap ${prev}→${next}`,
          completedAt: new Date(),
        },
      ]);

      user.balance      = newBalance;
      user.bonusBalance = newBonusBalance;
      user.bonusRollover = newRollover;
      user.currency     = next as FiatCurrency;
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
