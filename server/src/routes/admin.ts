import { Router, type Request, type Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAdmin } from '../middleware/admin';
import { getRiskConfig, RiskConfig } from '../models/RiskConfig';
import { currentRtp24h, liabilityByMarket, adjustedOverround } from '../services/risk';
import { BookingCode, generateCode } from '../models/BookingCode';
import { Promoter } from '../models/Promoter';
import { PromoCode, type PromoKind, type PromoTier } from '../models/PromoCode';
import { User } from '../models/User';
import { JobState } from '../models/JobState';
import { runCashbackOnce } from '../services/cashbackJob';

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return true;
  res.status(400).json({ error: 'validation_error', details: errs.array() });
  return false;
}

// ─── Risk dashboard ──────────────────────────────────────────────────────
router.get('/risk', requireAdmin, async (_req: Request, res: Response) => {
  const [config, rtp, exposure, overround] = await Promise.all([
    getRiskConfig(),
    currentRtp24h(),
    liabilityByMarket(),
    adjustedOverround(),
  ]);
  res.json({
    config,
    rtp24h: rtp,
    overround: { base: config.baseOverround, adjusted: overround },
    exposure,
  });
});

router.patch(
  '/risk',
  requireAdmin,
  body('rtpTargetMin').optional().isFloat({ min: 0.7, max: 1 }),
  body('rtpTargetMax').optional().isFloat({ min: 0.7, max: 1.1 }),
  body('baseOverround').optional().isFloat({ min: 1, max: 1.5 }),
  body('volatility').optional().isFloat({ min: 0.3, max: 2.5 }),
  body('drawRate').optional().isFloat({ min: 0.3, max: 2.5 }),
  body('upsetRate').optional().isFloat({ min: 0.3, max: 2.5 }),
  body('maxLiabilityUsd').optional().isFloat({ min: 1 }),
  body('maxUserConcentration').optional().isFloat({ min: 0.05, max: 1 }),
  body('bookingCodeDays').optional().isInt({ min: 1, max: 30 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const update = { ...req.body, updatedAt: new Date() };
    const cfg = await RiskConfig.findByIdAndUpdate(
      'singleton',
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.json({ config: cfg });
  },
);

// ─── Promo / influencer slip generator ───────────────────────────────────
//
// IMPORTANT: this mints a booking code — but it does NOT decide game
// outcomes. It picks a slip of selections the admin supplies (typically
// short-odds, high-probability outcomes) and packages them as a sharable
// code. The match engine remains independent.
router.post(
  '/promo-slip',
  requireAdmin,
  body('selections').isArray({ min: 1, max: 10 }),
  body('suggestedStake').optional().isFloat({ min: 0 }),
  body('currency').optional().isString().isLength({ min: 3, max: 6 }),
  body('label').isString().isLength({ min: 1, max: 64 }),
  body('expiresInHours').optional().isInt({ min: 1, max: 24 * 30 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const {
      selections, suggestedStake = 0, currency = 'USD', label,
      expiresInHours = 24 * 7,
    } = req.body;

    let code = '';
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateCode(6);
      const taken = await BookingCode.exists({ code: candidate });
      if (!taken) { code = candidate; break; }
    }
    if (!code) { res.status(500).json({ error: 'code_minting_failed' }); return; }

    const doc = await BookingCode.create({
      code,
      ownerId: null,
      selections,
      suggestedStake,
      currency,
      label,
      isPromo: true,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    });
    res.status(201).json({
      code: doc.code,
      label: doc.label,
      expiresAt: doc.expiresAt,
      selections: doc.selections.length,
    });
  },
);

router.get('/promo-slips', requireAdmin, async (_req: Request, res: Response) => {
  const promos = await BookingCode.find({ isPromo: true })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ promos });
});

router.delete('/promo-slips/:code', requireAdmin, async (req: Request, res: Response) => {
  const code = req.params.code.toUpperCase();
  await BookingCode.deleteOne({ code, isPromo: true });
  res.json({ ok: true });
});

// ─── Promoter management ─────────────────────────────────────────────────

router.get('/promoters', requireAdmin, async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const filter = status ? { status } : {};
  const rows = await Promoter.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('userId', 'email username countryCode referralCode')
    .lean();
  res.json({ promoters: rows });
});

