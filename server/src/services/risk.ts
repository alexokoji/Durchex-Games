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
 * Per-OPTION exposure for live-sports — what people are betting on, how much,
 * and how many distinct people back each pick. This is the data the admin needs
 * to manage the platform's wins/losses: for every (event, market, outcome) it
 * reports the number of bettors, total staked, and the liability (what the
 * house pays out if that pick lands). Liability for a selection = Σ over the
 * pending bets containing it of stake × that bet's combined odds.
 */
const LIVE_GAME_ID_FOR_EXPOSURE = 'live-sports';
export interface SelectionExposure {
  eventId: string;
  eventLabel: string;
  marketKey: string;
  outcomeName: string;
  point?: number;
  bettors: number;       // distinct users backing this pick
  betCount: number;      // number of pending bets containing it
  stakeUsd: number;      // total money riding on it
  liabilityUsd: number;  // house payout if this pick wins (across those bets)
}
export async function liabilityBySelection(): Promise<SelectionExposure[]> {
  const pending = await Bet.find({ gameId: LIVE_GAME_ID_FOR_EXPOSURE, status: 'pending' })
    .select('userId stake currency selections multiplier').lean();

  type Sel = { eventId: string; label: string; marketKey: string; outcomeName: string; point?: number; price: number };
  const map = new Map<string, SelectionExposure & { users: Set<string> }>();

  for (const b of pending) {
    const sels = (b.selections as Sel[] | undefined) ?? [];
    if (!sels.length) continue;
    const combined = b.multiplier ?? sels.reduce((a, s) => a * (s.price || 1), 1);
    const stakeUsd = toUsd(b.stake, b.currency as AnyCurrency);
    const liab = stakeUsd * combined;
    const uid = String(b.userId);
    for (const s of sels) {
      const key = `${s.eventId}|${s.marketKey}|${s.outcomeName}|${s.point ?? ''}`;
      const e = map.get(key) ?? {
        eventId: s.eventId, eventLabel: s.label, marketKey: s.marketKey,
        outcomeName: s.outcomeName, point: s.point,
        bettors: 0, betCount: 0, stakeUsd: 0, liabilityUsd: 0, users: new Set<string>(),
      };
      e.betCount++;
      e.stakeUsd += stakeUsd;
      e.liabilityUsd += liab;
      e.users.add(uid);
      map.set(key, e);
    }
  }

  return Array.from(map.values())
    .map(({ users, ...rest }) => ({ ...rest, bettors: users.size }))
    .sort((a, b) => b.liabilityUsd - a.liabilityUsd);
}

/**
 * Most recent live-sports bets, newest first — the admin's live feed of what
 * people are betting on as it happens, with who, stake and potential payout.
 */
export interface RecentLiveBet {
  id: string;
  userEmail?: string;
  username?: string;
  currency: string;
  stake: number;
  stakeUsd: number;
  liabilityUsd: number;   // payout owed if this bet wins
  mode: string;
  status: string;
  placedAt: string;
  selections: { label: string; marketKey: string; outcomeName: string; point?: number; price: number }[];
}
export async function recentLiveBets(limit = 25): Promise<RecentLiveBet[]> {
  const bets = await Bet.find({ gameId: LIVE_GAME_ID_FOR_EXPOSURE })
    .sort({ placedAt: -1 }).limit(limit)
    .populate('userId', 'email username')
    .lean();
  return bets.map(b => {
    const sels = (b.selections as RecentLiveBet['selections'] | undefined) ?? [];
    const combined = b.multiplier ?? sels.reduce((a, s) => a * (s.price || 1), 1);
    const stakeUsd = toUsd(b.stake, b.currency as AnyCurrency);
    const u = b.userId as unknown as { email?: string; username?: string } | null;
    const placed = (b as { placedAt?: Date; createdAt?: Date }).placedAt ?? (b as { createdAt?: Date }).createdAt;
    return {
      id: String(b._id),
      userEmail: u?.email,
      username: u?.username,
      currency: b.currency,
      stake: b.stake,
      stakeUsd,
      liabilityUsd: stakeUsd * combined,
      mode: (b as { mode?: string }).mode ?? 'single',
      status: b.status,
      placedAt: placed instanceof Date ? placed.toISOString() : '',
      selections: sels.map(s => ({ label: s.label, marketKey: s.marketKey, outcomeName: s.outcomeName, point: s.point, price: s.price })),
    };
  });
}

