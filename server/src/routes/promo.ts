import { Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { User } from '../models/User';
import { Promoter } from '../models/Promoter';
import { PromoCode, PromoRedemption } from '../models/PromoCode';
import { redeemPromo } from '../services/promo';

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return true;
  res.status(400).json({ error: 'validation_error', details: errs.array() });
  return false;
}

// ─── Promo redemption (user-claimed codes) ───────────────────────────────
//
// Welcome codes are handled inline by the register flow (so they apply BEFORE
// the user's first session). Everything else — deposit bonuses, free-bet
// codes, cashback claims — comes through here, where we re-load the user.
router.post(
  '/redeem',
  requireAuth,
  body('code').isString().isLength({ min: 3, max: 32 }),
  body('trigger').optional().isIn(['signup', 'deposit', 'manual', 'cashback']),
  body('depositAmount').optional().isFloat({ gt: 0 }),
  body('depositReference').optional().isString(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const user = req.user!;
    const { code, trigger = 'manual', depositAmount, depositReference } = req.body;

    const result = await redeemPromo({
      user, code, trigger, depositAmount, depositReference,
    });
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    const refreshed = await User.findById(user._id);
    res.json({
      ok: true,
      redemption: result.data,
      user: refreshed?.publicProfile(),
    });
  },
);

router.get('/redemptions', requireAuth, async (req: Request, res: Response) => {
  const rows = await PromoRedemption.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ redemptions: rows });
});

// ─── Promoter program (user-facing) ──────────────────────────────────────

router.post(
  '/promoter/apply',
  requireAuth,
  body('applicationMessage').optional().isString().isLength({ max: 1000 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const user = req.user!;
    if (user.promoterStatus === 'approved') {
      res.status(409).json({ error: 'already_approved' });
      return;
    }
    if (user.promoterStatus === 'banned') {
      res.status(403).json({ error: 'promoter_banned' });
      return;
    }
    if (user.promoterStatus === 'pending') {
      res.status(409).json({ error: 'already_pending' });
      return;
    }

    // Create / update a Promoter row in 'pending' state.
    await Promoter.findOneAndUpdate(
      { userId: user._id },
      {
        $setOnInsert: {
          userId:             user._id,
          status:             'pending',
          commissionRate:     0.20,
          totalReferred:      0,
          activeReferrals:    0,
          totalWageredUsd:    0,
          totalEarnedUsd:     0,
          paidOutUsd:         0,
          createdAt:          new Date(),
        },
        $set: {
          applicationMessage: req.body.applicationMessage ?? undefined,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    user.promoterStatus = 'pending';
    await user.save();
    res.status(201).json({ status: 'pending' });
  },
);

router.get('/promoter/me', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.promoterStatus === 'none') {
    res.status(404).json({ error: 'not_a_promoter', referralCode: user.referralCode });
    return;
  }
  const promoter = await Promoter.findOne({ userId: user._id }).lean();
  if (!promoter) {
    res.status(404).json({ error: 'promoter_not_found' });
    return;
  }

  // Codes owned by this promoter — short list.
  const codes = await PromoCode.find({ promoterId: user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Recent referrals (most recent 20 users that listed this user's id).
  const recentReferrals = await User.find({ referredBy: user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('username createdAt countryCode totalWagered')
    .lean();

  res.json({
    promoter: {
      status:           promoter.status,
      commissionRate:   promoter.commissionRate,
      totalReferred:    promoter.totalReferred,
      activeReferrals:  promoter.activeReferrals,
      totalWageredUsd:  promoter.totalWageredUsd,
      totalEarnedUsd:   promoter.totalEarnedUsd,
      paidOutUsd:       promoter.paidOutUsd,
      unpaidUsd:        Math.max(0, promoter.totalEarnedUsd - promoter.paidOutUsd),
      createdAt:        promoter.createdAt,
      approvedAt:       promoter.approvedAt,
    },
    referralCode: user.referralCode,
    codes,
    recentReferrals,
  });
});

export default router;
