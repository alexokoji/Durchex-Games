import { Router, type Request, type Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { BookingCode, generateCode } from '../models/BookingCode';

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return true;
  res.status(400).json({ error: 'validation_error', details: errs.array() });
  return false;
}

const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days
const MAX_SELECTIONS = 30;

/** Mint a new code for the current user's slip. */
router.post(
  '/',
  requireAuth,
  body('selections').isArray({ min: 1, max: MAX_SELECTIONS }),
  body('suggestedStake').optional().isFloat({ min: 0 }),
  body('currency').optional().isString().isLength({ min: 3, max: 6 }),
  body('label').optional().isString().isLength({ max: 64 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { selections, suggestedStake = 0, currency = 'USD', label } = req.body;

    // Try a few codes in case of (unlikely) collision.
    let code = '';
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateCode(6);
      const taken = await BookingCode.exists({ code: candidate });
      if (!taken) { code = candidate; break; }
    }
    if (!code) {
      res.status(500).json({ error: 'code_minting_failed' });
      return;
    }

    const doc = await BookingCode.create({
      code,
      ownerId: req.userId,
      selections,
      suggestedStake,
      currency,
      label,
      isPromo: false,
      expiresAt: new Date(Date.now() + DEFAULT_EXPIRY_MS),
    });
    res.status(201).json({
      code: doc.code,
      expiresAt: doc.expiresAt,
      selections: doc.selections.length,
    });
  },
);

/** Redeem a code — anyone can read (login optional so non-signed-in users
 *  can hydrate a slip locally and be prompted to sign in only on placement). */
router.get(
  '/:code',
  optionalAuth,
  param('code').isString().isLength({ min: 4, max: 12 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const code = req.params.code.toUpperCase();
    const doc = await BookingCode.findOne({ code });
    if (!doc) { res.status(404).json({ error: 'code_not_found' }); return; }
    if (doc.expiresAt < new Date()) {
      res.status(410).json({ error: 'code_expired' });
      return;
    }
    doc.redemptionCount += 1;
    await doc.save();

    res.json({
      code: doc.code,
      label: doc.label,
      isPromo: doc.isPromo,
      campaign: doc.campaign,
      selections: doc.selections,
      suggestedStake: doc.suggestedStake,
      currency: doc.currency,
      expiresAt: doc.expiresAt,
      redemptionCount: doc.redemptionCount,
    });
  },
);

/** Lightweight view ping — counts how many times a code link was opened. */
router.post(
  '/:code/view',
  optionalAuth,
  param('code').isString().isLength({ min: 4, max: 12 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    await BookingCode.updateOne({ code: req.params.code.toUpperCase() }, { $inc: { views: 1 } });
    res.json({ ok: true });
  },
);

export default router;
