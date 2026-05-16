import { Bet } from '../models/Bet';
import { getRiskConfig } from '../models/RiskConfig';
import { isFiat, type AnyCurrency } from '../config/currencies';
import { FIAT, CRYPTO_USD } from '../config/currencies';

/** Roughly convert any currency to USD using the static reference rates.
 *  Used for exposure aggregation only — never user-facing. */
function toUsd(amount: number, currency: AnyCurrency): number {
  if (isFiat(currency)) return amount * FIAT[currency].usdPerUnit;
  if (currency === 'BTC' || currency === 'USDT' || currency === 'USDC') {
    return amount * CRYPTO_USD[currency];
  }
  return amount;
}

/**
 * Current platform Return-To-Player over the rolling 24h window. Used by the
 * admin dashboard and by the odds engine if you wire it to nudge the margin
 * toward the configured target band.
 */
export async function currentRtp24h(): Promise<{ rtp: number; turnoverUsd: number; payoutUsd: number; settled: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const settled = await Bet.find({ status: { $in: ['won', 'lost', 'push', 'cashout'] }, settledAt: { $gte: since } }).lean();
  let turnover = 0;
  let payout = 0;
  for (const b of settled) {
    turnover += toUsd(b.stake, b.currency as AnyCurrency);
    payout   += toUsd(b.payout, b.currency as AnyCurrency);
  }
  return {
    rtp: turnover > 0 ? payout / turnover : 0,
    turnoverUsd: turnover,
    payoutUsd: payout,
    settled: settled.length,
  };
}

/**
 * Per-market open liability — sum of potential payouts on pending bets,
 * grouped by gameId. Returns a list sorted by USD exposure descending.
 */
export interface MarketExposure {
  gameId: string;
  pendingCount: number;
  stakeUsd: number;
  liabilityUsd: number;   // potential payout if everything wins
}
export async function liabilityByMarket(limit = 25): Promise<MarketExposure[]> {
  const pending = await Bet.find({ status: 'pending' }).lean();
  const byGame = new Map<string, MarketExposure>();
  for (const b of pending) {
    const stakeUsd = toUsd(b.stake, b.currency as AnyCurrency);
    // Potential payout = stake * multiplier (if present). For markets without
    // a stored multiplier we conservatively use 5× as the worst case.
    const potential = stakeUsd * (b.multiplier ?? 5);
    const entry = byGame.get(b.gameId) ?? {
      gameId: b.gameId, pendingCount: 0, stakeUsd: 0, liabilityUsd: 0,
    };
    entry.pendingCount++;
    entry.stakeUsd     += stakeUsd;
    entry.liabilityUsd += potential;
    byGame.set(b.gameId, entry);
  }
  return Array.from(byGame.values())
    .sort((a, b) => b.liabilityUsd - a.liabilityUsd)
    .slice(0, limit);
}

/**
 * Check whether a new bet should be accepted given current liability caps
 * and user concentration. Used by /api/bets before placement (advisory —
 * the wallet still does the final balance check atomically).
 */
export async function shouldAcceptBet(args: {
  userId: string; gameId: string; stake: number; currency: AnyCurrency;
}): Promise<{ ok: true } | { ok: false; reason: 'liability_cap' | 'user_concentration' }> {
  const cfg = await getRiskConfig();
  const stakeUsd = toUsd(args.stake, args.currency);

  // 1) Per-market liability cap.
  const expo = await liabilityByMarket(200);
  const market = expo.find(e => e.gameId === args.gameId);
  const projected = (market?.liabilityUsd ?? 0) + stakeUsd * 5;
  if (projected > cfg.maxLiabilityUsd) {
    return { ok: false, reason: 'liability_cap' };
  }

  // 2) User concentration — single user shouldn't hold > N% of platform exposure.
  const totalLiab = expo.reduce((s, e) => s + e.liabilityUsd, 0);
  if (totalLiab > 0) {
    const userBets = await Bet.find({ userId: args.userId, status: 'pending' }).lean();
    const userLiab = userBets.reduce((s, b) => s + toUsd(b.stake, b.currency as AnyCurrency) * (b.multiplier ?? 5), 0);
    if ((userLiab + stakeUsd * 5) / (totalLiab + stakeUsd * 5) > cfg.maxUserConcentration) {
      return { ok: false, reason: 'user_concentration' };
    }
  }

  return { ok: true };
}

/**
 * Volatility-modulated overround. Compress the bookmaker margin when RTP
 * is running low (give more back to users), inflate when running high.
 * Caller multiplies their raw probabilities by the returned number.
 */
export async function adjustedOverround(): Promise<number> {
  const cfg = await getRiskConfig();
  const { rtp } = await currentRtp24h();
  if (rtp === 0) return cfg.baseOverround;
  // Nudge: each 1% below the target band shrinks the margin by 0.2pp; above
  // the band, expand the same way. Capped to ±50% deviation from base.
  const mid = (cfg.rtpTargetMin + cfg.rtpTargetMax) / 2;
  const drift = (rtp - mid) / mid;          // positive → RTP too high
  const adjustment = drift * 0.2;           // mild nudge
  const min = cfg.baseOverround * 0.8;
  const max = cfg.baseOverround * 1.5;
  return Math.max(min, Math.min(max, cfg.baseOverround * (1 + adjustment)));
}
