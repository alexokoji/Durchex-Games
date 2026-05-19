import { toUsd } from './houseLedger';
import type { IUser } from '../models/User';

/**
 * VIP tier ladder — anchored to lifetime wagered (USD-equivalent). Thresholds
 * span $100 → $1000 split across the five tiers, matching the product spec.
 *
 * Each tier carries:
 *   - `cashbackPct` — share of weekly net losses returned as bonus credit
 *   - `name` / `color` — surfaced by the VIPPage and the user's profile chip
 *
 * The cashback cron + the user's `/api/auth/me` payload both call into
 * `tierForUser(user)` so server and client agree on the same source of truth.
 */
export interface VipTier {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  minWageredUsd: number;
  cashbackPct: number;     // 0..1
  color: string;
  perks: string[];
}

export const VIP_TIERS: readonly VipTier[] = [
  { level: 1, name: 'Bronze',   minWageredUsd: 100,  cashbackPct: 0.05, color: '#cd7f32', perks: ['5% weekly cashback on net losses',  'Bronze chat badge'] },
  { level: 2, name: 'Silver',   minWageredUsd: 300,  cashbackPct: 0.08, color: '#c0c0c0', perks: ['8% weekly cashback',  'Higher daily withdrawal cap', 'Silver chat badge'] },
  { level: 3, name: 'Gold',     minWageredUsd: 500,  cashbackPct: 0.10, color: '#ffd700', perks: ['10% weekly cashback', 'Priority support queue', 'Gold chat badge'] },
  { level: 4, name: 'Platinum', minWageredUsd: 750,  cashbackPct: 0.12, color: '#8b00ff', perks: ['12% weekly cashback', 'Dedicated VIP host', 'Platinum chat badge', 'Birthday bonus'] },
  { level: 5, name: 'Diamond',  minWageredUsd: 1000, cashbackPct: 0.15, color: '#00bcd4', perks: ['15% weekly cashback', 'Exclusive tournaments', 'Custom withdrawal limits', 'Diamond chat badge'] },
] as const;

/** Below the bronze threshold the user is "Unranked" — no VIP perks yet. */
export const UNRANKED: { level: 0; name: 'Unranked'; cashbackPct: 0; color: string } = {
  level: 0, name: 'Unranked', cashbackPct: 0, color: '#64748b',
};

/**
 * Compute the user's tier from their lifetime wagered amount (converted to
 * USD-equivalent). User documents only store `totalWagered` in their account
 * currency — we convert here so tier breakpoints are FX-stable.
 */
export function tierForWageredUsd(wageredUsd: number): VipTier | typeof UNRANKED {
  let active: VipTier | typeof UNRANKED = UNRANKED;
  for (const t of VIP_TIERS) {
    if (wageredUsd >= t.minWageredUsd) active = t;
    else break;
  }
  return active;
}

/**
 * Lookup helper — pulls the user's account currency and converts `totalWagered`
 * to USD before resolving the tier.
 */
export function tierForUser(user: Pick<IUser, 'totalWagered' | 'currency'>): {
  tier: VipTier | typeof UNRANKED;
  wageredUsd: number;
  /** USD shortfall to the next tier (0 if already at Diamond). */
  nextThresholdUsd: number | null;
  progressPct: number;
} {
  const wageredUsd = toUsd(user.totalWagered ?? 0, user.currency);
  const tier = tierForWageredUsd(wageredUsd);
  // Next tier above the current one (or null if maxed).
  const idx = tier.level === 0 ? -1 : VIP_TIERS.findIndex(t => t.level === tier.level);
  const next = idx + 1 < VIP_TIERS.length ? VIP_TIERS[idx + 1] : null;
  const nextThresholdUsd = next ? next.minWageredUsd : null;
  // Progress within the current tier band (between this tier's min and next's min).
  const floor = tier.level === 0 ? 0 : (tier as VipTier).minWageredUsd;
  const ceiling = next ? next.minWageredUsd : floor + 1;
  const progressPct = ceiling === floor
    ? 100
    : Math.max(0, Math.min(100, ((wageredUsd - floor) / (ceiling - floor)) * 100));
  return { tier, wageredUsd, nextThresholdUsd, progressPct };
}

/**
 * Cashback rate applied to weekly net losses for a given user. Returns 0
 * when the user is below the Bronze threshold.
 */
export function cashbackPctForUser(user: Pick<IUser, 'totalWagered' | 'currency'>): number {
  return tierForUser(user).tier.cashbackPct;
}
