import { Router, type Request, type Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAdmin } from '../middleware/admin';
import { getRiskConfig, RiskConfig } from '../models/RiskConfig';
import { broadcast } from '../sockets/notifier';
import { currentRtp24h, liabilityByMarket, adjustedOverround } from '../services/risk';
import { BookingCode, generateCode } from '../models/BookingCode';
import { Promoter } from '../models/Promoter';
import { PromoCode, type PromoKind, type PromoTier } from '../models/PromoCode';
import { User } from '../models/User';
import { JobState } from '../models/JobState';
import { runCashbackOnce } from '../services/cashbackJob';
import { runDailySummaryOnce } from '../services/dailySummaryJob';
import { HouseLedger, ledgerKeyFor } from '../models/HouseLedger';
import { HousePayout } from '../models/HousePayout';
import { aggregateRange } from '../services/houseLedger';
import { AuditLog } from '../models/AuditLog';
import { auditFromReq } from '../services/audit';
import { sendMail } from '../services/email';
import { Transaction } from '../models/Transaction';
import { reconcileTransaction } from '../services/paymentReconcile';
import { settleForLeagueWeek } from '../services/virtualSportsScheduler';

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return true;
  res.status(400).json({ error: 'validation_error', details: errs.array() });
  return false;
}

// ─── Public game-config snapshot ─────────────────────────────────────────
// Surfaces the player-facing risk knobs (Crash bust shape, dice/plinko edges,
// slots RTP, etc.) so client games can read them at runtime. No auth — the
// values aren't sensitive (they affect outcome distributions, not RNG seeds),
// and games need them to start.
router.get('/public-game-config', async (_req: Request, res: Response) => {
  const config = await getRiskConfig();
  res.json({
    crash: {
      houseEdge:      config.crashHouseEdge,
      instaBustRate:  config.crashInstaBustRate,
      moonshotRate:   config.crashMoonshotRate,
    },
    dice:     { houseEdge: config.diceHouseEdge },
    plinko:   { houseEdge: config.plinkoHouseEdge },
    slots:    { rtp:       config.slotsRtp },
    mines:    { houseEdge: config.minesHouseEdge },
    roulette: { houseEdge: config.rouletteHouseEdge },
  });
});

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
  body('crashHouseEdge').optional().isFloat({ min: 0, max: 0.2 }),
  body('crashInstaBustRate').optional().isFloat({ min: 0, max: 0.5 }),
  body('crashMoonshotRate').optional().isFloat({ min: 0, max: 0.5 }),
  body('diceHouseEdge').optional().isFloat({ min: 0, max: 0.2 }),
  body('plinkoHouseEdge').optional().isFloat({ min: 0, max: 0.2 }),
  body('slotsRtp').optional().isFloat({ min: 0.7, max: 1 }),
  body('minesHouseEdge').optional().isFloat({ min: 0, max: 0.2 }),
  body('rouletteHouseEdge').optional().isFloat({ min: 0, max: 0.2 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const update = { ...req.body, updatedAt: new Date() };
    const cfg = await RiskConfig.findByIdAndUpdate(
      'singleton',
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    await auditFromReq(req, 'risk.update', 'risk_config', 'singleton', { update: req.body });
    // Notify connected clients (games) to refresh their public game config
    try { broadcast('public-game-config:updated'); } catch (e) { /* ignore */ }
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
    await auditFromReq(req, 'promoter.approve', 'user', userId, { commissionRate: update.commissionRate });
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
    await auditFromReq(req, 'promoter.ban', 'user', userId, { reason: req.body.reason });
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
    await auditFromReq(req, 'promoter.commission_update', 'user', req.params.userId, { update: req.body });
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
      await auditFromReq(req, 'promocode.create', 'promo_code', doc.code, { kind: doc.kind, tier: doc.tier });
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
    await auditFromReq(req, 'promocode.update', 'promo_code', doc.code, { update: req.body });
    res.json({ code: doc });
  },
);

router.delete(
  '/promo-codes/:code',
  requireAdmin,
  param('code').isString().isLength({ min: 3, max: 32 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const code = req.params.code.toUpperCase();
    await PromoCode.deleteOne({ code });
    await auditFromReq(req, 'promocode.delete', 'promo_code', code);
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
    await auditFromReq(req, 'cashback.run', 'system', undefined, { force: !!req.body.force, result });
    res.json(result);
  },
);

  // Manual virtual-sports settlement for testing: force-settle a league/week
  router.post(
    '/virtual-sports/settle',
    requireAdmin,
    body('leagueId').isString().isLength({ min: 1 }),
    body('week').isInt({ min: 1 }),
    async (req: Request, res: Response) => {
      if (!validate(req, res)) return;
      const { leagueId, week } = req.body;
      try {
        await settleForLeagueWeek(leagueId, Number(week));
        await auditFromReq(req, 'virtual_sports.settle', 'system', undefined, { leagueId, week });
        res.json({ ok: true, leagueId, week });
      } catch (err: any) {
        res.status(500).json({ error: 'settle_failed', details: String(err) });
      }
    },
  );

// ─── Audit log ───────────────────────────────────────────────────────────

router.get('/audit-log', requireAdmin, async (req: Request, res: Response) => {
  const limit  = Math.min(Number(req.query.limit) || 100, 500);
  const action = typeof req.query.action === 'string' ? req.query.action : undefined;
  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (req.query.before) filter.createdAt = { $lt: new Date(String(req.query.before)) };
  const rows = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ entries: rows });
});

