import { Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { Bet } from '../models/Bet';
import { placeBetAtomic, settleBetAtomic } from '../services/wallet';
import { notifyUser, notifyWalletUpdate } from '../sockets/notifier';

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return true;
  res.status(400).json({ error: 'validation_error', details: errs.array() });
  return false;
}

// ─── place a bet ──────────────────────────────────────────────────────────
//
// Stake is denominated in the USER's currency — we never trust a client-sent
// currency code. This eliminates a class of "place in NGN, settle in USD"
// exploits and keeps the wallet model simple.
router.post(
  '/',
  requireAuth,
  body('gameId').isString().isLength({ min: 1, max: 64 }),
  body('gameName').isString().isLength({ min: 1, max: 64 }),
  body('stake').isFloat({ gt: 0 }),
  body('details').optional().isString().isLength({ max: 240 }),
  body('selections').optional(),
  body('mode').optional().isIn(['single', 'multi', 'system']),
  body('systemK').optional().isInt({ min: 2 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const user = req.user!;
    const { gameId, gameName, stake, details, selections, mode, systemK } = req.body;

    console.log('[POST /bets] Received bet placement:', {
      userId: user._id.toString(),
      gameId,
      gameName,
      stake,
      mode,
      systemK,
      selectionsCount: selections ? (Array.isArray(selections) ? selections.length : Object.keys(selections).length) : 0,
      selectionsType: selections ? typeof selections : 'undefined',
      selectionsValue: selections ? JSON.stringify(selections).substring(0, 200) : 'undefined',
    });

    const result = await placeBetAtomic({
      userId: user._id,
      currency: user.currency,
      gameId, gameName, stake, details, selections, mode, systemK,
    });

    if ('error' in result) {
      const status = result.error === 'insufficient_funds' ? 402 : 400;
      res.status(status).json({ error: result.error });
      return;
    }

    notifyWalletUpdate(user._id.toString(), 'bet_placed');
    res.status(201).json({
      bet: result.bet,
      balance: result.balance,
      bonusBalance: result.bonusBalance,
      currency: user.currency,
    });
  },
);

// ─── settle a bet ────────────────────────────────────────────────────────
router.post(
  '/:id/settle',
  requireAuth,
  body('won').isBoolean(),
  body('payout').isFloat({ min: 0 }),
  body('multiplier').optional().isFloat({ min: 0 }),
  body('details').optional().isString().isLength({ max: 240 }),
  body('selectionResults').optional(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const { won, payout, multiplier, details, selectionResults } = req.body;
    const result = await settleBetAtomic({
      userId: req.userId!,
      betId:  req.params.id,
      won, payout, multiplier, details, selectionResults,
    });
    if ('error' in result) {
      res.status(404).json({ error: result.error });
      return;
    }
    const userId = req.userId!;
    notifyWalletUpdate(userId, 'bet_settled');
    if (won && payout > 0) {
      notifyUser(userId, {
        kind: 'bet:settled',
        title: `Won ${result.bet.gameName}`,
        body: `+${(result.bet.payout - result.bet.stake).toFixed(2)} ${result.bet.currency}`,
        data: { betId: result.bet._id.toString(), gameId: result.bet.gameId, currency: result.bet.currency },
      });
    }
    res.json({ bet: result.bet, balance: result.balance });
  },
);

router.get('/history', requireAuth, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const gameId = typeof req.query.gameId === 'string' ? req.query.gameId : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const where: Record<string, unknown> = { userId: req.userId };
  if (gameId) where.gameId = gameId;
  if (status) where.status = status;
  const bets = await Bet.find(where).sort({ placedAt: -1 }).limit(limit).lean();
  res.json({ bets });
});

router.get('/pending', requireAuth, async (req: Request, res: Response) => {
  const bets = await Bet.find({ userId: req.userId, status: 'pending' }).sort({ placedAt: -1 }).lean();
  res.json({ bets });
});

export default router;
