import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import { User } from '../models/User';
import { Bet, type IBet } from '../models/Bet';
import { Transaction } from '../models/Transaction';
import { getRiskConfig } from '../models/RiskConfig';
import { recordBetSettlement } from './houseLedger';

const EPS = 1e-9;
function ref(): string { return crypto.randomBytes(4).toString('hex'); }

// ─── Cash-out valuation ──────────────────────────────────────────────────────

export interface CashoutQuoteInput {
  /** Max return if the remaining bet wins = stake × combined odds. */
  potentialReturn: number;
  /** Live win probability of the remaining selection(s), 0..1, from the
   *  client's deterministic match engine (same source it uses to settle). */
  winProbability: number;
  /** Current stake still live on the bet (after any prior partial cash-outs). */
  stake: number;
}

export interface CashoutQuote {
  /** Fair (pre-margin) value of the live bet right now. */
  fairValue: number;
  /** Value actually offered to the user (fair × (1 − margin)), clamped. */
  cashoutValue: number;
  margin: number;
}

/**
 * Server-authoritative cash-out valuation. Never rigs outcomes — it prices the
 * live ticket using the current win probability and applies a configurable
 * house margin, clamped so it can never exceed the bet's max return or a sanity
 * multiple of the stake.
 *
 *   fairValue    = potentialReturn × winProbability
 *   cashoutValue = fairValue × (1 − cashoutMargin)
 *   clamp to [0, min(potentialReturn, stake × maxCashoutMult)]
 */
export function quoteCashout(input: CashoutQuoteInput, margin: number, maxMult: number): CashoutQuote {
  const p   = Math.max(0, Math.min(1, input.winProbability));
  const ret = Math.max(0, input.potentialReturn);
  const cap = Math.min(ret, Math.max(0, input.stake) * maxMult);

  const fairValue    = Math.min(ret, ret * p);
  const cashoutValue = Math.max(0, Math.min(cap, fairValue * (1 - margin)));
  return { fairValue, cashoutValue, margin };
}

// ─── Atomic cash-out ─────────────────────────────────────────────────────────

export interface CashoutArgs {
  userId: Types.ObjectId | string;
  betId:  Types.ObjectId | string;
  /** 1 = full cash-out; 0<f<1 = partial. */
  fraction: number;
  potentialReturn: number;
  winProbability: number;
}

export type CashoutResult =
  | { ok: true; bet: IBet; balance: number; paid: number; quote: CashoutQuote; partial: boolean }
  | { error: 'bet_not_found' | 'bet_already_settled' | 'cashout_disabled' | 'partial_disabled' | 'invalid_fraction' };

/**
 * Cash out a live (pending) bet — full or partial.
 *
 * Full   : pays the quoted value, status → 'cashout', credits real balance.
 * Partial: pays fraction × quoted value, reduces the remaining stake (and its
 *          bonus portion) proportionally, leaves the bet 'pending' so the rest
 *          can still win/lose. Cumulative cash-out is tracked on the bet.
 *
 * Cash-out winnings always credit the REAL (withdrawable) balance, like any
 * payout — consistent with the bonus-wallet rule.
 */
