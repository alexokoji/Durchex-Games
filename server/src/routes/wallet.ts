import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { Transaction } from '../models/Transaction';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    currency:        user.currency,
    countryCode:     user.countryCode,
    balance:         user.balance,
    bonusBalance:    user.bonusBalance ?? 0,
    bonusRollover:   user.bonusRollover ?? 0,
    cryptoBalances:  user.cryptoBalances ?? {},
    totalWagered:    user.totalWagered,
    totalWon:        user.totalWon,
    vipLevel:        user.vipLevel,
    vipXp:           user.vipXp,
    referralCode:    user.referralCode,
    promoterStatus:  user.promoterStatus,
  });
});

router.get('/transactions', requireAuth, async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const cursor = req.query.before ? { createdAt: { $lt: new Date(String(req.query.before)) } } : {};
  const txs = await Transaction.find({ userId: req.userId, ...cursor })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ transactions: txs });
});

export default router;