/**
 * Site-wide live feed — newest bets across EVERY game (casino, virtual, live
 * sports), so the admin sees all play/betting activity as it happens.
 */
export interface RecentBet {
  id: string;
  userEmail?: string;
  username?: string;
  gameId: string;
  gameName: string;
  currency: string;
  stake: number;
  stakeUsd: number;
  payout: number;
  multiplier?: number;
  status: string;
  mode: string;
  details?: string;
  placedAt: string;
  selections: { label: string; marketKey: string; outcomeName: string; point?: number; price: number }[];
}
export async function recentBetsAllGames(limit = 40): Promise<RecentBet[]> {
  const bets = await Bet.find({})
    .sort({ placedAt: -1 }).limit(limit)
    .populate('userId', 'email username')
    .lean();
  return bets.map(b => {
    const u = b.userId as unknown as { email?: string; username?: string } | null;
    const sels = Array.isArray(b.selections) ? (b.selections as RecentBet['selections']) : [];
    const placed = (b as { placedAt?: Date }).placedAt;
    return {
      id: String(b._id),
      userEmail: u?.email, username: u?.username,
      gameId: b.gameId, gameName: b.gameName,
      currency: b.currency, stake: b.stake, stakeUsd: toUsd(b.stake, b.currency as AnyCurrency),
      payout: b.payout ?? 0, multiplier: b.multiplier,
      status: b.status, mode: (b as { mode?: string }).mode ?? 'single',
      details: b.details,
      placedAt: placed instanceof Date ? placed.toISOString() : '',
      selections: sels.map(s => ({ label: s.label, marketKey: s.marketKey, outcomeName: s.outcomeName, point: s.point, price: s.price })),
    };
  });
}

/**
 * Per-GAME activity rollup over a recent window — turnover, payouts, house net,
 * active players and current open liability, for every game on the site.
 */
export interface GameActivity {
  gameId: string;
  gameName: string;
  players: number;
  bets: number;
  turnoverUsd: number;
  payoutUsd: number;
  netUsd: number;            // turnover − payout over the window (house P/L)
  openLiabilityUsd: number;  // potential payout of currently-pending bets
  pendingCount: number;
}
export async function gameActivity(windowMinutes = 60): Promise<GameActivity[]> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const rows = await Bet.aggregate<{
    _id: { gameId: string; currency: string };
    gameName: string; bets: number; stake: number; payout: number; users: unknown[];
  }>([
    { $match: { placedAt: { $gte: since } } },
    { $group: {
      _id: { gameId: '$gameId', currency: '$currency' },
      gameName: { $first: '$gameName' },
      bets:   { $sum: 1 },
      stake:  { $sum: '$stake' },
      payout: { $sum: '$payout' },
      users:  { $addToSet: '$userId' },
    } },
  ]);

  const open = await liabilityByMarket(500);
  const openByGame = new Map(open.map(o => [o.gameId, o]));

  const byGame = new Map<string, GameActivity & { _users: Set<string> }>();
  const get = (gameId: string, gameName: string) => {
    let g = byGame.get(gameId);
    if (!g) {
      const o = openByGame.get(gameId);
      g = {
        gameId, gameName, players: 0, bets: 0, turnoverUsd: 0, payoutUsd: 0, netUsd: 0,
        openLiabilityUsd: o?.liabilityUsd ?? 0, pendingCount: o?.pendingCount ?? 0,
        _users: new Set<string>(),
      };
      byGame.set(gameId, g);
    }
    return g;
  };

  for (const r of rows) {
    const g = get(r._id.gameId, r.gameName ?? r._id.gameId);
    const cur = r._id.currency as AnyCurrency;
    g.bets += r.bets;
    g.turnoverUsd += toUsd(r.stake, cur);
    g.payoutUsd   += toUsd(r.payout, cur);
    for (const uid of r.users ?? []) g._users.add(String(uid));
  }
  // Games with open liability but no bets in the window still matter for risk.
  for (const o of open) if (!byGame.has(o.gameId)) get(o.gameId, o.gameId);

  return Array.from(byGame.values())
    .map(({ _users, ...g }) => ({ ...g, players: _users.size, netUsd: g.turnoverUsd - g.payoutUsd }))
    .sort((a, b) => (b.turnoverUsd + b.openLiabilityUsd) - (a.turnoverUsd + a.openLiabilityUsd));
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
