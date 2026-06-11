import { Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { SportEvent } from '../models/SportEvent';
import { Bet } from '../models/Bet';
import { placeBetAtomic } from '../services/wallet';
import { cashoutBetAtomic } from '../services/cashout';
import { LIVE_GAME_ID, liveCashoutInputs, type LiveSelection } from '../services/liveSports';
import { attributeBetToCode } from '../models/BookingCode';
import { toUsd, type AnyCurrency } from '../config/currencies';
import { notifyUser, notifyWalletUpdate } from '../sockets/notifier';

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return true;
  res.status(400).json({ error: 'validation_error', details: errs.array() });
  return false;
}

// ─── Catalogue ────────────────────────────────────────────────────────────

/** Distinct sports that currently have events. */
router.get('/sports', async (_req: Request, res: Response) => {
  const rows = await SportEvent.aggregate([
    { $match: { status: { $in: ['upcoming', 'live'] } } },
    { $group: { _id: { sportKey: '$sportKey', sportTitle: '$sportTitle' }, count: { $sum: 1 } } },
    { $sort: { '_id.sportTitle': 1 } },
  ]);
  res.json({
    sports: rows.map(r => ({ sportKey: r._id.sportKey, sportTitle: r._id.sportTitle, count: r.count })),
  });
});

/** Upcoming + live events, optionally filtered by ?sport=key. */
router.get('/events', async (req: Request, res: Response) => {
  const where: Record<string, unknown> = { status: { $in: ['upcoming', 'live'] } };
  if (typeof req.query.sport === 'string') where.sportKey = req.query.sport;
  const limit = Math.min(Number(req.query.limit) || 60, 200);
  const events = await SportEvent.find(where).sort({ commenceTime: 1 }).limit(limit).lean();
  res.json({ events });
});

router.get('/events/:id', async (req: Request, res: Response) => {
  const ev = await SportEvent.findOne({ providerId: req.params.id }).lean();
  if (!ev) { res.status(404).json({ error: 'event_not_found' }); return; }
  res.json({ event: ev });
});

// ─── Place a live-sports bet (single or multi) ─────────────────────────────

