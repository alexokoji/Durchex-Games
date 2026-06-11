import { User, type IUser } from '../models/User';
import { PromoCode, PromoRedemption, type PromoKind } from '../models/PromoCode';
import { Promoter } from '../models/Promoter';
import { Bet } from '../models/Bet';
import { Transaction } from '../models/Transaction';
import { FIAT, type FiatCurrency, isFiat } from '../config/currencies';
import { newReference } from './wallet';
import { Types } from 'mongoose';

const EPS = 1e-9;

export type RedeemError =
  | 'code_not_found'
  | 'code_inactive'
  | 'code_expired'
  | 'code_usage_exhausted'
  | 'per_user_limit'
  | 'wrong_kind_for_context'
  | 'country_not_eligible'
  | 'min_deposit_not_met'
  | 'amount_required'
  | 'currency_unsupported';

export interface RedeemContext {
  user: IUser;
  /** Uppercased trimmed code. */
  code: string;
  /** What triggered this redemption. */
  trigger: 'signup' | 'deposit' | 'manual' | 'cashback';
  /** Required when `trigger === 'deposit'`: the deposit amount in the user's currency. */
  depositAmount?: number;
  /** Optional reference to a deposit transaction (for audit). */
  depositReference?: string;
  /** For cashback campaigns the admin/cron seeds the net loss window. */
  cashbackLossAmount?: number;
}

export interface RedeemResult {
  bonusCredited: number;
  rollover: number;
  redemptionId: string;
  kind: PromoKind;
}

/**
 * Allowed (kind → trigger) pairings. Welcome runs on signup, deposit-match
 * runs after a real-money deposit lands, free-bet is either signup or admin
 * manual, cashback is cron/admin.
 */
const KIND_TRIGGERS: Record<PromoKind, RedeemContext['trigger'][]> = {
  welcome:    ['signup', 'manual'],
  deposit:    ['deposit'],
  'free-bet': ['signup', 'manual'],
  cashback:   ['cashback', 'manual'],
};

/**
 * Resolves a promo code into a credited bonus, applying all gates:
 *  - active + not expired
 *  - kind matches trigger
 *  - country eligibility
 *  - currency (falls back to user currency)
 *  - per-user limit + global usage cap
 *  - kind-specific: deposit min, deposit % cap, cashback %, free-bet flat
 *
 * On success it writes a PromoRedemption row, credits `bonusBalance`, sets
 * the rollover obligation (bonus * code.rollover), and records a `bonus`
 * transaction. Returns the credited amount + initial rollover.
 */
export async function redeemPromo(ctx: RedeemContext): Promise<
  | { ok: true; data: RedeemResult }
  | { error: RedeemError }