router.post(
  '/promoters/:userId/approve',
  requireAdmin,
  param('userId').isString().isLength({ min: 12 }),
  body('commissionRate').optional().isFloat({ min: 0, max: 1 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { userId } = req.params;
    const update: Record<string, unknown> = {
      status: 'approved',
      approvedAt: new Date(),
      bannedAt: null,
      banReason: null,
    };
    if (req.body.commissionRate != null) update.commissionRate = req.body.commissionRate;
    const promoter = await Promoter.findOneAndUpdate({ userId }, update, { new: true });
    if (!promoter) { res.status(404).json({ error: 'promoter_not_found' }); return; }
    await User.findByIdAndUpdate(userId, { promoterStatus: 'approved' });
    res.json({ promoter });
  },
);

router.post(
  '/promoters/:userId/ban',
  requireAdmin,
  param('userId').isString().isLength({ min: 12 }),
  body('reason').optional().isString().isLength({ max: 500 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { userId } = req.params;
    const promoter = await Promoter.findOneAndUpdate(
      { userId },
      { status: 'banned', bannedAt: new Date(), banReason: req.body.reason ?? undefined },
      { new: true },
    );
    if (!promoter) { res.status(404).json({ error: 'promoter_not_found' }); return; }
    await User.findByIdAndUpdate(userId, { promoterStatus: 'banned' });
    // Deactivate the promoter's codes too.
    await PromoCode.updateMany({ promoterId: userId }, { active: false });
    res.json({ promoter });
  },
);

router.patch(
  '/promoters/:userId',
  requireAdmin,
  param('userId').isString().isLength({ min: 12 }),
  body('commissionRate').optional().isFloat({ min: 0, max: 1 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const update: Record<string, unknown> = {};
    if (req.body.commissionRate != null) update.commissionRate = req.body.commissionRate;
    if (Object.keys(update).length === 0) { res.status(400).json({ error: 'nothing_to_update' }); return; }
    const promoter = await Promoter.findOneAndUpdate({ userId: req.params.userId }, update, { new: true });
    if (!promoter) { res.status(404).json({ error: 'promoter_not_found' }); return; }
    res.json({ promoter });
  },
);

// ─── Promo code CRUD ─────────────────────────────────────────────────────

const PROMO_KINDS: PromoKind[] = ['welcome', 'deposit', 'free-bet', 'cashback'];
const PROMO_TIERS: PromoTier[] = ['public', 'influencer', 'vip', 'seasonal'];

router.get('/promo-codes', requireAdmin, async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.kind === 'string') filter.kind = req.query.kind;
  if (typeof req.query.tier === 'string') filter.tier = req.query.tier;
  if (typeof req.query.active === 'string') filter.active = req.query.active === 'true';
  const codes = await PromoCode.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('promoterId', 'email username')
    .lean();
  res.json({ codes });
});

router.post(
  '/promo-codes',
  requireAdmin,
  body('code').isString().isLength({ min: 3, max: 32 }).matches(/^[A-Z0-9_-]+$/i),
  body('kind').isIn(PROMO_KINDS),
  body('tier').optional().isIn(PROMO_TIERS),
  body('bonusAmount').isFloat({ min: 0 }),
  body('currency').optional().isString().isLength({ min: 3, max: 6 }),
  body('maxBonus').optional().isFloat({ min: 0 }),
  body('minDeposit').optional().isFloat({ min: 0 }),
  body('rollover').optional().isFloat({ min: 0 }),
  body('maxWithdraw').optional().isFloat({ min: 0 }),
  body('eligibleCountries').optional().isArray(),
  body('eligibleGames').optional().isArray(),
  body('promoterId').optional().isString(),
  body('totalUsageLimit').optional().isInt({ min: 0 }),
  body('perUserLimit').optional().isInt({ min: 0 }),
  body('expiresAt').optional().isISO8601(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    try {
      const doc = await PromoCode.create({
        ...req.body,
        code: String(req.body.code).toUpperCase(),
        currency: req.body.currency ? String(req.body.currency).toUpperCase() : undefined,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        totalRedemptions: 0,
      });
      res.status(201).json({ code: doc });
    } catch (err: any) {
      if (err?.code === 11000) { res.status(409).json({ error: 'code_already_exists' }); return; }
      throw err;
    }
  },
);

router.patch(
  '/promo-codes/:code',
  requireAdmin,
  param('code').isString().isLength({ min: 3, max: 32 }),
  body('active').optional().isBoolean(),
  body('bonusAmount').optional().isFloat({ min: 0 }),
  body('maxBonus').optional().isFloat({ min: 0 }),
  body('minDeposit').optional().isFloat({ min: 0 }),
  body('rollover').optional().isFloat({ min: 0 }),
  body('maxWithdraw').optional().isFloat({ min: 0 }),
  body('expiresAt').optional().isISO8601(),
  body('totalUsageLimit').optional().isInt({ min: 0 }),
  body('perUserLimit').optional().isInt({ min: 0 }),
  body('eligibleCountries').optional().isArray(),
  body('eligibleGames').optional().isArray(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const update = { ...req.body };
    if (update.expiresAt) update.expiresAt = new Date(update.expiresAt);
    const doc = await PromoCode.findOneAndUpdate(
      { code: req.params.code.toUpperCase() },
      update,
      { new: true },
    );
    if (!doc) { res.status(404).json({ error: 'code_not_found' }); return; }
    res.json({ code: doc });
  },
);

router.delete(
  '/promo-codes/:code',
  requireAdmin,
  param('code').isString().isLength({ min: 3, max: 32 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    await PromoCode.deleteOne({ code: req.params.code.toUpperCase() });
    res.json({ ok: true });
  },
);

// ─── Cashback job inspection / manual trigger ────────────────────────────

router.get('/jobs/cashback', requireAdmin, async (_req: Request, res: Response) => {
  const state = await JobState.findById('cashback_weekly').lean();
  res.json({
    state,
    cashbackCode: (process.env.CASHBACK_CODE ?? 'WEEKLY_CASHBACK').toUpperCase(),
  });
});

router.post(
  '/jobs/cashback/run',
  requireAdmin,
  body('force').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const result = await runCashbackOnce({ force: !!req.body.force });
    res.json(result);
  },
);

export default router;
