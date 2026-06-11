import type { Types } from 'mongoose';
import { User } from '../models/User';
import { Promoter } from '../models/Promoter';
import { toUsd, type AnyCurrency } from '../config/currencies';

/**
 * Promoter commission accrual.
 *
 * Hooked off bet settlement. Supports three models:
 *   • revenue_share — commissionRate × net gaming revenue (stake − payout) from
 *     each referred user's settled bet (only positive GGR accrues).
 *   • cpa           — a one-off bounty when a referred user becomes "active"
 *     (first settled bet), credited once via `referralRewardedAt`.
 *   • hybrid        — both of the above.
 *
 * All amounts are normalised to USD. Fire-and-forget from the settle path.
 */

export async function accrueOnSettlement(args: {
  bettorId: Types.ObjectId | string;
  stake: number;
  payout: number;
  currency: AnyCurrency;
}): Promise<void> {
  const user = await User.findById(args.bettorId).select('referredBy referralRewardedAt');
  if (!user?.referredBy) return;

  const promoter = await Promoter.findOne({ userId: user.referredBy, status: 'approved' });
  if (!promoter) return;

  const stakeUsd  = toUsd(args.stake, args.currency);
  const payoutUsd = toUsd(args.payout, args.currency);
  const ggrUsd    = Math.max(0, stakeUsd - payoutUsd); // house gross from this bet

  const inc: Record<string, number> = { totalWageredUsd: stakeUsd };

  // Revenue share on positive GGR.
  if ((promoter.commissionModel === 'revenue_share' || promoter.commissionModel === 'hybrid') && ggrUsd > 0) {
    inc.totalEarnedUsd = (inc.totalEarnedUsd ?? 0) + ggrUsd * promoter.commissionRate;
  }

  // CPA bounty — once per referred user, on first qualifying activity.
  let creditedCpa = false;
  if ((promoter.commissionModel === 'cpa' || promoter.commissionModel === 'hybrid')
      && promoter.cpaAmountUsd > 0 && !user.referralRewardedAt) {
    inc.totalEarnedUsd = (inc.totalEarnedUsd ?? 0) + promoter.cpaAmountUsd;
    inc.cpaCount = (inc.cpaCount ?? 0) + 1;
    creditedCpa = true;
  }

  // First settled bet → count as an active referral (once).
  if (!user.referralRewardedAt) inc.activeReferrals = (inc.activeReferrals ?? 0) + 1;

  await Promoter.updateOne({ _id: promoter._id }, { $inc: inc });

  if (creditedCpa || !user.referralRewardedAt) {
    user.referralRewardedAt = new Date();
    await user.save();
  }
}