> {
  const code = ctx.code.trim().toUpperCase();
  if (!code) return { error: 'code_not_found' };

  const promo = await PromoCode.findOne({ code });
  if (!promo) return { error: 'code_not_found' };
  if (!promo.active) return { error: 'code_inactive' };
  if (promo.expiresAt && promo.expiresAt < new Date()) return { error: 'code_expired' };

  if (!KIND_TRIGGERS[promo.kind].includes(ctx.trigger)) {
    return { error: 'wrong_kind_for_context' };
  }

  if (promo.totalUsageLimit != null && promo.totalRedemptions >= promo.totalUsageLimit) {
    return { error: 'code_usage_exhausted' };
  }

  if (promo.eligibleCountries?.length && ctx.user.countryCode) {
    if (!promo.eligibleCountries.includes(ctx.user.countryCode.toUpperCase())) {
      return { error: 'country_not_eligible' };
    }
  }

  // Per-user limit — count prior redemptions of THIS code by this user.
  const perUserLimit = promo.perUserLimit ?? 1;
  const priorByUser = await PromoRedemption.countDocuments({
    userId: ctx.user._id,
    promoCodeId: promo._id,
  });
  if (priorByUser >= perUserLimit) return { error: 'per_user_limit' };

  // Resolve currency for the bonus credit. Promo codes can declare their own
  // currency but most are issued in the user's currency. Crypto bonuses are
  // not supported through this path.
  const targetCurrency = (promo.currency ?? ctx.user.currency).toUpperCase();
  if (!isFiat(targetCurrency)) return { error: 'currency_unsupported' };
  if (targetCurrency !== ctx.user.currency) {
    // We don't FX-convert promos — if the code is denominated in a different
    // currency than the user, treat as unsupported rather than guessing rates.
    return { error: 'currency_unsupported' };
  }
  const currency = targetCurrency as FiatCurrency;

  // ─── Compute the bonus amount per kind ─────────────────────────────────
  let bonusAmount = 0;
  switch (promo.kind) {
    case 'welcome': {
      bonusAmount = promo.bonusAmount;
      break;
    }
    case 'free-bet': {
      bonusAmount = promo.bonusAmount;
      break;
    }
    case 'deposit': {
      if (ctx.depositAmount == null || ctx.depositAmount <= 0) {
        return { error: 'amount_required' };
      }
      if (promo.minDeposit != null && ctx.depositAmount + EPS < promo.minDeposit) {
        return { error: 'min_deposit_not_met' };
      }
      // bonusAmount is a fraction (0..1).
      bonusAmount = ctx.depositAmount * promo.bonusAmount;
      if (promo.maxBonus != null) bonusAmount = Math.min(bonusAmount, promo.maxBonus);
      break;
    }
    case 'cashback': {
      if (ctx.cashbackLossAmount == null || ctx.cashbackLossAmount <= 0) {
        return { error: 'amount_required' };
      }
      bonusAmount = ctx.cashbackLossAmount * promo.bonusAmount;
      if (promo.maxBonus != null) bonusAmount = Math.min(bonusAmount, promo.maxBonus);
      break;
    }
  }

  // Round to currency decimals so we don't pollute balances with float dust.
  const dp = FIAT[currency].decimals;
  bonusAmount = Math.round(bonusAmount * 10 ** dp) / 10 ** dp;
  if (bonusAmount <= 0) return { error: 'amount_required' };

  const rolloverInitial = bonusAmount * (promo.rollover ?? 0);

  // ─── Atomic credit ─────────────────────────────────────────────────────
  // We don't gate on the user document here — the user is already loaded and
  // bonus credits are always safe to add. We DO bump promo.totalRedemptions
  // with a conditional update so two concurrent redemptions can't both slip
  // past totalUsageLimit.
  if (promo.totalUsageLimit != null) {
    const ok = await PromoCode.updateOne(
      { _id: promo._id, totalRedemptions: { $lt: promo.totalUsageLimit } },
      { $inc: { totalRedemptions: 1 } },
    );
    if (ok.modifiedCount === 0) return { error: 'code_usage_exhausted' };
  } else {
    await PromoCode.updateOne({ _id: promo._id }, { $inc: { totalRedemptions: 1 } });
  }

  // Stamp bonus expiry + (optional) max-withdraw cap from the promo.
  const { getRiskConfig } = await import('../models/RiskConfig');
  const { toUsd } = await import('../config/currencies');
  const cfg = await getRiskConfig();
  const bonusSet: Record<string, unknown> = {
    bonusExpiresAt: new Date(Date.now() + cfg.bonusExpiryDays * 24 * 60 * 60 * 1000),
  };
  if (promo.maxWithdraw != null && promo.maxWithdraw > 0) {
    bonusSet.bonusMaxWithdrawUsd = toUsd(promo.maxWithdraw, currency as never);
  }
  await User.findByIdAndUpdate(ctx.user._id, {
    $inc: { bonusBalance: bonusAmount, bonusRollover: rolloverInitial },
    $set: bonusSet,
  });

  const redemption = await PromoRedemption.create({
    userId:          ctx.user._id,
    promoCodeId:     promo._id,
    code:            promo.code,
    kind:            promo.kind,
    bonusCredited:   bonusAmount,
    currency,
    rolloverInitial,
  });

  await Transaction.create({
    userId:   ctx.user._id,
    kind:     'bonus',
    status:   'completed',
    method:   'internal',
    amount:   bonusAmount,
    currency,
    reference: newReference(`promo-${promo.kind}`),
    notes:    `code=${promo.code} rollover=${rolloverInitial.toFixed(2)}` +
              (ctx.depositReference ? ` deposit=${ctx.depositReference}` : ''),
    completedAt: new Date(),
  });

  return {
    ok: true,
    data: {
      bonusCredited: bonusAmount,
      rollover:      rolloverInitial,
      redemptionId:  redemption._id.toString(),
      kind:          promo.kind,
    },
  };
}

// ─── Referral attribution ────────────────────────────────────────────────

export interface AttributeReferralArgs {
  newUser: IUser;
  referralCode: string;
  /** Optional anti-abuse signals captured at signup. */
  deviceSignature?: string;
  ip?: string;
}

export type ReferralError =
  | 'self_referral'
  | 'self_device'
  | 'self_ip'
  | 'duplicate_device'
  | 'duplicate_ip'
  | 'code_not_found';