// ─── Flagged referrals (anti-abuse review) ───────────────────────────────

router.get('/flagged-referrals', requireAdmin, async (_req: Request, res: Response) => {
  const rows = await User.find({ referralAbuseFlag: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(200)
    .select('email username createdAt countryCode referredBy referralAbuseFlag signupIp signupDeviceSignature totalWagered')
    .populate('referredBy', 'email username referralCode')
    .lean();
  res.json({ flagged: rows });
});

router.post(
  '/flagged-referrals/:userId/clear',
  requireAdmin,
  param('userId').isString().isLength({ min: 12 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    await User.findByIdAndUpdate(req.params.userId, { referralAbuseFlag: null });
    await auditFromReq(req, 'user.view', 'user', req.params.userId, { cleared_flag: true });
    res.json({ ok: true });
  },
);

// ─── User search + detail ───────────────────────────────────────────────

router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q || q.length < 2) { res.json({ users: [] }); return; }
  // Case-insensitive substring search; bounded to 50 results to keep this
  // affordable. Email exact match takes priority via $or.
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({
    $or: [{ email: rx }, { username: rx }, { referralCode: q.toUpperCase() }],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('email username createdAt currency countryCode totalWagered totalWon balance bonusBalance promoterStatus referralAbuseFlag')
    .lean();
  res.json({ users });
});

// Fetch all users with pagination (no search needed)
router.get('/users/all/paginated', requireAdmin, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const skip = (page - 1) * limit;

  const total = await User.countDocuments();
  const users = await User.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('_id email username createdAt currency countryCode totalWagered totalWon balance bonusBalance promoterStatus referralAbuseFlag')
    .lean();

  res.json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

router.get(
  '/users/:userId',
  requireAdmin,
  param('userId').isString().isLength({ min: 12 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const user = await User.findById(req.params.userId)
      .populate('referredBy', 'email username referralCode')
      .lean();
    if (!user) { res.status(404).json({ error: 'user_not_found' }); return; }
    await auditFromReq(req, 'user.view', 'user', req.params.userId);
    res.json({ user });
  },
);

// ─── Deposit reconciliation ──────────────────────────────────────────────
// When a Flutterwave deposit succeeds on their side but our webhook didn't
// process it (server downtime, signature mismatch, bad redirect URL, etc.)
// the customer sees their money on the FLW dashboard but their wallet stays
// at the pre-deposit balance. These endpoints let an admin recover those
// funds without double-crediting.

/** All deposit transactions still in `pending` state — the orphan pool. */
router.get('/payments/pending', requireAdmin, async (_req: Request, res: Response) => {
  const rows = await Transaction.find({ kind: 'deposit', status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('userId', 'email username currency')
    .lean();
  res.json({ rows });
});

router.post(
  '/payments/reconcile',
  requireAdmin,
  body('txRef').optional().isString().isLength({ min: 4, max: 128 }),
  body('flwTxId').optional().custom((v) => typeof v === 'string' || typeof v === 'number'),
  body('trustLocal').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    if (!req.body.txRef && !req.body.flwTxId) {
      res.status(400).json({ error: 'tx_ref_or_flw_tx_id_required' });
      return;
    }
    const result = await reconcileTransaction({
      txRef: req.body.txRef,
      flwTxId: req.body.flwTxId,
      trustLocal: !!req.body.trustLocal,
    });
    await auditFromReq(req, 'cashback.run', 'system', req.body.txRef ?? String(req.body.flwTxId ?? ''), {
      kind: 'deposit_reconcile',
      input: { txRef: req.body.txRef, flwTxId: req.body.flwTxId, trustLocal: !!req.body.trustLocal },
      result,
    });
    res.json(result);
  },
);

/** Sweep all pending deposit transactions and try to verify+credit each.
 *  Returns counts so the UI can show a summary. Errors on individual rows
 *  are collected, not thrown — one bad row shouldn't stop the rest. */
router.post('/payments/reconcile-sweep', requireAdmin, async (req: Request, res: Response) => {
  const rows = await Transaction.find({ kind: 'deposit', status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(200);
  const summary = {
    scanned: rows.length,
    credited: 0,
    alreadyCredited: 0,
    notSuccessful: 0,
    failed: 0,
    details: [] as Array<{ ref: string; status: string; message?: string }>,
  };
  for (const row of rows) {
    const r = await reconcileTransaction({ txRef: row.reference });
    summary.details.push({
      ref: row.reference,
      status: r.status,
      message: 'message' in r ? r.message : undefined,
    });
    if (r.ok && r.status === 'credited') summary.credited++;
    else if (r.ok && r.status === 'already_credited') summary.alreadyCredited++;
    else if (!r.ok && r.status === 'not_successful') summary.notSuccessful++;
    else summary.failed++;
  }
  await auditFromReq(req, 'cashback.run', 'system', undefined, {
    kind: 'deposit_reconcile_sweep',
    scanned: summary.scanned,
    credited: summary.credited,
  });
  res.json(summary);
});

// ─── House ledger + dashboard summary ────────────────────────────────────

/**
 * Aggregate stats for the admin home tile — today, last 7d, last 30d, plus
 * a 30-row daily series for the chart.
 */
router.get('/ledger/summary', requireAdmin, async (_req: Request, res: Response) => {
  const today = ledgerKeyFor();
  const yest = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yestKey = ledgerKeyFor(yest);
  const week  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
  const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [todayRow, yestRow, last7, last30, pendingPayouts, recentPayouts, series] = await Promise.all([
    HouseLedger.findById(today).lean(),
    HouseLedger.findById(yestKey).lean(),
    aggregateRange(ledgerKeyFor(week),  today),
    aggregateRange(ledgerKeyFor(month), today),
    HousePayout.countDocuments({ status: 'requested' }),
    HousePayout.find().sort({ createdAt: -1 }).limit(10).lean(),
    HouseLedger.find({ _id: { $gte: ledgerKeyFor(month) } }).sort({ _id: 1 }).lean(),
  ]);

  res.json({
    today: todayRow,
    yesterday: yestRow,
    last7: last7,
    last30: last30,
    pendingPayouts,
    recentPayouts,
    series,
  });
});

router.get('/ledger', requireAdmin, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 60, 365);
  const rows = await HouseLedger.find()
    .sort({ _id: -1 })
    .limit(limit)
    .lean();
  res.json({ rows });
});

router.post(
  '/jobs/daily-summary/run',
  requireAdmin,
  body('force').optional().isBoolean(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const result = await runDailySummaryOnce({ force: !!req.body.force });
    await auditFromReq(req, 'cashback.run', 'system', undefined, { job: 'daily_summary', force: !!req.body.force, result });
    res.json(result);
  },
);

// ─── House payouts (record-and-email; admin actions manually in FLW) ─────

router.get('/payouts', requireAdmin, async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  const rows = await HousePayout.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ payouts: rows });
});

router.post(
  '/payouts',
  requireAdmin,
  body('amountUsd').isFloat({ gt: 0 }),
  body('currency').optional().isString().isLength({ min: 3, max: 6 }),
  body('destination').optional().isObject(),
  body('notes').optional().isString().isLength({ max: 500 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const me = req.user!;
    const doc = await HousePayout.create({
      amountUsd: req.body.amountUsd,
      currency: (req.body.currency ?? 'NGN').toString().toUpperCase(),
      destination: req.body.destination ?? {},
      notes: req.body.notes,
      status: 'requested',
      requestedById: me._id,
      requestedByEmail: me.email,
    });
    await auditFromReq(req, 'cashback.run', 'system', doc._id.toString(), {
      kind: 'house_payout_request',
      amountUsd: req.body.amountUsd,
      currency: req.body.currency,
    });

    // Notify every admin so they can action the request in Flutterwave.
    const recipients = (process.env.ADMIN_EMAILS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const payoutId = doc._id.toString();
    const destStr = Object.keys(doc.destination ?? {}).length > 0
      ? `<pre style="background:#0a0c10;padding:10px;border-radius:6px;color:#cbd5e1;font-size:12px">${JSON.stringify(doc.destination, null, 2)}</pre>`
      : '<i style="color:#94a3b8">No destination details provided</i>';
    const html = `
<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;background:#0a0c10;color:#e2e8f0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#11151c;border:1px solid #1f2937;border-radius:12px;padding:24px">
    <h2 style="margin:0 0 4px 0">House payout requested</h2>
    <p style="color:#94a3b8;margin-top:0">By ${me.email}</p>
    <div style="font-size:28px;font-weight:900;color:#fbbf24;margin:18px 0">$${Number(req.body.amountUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    <p style="color:#cbd5e1;font-size:14px">Action this in the Flutterwave dashboard, then mark it completed in the admin console.</p>
    ${doc.notes ? `<p style="background:#1f293730;padding:12px;border-radius:8px;font-style:italic">${doc.notes}</p>` : ''}
    <div style="margin-top:14px"><div style="font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:6px">Destination</div>${destStr}</div>
    <p style="color:#64748b;font-size:12px;margin-top:18px">Payout ref: ${payoutId}</p>
  </div>
</body></html>`;
    // Fire-and-forget — don't block the response on slow SMTP.
    void Promise.all(recipients.map(to =>
      sendMail({ to, subject: `[Action needed] House payout $${Number(req.body.amountUsd).toFixed(2)}`, html }).catch(err => console.error('[payout] mail failed', to, err)),
    ));

    res.status(201).json({ payout: doc });
  },
);

router.patch(
  '/payouts/:id',
  requireAdmin,
  param('id').isString().isLength({ min: 12 }),
  body('status').optional().isIn(['requested', 'in_progress', 'completed', 'cancelled', 'failed']),
  body('flutterwaveReference').optional().isString().isLength({ max: 128 }),
  body('notes').optional().isString().isLength({ max: 500 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const me = req.user!;
    const update: Record<string, unknown> = {};
    if (req.body.status) update.status = req.body.status;
    if (req.body.flutterwaveReference) update.flutterwaveReference = req.body.flutterwaveReference;
    if (req.body.notes) update.notes = req.body.notes;
    if (req.body.status && ['completed', 'cancelled', 'failed'].includes(req.body.status)) {
      update.actionedById = me._id;
      update.actionedByEmail = me.email;
      update.actionedAt = new Date();
    }
    const doc = await HousePayout.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) { res.status(404).json({ error: 'payout_not_found' }); return; }
    await auditFromReq(req, 'cashback.run', 'system', req.params.id, {
      kind: 'house_payout_update',
      update: req.body,
    });
    res.json({ payout: doc });
  },
);

export default router;