export async function cashoutBetAtomic(args: CashoutArgs): Promise<CashoutResult> {
  const cfg = await getRiskConfig();
  if (!cfg.cashoutEnabled) return { error: 'cashout_disabled' };

  const f = args.fraction;
  if (!(f > 0 && f <= 1)) return { error: 'invalid_fraction' };
  const isPartial = f < 1 - EPS;
  if (isPartial && !cfg.partialCashoutEnabled) return { error: 'partial_disabled' };

  // Lock the row: only a still-pending bet can be cashed out.
  const bet = await Bet.findOne({ _id: args.betId, userId: args.userId, status: 'pending' });
  if (!bet) {
    const exists = await Bet.findOne({ _id: args.betId, userId: args.userId }).select('status');
    return { error: exists ? 'bet_already_settled' : 'bet_not_found' };
  }

  const liveStake = bet.stake;
  const quote = quoteCashout(
    { potentialReturn: args.potentialReturn, winProbability: args.winProbability, stake: liveStake },
    cfg.cashoutMargin,
    cfg.maxCashoutMult,
  );

  const paid = isPartial ? quote.cashoutValue * f : quote.cashoutValue;

  if (isPartial) {
    // Reduce remaining stake & its bonus portion; keep bet live.
    const remainingStake = liveStake * (1 - f);
    const remainingBonus = (bet.bonusStake ?? 0) * (1 - f);
    const updated = await Bet.findOneAndUpdate(
      { _id: bet._id, status: 'pending' },
      {
        $set: {
          stake: remainingStake,
          bonusStake: remainingBonus,
          originalStake: bet.originalStake ?? liveStake,
          cashedOutAt: new Date(),
        },
        $inc: { cashoutAmount: paid, cashoutFraction: f },
      },
      { new: true },
    );
    if (!updated) return { error: 'bet_already_settled' };

    const credited = await User.findByIdAndUpdate(
      args.userId,
      { $inc: { balance: paid, totalWon: Math.max(0, paid) } },
      { new: true },
    );
    await Transaction.create({
      userId: args.userId, kind: 'bet_payout', status: 'completed', method: 'internal',
      amount: paid, currency: bet.currency, reference: `cashout-${bet._id}-${ref()}`,
      betId: bet._id, notes: `partial_cashout fraction=${f.toFixed(4)}`, completedAt: new Date(),
    });
    void recordBetSettlement({ stake: liveStake * f, payout: paid, currency: bet.currency });
    return { ok: true, bet: updated, balance: credited?.balance ?? 0, paid, quote, partial: true };
  }

  // Full cash-out — settle the bet.
  const settled = await Bet.findOneAndUpdate(
    { _id: bet._id, status: 'pending' },
    {
      $set: {
        status: 'cashout',
        payout: paid,
        originalStake: bet.originalStake ?? liveStake,
        cashedOutAt: new Date(),
        settledAt: new Date(),
      },
      $inc: { cashoutAmount: paid, cashoutFraction: f },
    },
    { new: true },
  );
  if (!settled) return { error: 'bet_already_settled' };

  let newBalance = 0;
  if (paid > 0) {
    const credited = await User.findByIdAndUpdate(
      args.userId,
      { $inc: { balance: paid, totalWon: Math.max(0, paid - liveStake) } },
      { new: true },
    );
    newBalance = credited?.balance ?? 0;
    await Transaction.create({
      userId: args.userId, kind: 'bet_payout', status: 'completed', method: 'internal',
      amount: paid, currency: bet.currency, reference: `cashout-${bet._id}-${ref()}`,
      betId: bet._id, notes: 'full_cashout', completedAt: new Date(),
    });
  } else {
    const u = await User.findById(args.userId).select('balance');
    newBalance = u?.balance ?? 0;
  }
  void recordBetSettlement({ stake: liveStake, payout: paid, currency: bet.currency });
  return { ok: true, bet: settled, balance: newBalance, paid, quote, partial: false };
}

// ─── Void / Refund (admin) ───────────────────────────────────────────────────

export type ReverseResult =
  | { ok: true; bet: IBet; balance: number; refunded: number }
  | { error: 'bet_not_found' | 'bet_already_settled' };

/**
 * Reverse a pending bet: return the stake to the exact pots it came from
 * (real + bonus), restore the bonus rollover the stake had cleared, and mark
 * the bet `void` (cancelled / error) or `refunded` (event scrubbed).
 */
export async function reverseBetAtomic(
  userId: Types.ObjectId | string,
  betId: Types.ObjectId | string,
  status: 'void' | 'refunded',
  reason?: string,
): Promise<ReverseResult> {
  const bet = await Bet.findOneAndUpdate(
    { _id: betId, userId, status: 'pending' },
    { $set: { status, settledAt: new Date(), reverseReason: reason } },
    { new: true },
  );
  if (!bet) {
    const exists = await Bet.findOne({ _id: betId, userId }).select('status');
    return { error: exists ? 'bet_already_settled' : 'bet_not_found' };
  }

  const bonusStake = bet.bonusStake ?? 0;
  const realStake  = Math.max(0, bet.stake - bonusStake);

  const credited = await User.findByIdAndUpdate(
    userId,
    {
      $inc: {
        balance:       realStake,
        bonusBalance:  bonusStake,
        // Restore the rollover the bonus stake had cleared, and undo the wager.
        bonusRollover: bonusStake,
        totalWagered:  -bet.stake,
      },
    },
    { new: true },
  );

  await Transaction.create({
    userId, kind: 'adjustment', status: 'completed', method: 'internal',
    amount: bet.stake, currency: bet.currency, reference: `${status}-${bet._id}-${ref()}`,
    betId: bet._id, notes: `${status}${reason ? `: ${reason}` : ''}`, completedAt: new Date(),
  });

  return { ok: true, bet, balance: credited?.balance ?? 0, refunded: bet.stake };
}