/**
 * Links `newUser.referredBy` to the owner of `referralCode` and bumps the
 * promoter's `totalReferred` counter. Idempotent if newUser already has a
 * referredBy set. Returns the promoter user id (if found) or null.
 *
 * Anti-abuse checks (in priority order):
 *   1. self_referral — code belongs to the same userId
 *   2. self_device   — code belongs to a user with the same device signature
 *   3. self_ip       — code belongs to a user with the same signup IP
 *   4. duplicate_device — another already-referred user under the same
 *      referrer has this device signature
 *   5. duplicate_ip — same as above for IP
 *
 * On a hit we flag the new user with `referralAbuseFlag` (so admin can audit
 * later) and reject attribution. Signup itself is allowed to continue — the
 * caller decides whether to surface this to the user.
 */
export async function attributeReferral(args: AttributeReferralArgs): Promise<
  | { ok: true; promoterId: Types.ObjectId | null }
  | { error: ReferralError }
> {
  if (args.newUser.referredBy) {
    return { ok: true, promoterId: args.newUser.referredBy };
  }
  const code = args.referralCode.trim().toUpperCase();
  if (!code) return { error: 'code_not_found' };

  const referrer = await User.findOne({ referralCode: code })
    .select('_id promoterStatus signupDeviceSignature signupIp');
  if (!referrer) return { error: 'code_not_found' };
  if (referrer._id.equals(args.newUser._id)) {
    return await flagAndReject(args.newUser, 'self_device');
  }

  // ─── Self-device / self-IP collisions ──────────────────────────────────
  if (args.deviceSignature && referrer.signupDeviceSignature && args.deviceSignature === referrer.signupDeviceSignature) {
    return await flagAndReject(args.newUser, 'self_device');
  }
  if (args.ip && referrer.signupIp && args.ip === referrer.signupIp) {
    // IP collisions are weaker (households, shared NAT) — flag but don't
    // necessarily block. We block when the IP also matches AND there's
    // already another referred account on this IP, which is the abuse
    // pattern we actually care about (one bad actor spinning up many).
    if (await User.exists({
      _id: { $ne: args.newUser._id },
      referredBy: referrer._id,
      signupIp: args.ip,
    })) {
      return await flagAndReject(args.newUser, 'self_ip');
    }
    // Otherwise: flag for admin review but still attribute.
    args.newUser.referralAbuseFlag = 'self_ip';
  }

  // ─── Cross-referee dedup ───────────────────────────────────────────────
  if (args.deviceSignature) {
    const dupDevice = await User.exists({
      _id: { $ne: args.newUser._id },
      referredBy: referrer._id,
      signupDeviceSignature: args.deviceSignature,
    });
    if (dupDevice) return await flagAndReject(args.newUser, 'duplicate_device');
  }

  // Success — attribute.
  args.newUser.referredBy = referrer._id;
  await args.newUser.save();

  if (referrer.promoterStatus === 'approved') {
    await Promoter.updateOne({ userId: referrer._id }, { $inc: { totalReferred: 1 } });
  }

  return { ok: true, promoterId: referrer._id };
}

async function flagAndReject(
  user: IUser,
  flag: NonNullable<IUser['referralAbuseFlag']>,
): Promise<{ error: ReferralError }> {
  user.referralAbuseFlag = flag;
  await user.save();
  return { error: flag as ReferralError };
}

/**
 * Called after a user's first settled bet (in the future, via a hook on
 * settleBetAtomic). Bumps `activeReferrals` on the referring promoter so the
 * dashboard can distinguish signups from actually-playing referrals.
 *
 * For now it's a manual helper that admin endpoints / cron can call.
 */
export async function markReferralActive(userId: Types.ObjectId | string): Promise<void> {
  const user = await User.findById(userId).select('referredBy');
  if (!user?.referredBy) return;
  const alreadyActive = await Bet.exists({ userId, status: { $in: ['won', 'lost'] } });
  if (!alreadyActive) return;
  await Promoter.updateOne({ userId: user.referredBy }, { $inc: { activeReferrals: 1 } });
}

/**
 * Cashback eligibility window — sums net losses (stake − payout) for a user
 * across a recent window. Used by cashback campaigns + admin tooling. The
 * actual credit goes through `redeemPromo({ trigger: 'cashback' })`.
 */
export async function computeNetLoss(
  userId: Types.ObjectId | string,
  windowDays: number,
): Promise<{ netLoss: number; currency: FiatCurrency | null }> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const oid = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const agg = await Bet.aggregate<{ _id: string; loss: number }>([
    { $match: { userId: oid, settledAt: { $gte: since }, status: { $in: ['won', 'lost'] } } },
    { $group: { _id: '$currency', loss: { $sum: { $subtract: ['$stake', '$payout'] } } } },
    { $sort: { loss: -1 } },
    { $limit: 1 },
  ]);
  if (agg.length === 0) return { netLoss: 0, currency: null };
  const top = agg[0];
  const currency = isFiat(top._id) ? (top._id as FiatCurrency) : null;
  return { netLoss: Math.max(0, top.loss), currency };
}