router.post(
  '/bet',
  requireAuth,
  body('stake').isFloat({ gt: 0 }),
  body('selections').isArray({ min: 1, max: 20 }),
  body('selections.*.eventId').isString(),
  body('selections.*.marketKey').isIn(['h2h', 'totals']),
  body('selections.*.outcomeName').isString(),
  body('selections.*.point').optional().isFloat(),
  body('fromCode').optional().isString().isLength({ max: 12 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const user = req.user!;
    const stake = Number(req.body.stake);
    const fromCode = typeof req.body.fromCode === 'string' ? req.body.fromCode : undefined;
    const raw = req.body.selections as Array<{ eventId: string; marketKey: string; outcomeName: string; point?: number }>;

    // Validate each leg against live odds and lock the price.
    const locked: LiveSelection[] = [];
    for (const sel of raw) {
      const ev = await SportEvent.findOne({ providerId: sel.eventId });
      if (!ev) { res.status(400).json({ error: 'event_not_found', eventId: sel.eventId }); return; }
      if (ev.suspended || ev.status === 'completed' || ev.status === 'settled') {
        res.status(409).json({ error: 'event_unavailable', eventId: sel.eventId }); return;
      }
      const market = ev.markets.find(m => m.key === sel.marketKey);
      if (!market || market.suspended) { res.status(409).json({ error: 'market_suspended' }); return; }
      const outcome = market.outcomes.find(o => o.name === sel.outcomeName && (sel.point == null || o.point === sel.point));
      if (!outcome) { res.status(400).json({ error: 'outcome_not_found' }); return; }
      locked.push({
        eventId: sel.eventId,
        label: `${ev.homeTeam} vs ${ev.awayTeam}`,
        marketKey: sel.marketKey,
        outcomeName: sel.outcomeName,
        point: outcome.point,
        price: outcome.price,
      });
    }

    // No duplicate events in an accumulator (related-contingency guard).
    if (locked.length > 1 && new Set(locked.map(l => l.eventId)).size !== locked.length) {
      res.status(400).json({ error: 'duplicate_event_in_multi' }); return;
    }

    const combined = locked.reduce((a, l) => a * l.price, 1);
    const mode = locked.length === 1 ? 'single' : 'multi';
    const gameName = locked.length === 1
      ? `${locked[0].label} · ${locked[0].outcomeName}`
      : `${locked.length}-leg multi`;

    const result = await placeBetAtomic({
      userId: user._id,
      currency: user.currency,
      gameId: LIVE_GAME_ID,
      gameName,
      stake,
      details: `${combined.toFixed(2)}× combined`,
      selections: locked,
      mode,
    });
    if ('error' in result) {
      res.status(result.error === 'insufficient_funds' ? 402 : 400).json({ error: result.error });
      return;
    }
    if (fromCode) void attributeBetToCode(fromCode, toUsd(stake, user.currency as AnyCurrency)).catch(() => {});
    notifyWalletUpdate(user._id.toString(), 'bet_placed');
    res.status(201).json({
      bet: result.bet, balance: result.balance, bonusBalance: result.bonusBalance,
      currency: user.currency, combinedOdds: combined,
    });
  },
);

/** Open (pending) live-sports bets for the user. */
router.get('/bets', requireAuth, async (req: Request, res: Response) => {
  const bets = await Bet.find({ userId: req.userId, gameId: LIVE_GAME_ID }).sort({ placedAt: -1 }).limit(100).lean();
  res.json({ bets });
});

// ─── Cash-out (server computes live valuation from current odds) ───────────

router.post('/bet/:id/cashout/quote', requireAuth, async (req: Request, res: Response) => {
  const bet = await Bet.findOne({ _id: req.params.id, userId: req.userId, gameId: LIVE_GAME_ID, status: 'pending' }).lean();
  if (!bet) { res.status(404).json({ error: 'bet_not_found' }); return; }
  const inputs = await liveCashoutInputs(bet);
  if ('error' in inputs) { res.status(409).json({ error: inputs.error }); return; }
  const { getRiskConfig } = await import('../models/RiskConfig');
  const { quoteCashout } = await import('../services/cashout');
  const cfg = await getRiskConfig();
  if (!cfg.cashoutEnabled) { res.status(403).json({ error: 'cashout_disabled' }); return; }
  const quote = quoteCashout({ ...inputs, stake: bet.stake }, cfg.cashoutMargin, cfg.maxCashoutMult);
  res.json({ quote, partialEnabled: cfg.partialCashoutEnabled, ...inputs });
});

router.post(
  '/bet/:id/cashout',
  requireAuth,
  body('fraction').optional().isFloat({ gt: 0, max: 1 }),
  async (req: Request, res: Response) => {
    const bet = await Bet.findOne({ _id: req.params.id, userId: req.userId, gameId: LIVE_GAME_ID, status: 'pending' }).lean();
    if (!bet) { res.status(404).json({ error: 'bet_not_found' }); return; }
    const inputs = await liveCashoutInputs(bet);
    if ('error' in inputs) { res.status(409).json({ error: inputs.error }); return; }

    const result = await cashoutBetAtomic({
      userId: req.userId!,
      betId: req.params.id,
      fraction: req.body.fraction != null ? Number(req.body.fraction) : 1,
      potentialReturn: inputs.potentialReturn,
      winProbability: inputs.winProbability,
    });
    if ('error' in result) {
      const code = result.error;
      const status = code === 'bet_not_found' ? 404 : code.endsWith('_disabled') ? 403 : 400;
      res.status(status).json({ error: code }); return;
    }
    const uid = req.userId!;
    notifyWalletUpdate(uid, 'bet_cashout');
    notifyUser(uid, {
      kind: 'bet:cashout',
      title: result.partial ? 'Partial cash-out' : 'Cashed out',
      body: `+${result.paid.toFixed(2)} ${result.bet.currency}`,
      data: { betId: result.bet._id.toString(), partial: result.partial },
    });
    res.json({ bet: result.bet, balance: result.balance, paid: result.paid, quote: result.quote, partial: result.partial });
  },
);

export default router;
