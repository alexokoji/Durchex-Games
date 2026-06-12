import { SportEvent, type ISportEvent, type IEventMarket } from '../models/SportEvent';
import { Bet } from '../models/Bet';
import { getRiskConfig } from '../models/RiskConfig';
import { toUsd, type AnyCurrency } from '../config/currencies';
import { getSportsFeed } from '../providers';
import { settleBetAtomic } from './wallet';
import { reverseBetAtomic } from './cashout';
import { notifyUser, notifyWalletUpdate } from '../sockets/notifier';

const LIVE_GAME_ID = 'live-sports';

// ─── Selection shape stored on a live-sports Bet ─────────────────────────────

export interface LiveSelection {
  eventId: string;        // SportEvent.providerId
  label: string;          // "Arsenal vs Chelsea"
  marketKey: string;      // 'h2h' | 'totals'
  outcomeName: string;    // 'Arsenal' | 'Draw' | 'Over' | 'Under'
  point?: number;
  price: number;          // decimal odds locked at placement
}

// ─── Ingestion ───────────────────────────────────────────────────────────────

/** Minimum Odds-API credits to keep in reserve — stop polling below this so a
 *  key can't be drained to zero (manual refresh still works). */
const ODDS_CREDIT_FLOOR = 20;

/** Pull upcoming events + odds for every active sport and upsert them. */
export async function ingestEvents(): Promise<{ sports: number; events: number }> {
  const { env } = require('../config/env') as typeof import('../config/env');
  // No API key → don't ingest at all (no demo fallback). Section stays empty.
  if (!env.liveSports.enabled) return { sports: 0, events: 0 };

  const feed = getSportsFeed();

  // Quota guard — bail before exhausting the key.
  const { oddsRequestsRemaining } = await import('../providers/theOddsApi');
  const remaining = oddsRequestsRemaining();
  if (remaining != null && remaining < ODDS_CREDIT_FLOOR) {
    console.warn(`[liveSports] paused — only ${remaining} Odds-API credits left (floor ${ODDS_CREDIT_FLOOR}). Raise the plan or ODDS_POLL_SECONDS.`);
    return { sports: 0, events: 0 };
  }

  const sports = await feed.listSports();
  let count = 0;
  for (const sport of sports) {
    if (!sport.active) continue;
    let events;
    try { events = await feed.listEvents(sport.key); }
    catch (e) { console.error('[liveSports] listEvents failed', sport.key, (e as Error).message); continue; }

    for (const ev of events) {
      const commence = new Date(ev.commenceTime);
      const status = commence.getTime() <= Date.now() ? 'live' : 'upcoming';
      await SportEvent.findOneAndUpdate(
        { providerId: ev.id },
        {
          $set: {
            provider: feed.name,
            sportKey: ev.sportKey,
            sportTitle: ev.sportTitle,
            sportGroup: sport.group,
            homeTeam: ev.homeTeam,
            awayTeam: ev.awayTeam,
            commenceTime: commence,
            // Don't override a completed/settled status with feed odds.
            markets: ev.markets.map(m => ({ key: m.key, suspended: false, outcomes: m.outcomes })),
            updatedAt: new Date(),
          },
          $setOnInsert: { status, exposureUsd: 0 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      // Promote upcoming→live when kickoff passes (without clobbering completed).
      await SportEvent.updateOne(
        { providerId: ev.id, status: 'upcoming', commenceTime: { $lte: new Date() } },
        { $set: { status: 'live' } },
      );
      count++;
    }
  }
  await applyTrading();
  return { sports: sports.length, events: count };
}

// ─── Trading engine ──────────────────────────────────────────────────────────
//
// Never rigs outcomes. Aggregates live exposure per event and suspends markets
// whose liability exceeds the configured per-event cap. (Odds shading via the
// existing adjustedOverround can be layered on the displayed prices.)
export async function applyTrading(): Promise<void> {
  const cfg = await getRiskConfig();
  const perEventCap = cfg.maxLiabilityUsd * 0.5;

  const pending = await Bet.find({ gameId: LIVE_GAME_ID, status: 'pending' })
    .select('stake currency selections multiplier').lean();

  // exposure (USD) per event = Σ potential payout of bets touching the event.
  const exposure = new Map<string, number>();
  for (const b of pending) {
    const sels = (b.selections as LiveSelection[] | undefined) ?? [];
    const combined = sels.reduce((acc, s) => acc * (s.price || 1), 1);
    const payoutUsd = toUsd(b.stake, b.currency as AnyCurrency) * combined;
    for (const s of sels) exposure.set(s.eventId, (exposure.get(s.eventId) ?? 0) + payoutUsd);
  }

  const events = await SportEvent.find({ status: { $in: ['upcoming', 'live'] } });
  for (const ev of events) {
    const expo = exposure.get(ev.providerId) ?? 0;
    const overCap = expo > perEventCap;
    let changed = ev.exposureUsd !== expo || ev.suspended !== overCap;
    ev.exposureUsd = expo;
    ev.suspended = overCap;
    for (const m of ev.markets) {
      const next = overCap;
      if (m.suspended !== next) { m.suspended = next; changed = true; }
    }
    if (changed) await ev.save();
  }
}

// ─── Settlement from real results ────────────────────────────────────────────

type Outcome3 = 'home' | 'draw' | 'away';

function legResult(ev: ISportEvent, sel: LiveSelection): 'won' | 'lost' | 'push' {
  const r = ev.result;
  if (!r || !r.completed || r.homeScore == null || r.awayScore == null) return 'push';
  const hs = r.homeScore, as = r.awayScore;
  const result: Outcome3 = hs > as ? 'home' : hs < as ? 'away' : 'draw';
  const name = sel.outcomeName;
  const lc = name.toLowerCase();

  switch (sel.marketKey) {
    case 'h2h': {
      const winner = result === 'home' ? ev.homeTeam : result === 'away' ? ev.awayTeam : 'Draw';
      return name === winner ? 'won' : 'lost';
    }
    case 'totals': {
      if (sel.point == null) return 'push';
      const total = hs + as;
      if (total === sel.point) return 'push';
      const over = total > sel.point;
      return (name === 'Over' && over) || (name === 'Under' && !over) ? 'won' : 'lost';
    }
    case 'spreads': {
      // Handicap: outcome name = team, point = handicap applied to that team.
      if (sel.point == null) return 'push';
      const isHome = name === ev.homeTeam;
      const adj = (isHome ? hs : as) + sel.point;
      const opp = isHome ? as : hs;
      if (adj === opp) return 'push';
      return adj > opp ? 'won' : 'lost';
    }
    case 'double_chance': {
      // Outcome covers any results whose label it mentions (home/draw/away).
      const covers = new Set<Outcome3>();
      if (lc.includes(ev.homeTeam.toLowerCase())) covers.add('home');
      if (lc.includes(ev.awayTeam.toLowerCase())) covers.add('away');
      if (lc.includes('draw')) covers.add('draw');
      return covers.has(result) ? 'won' : 'lost';
    }
    case 'btts': {
      const bothScored = hs > 0 && as > 0;
      const yes = lc === 'yes';
      return (yes && bothScored) || (!yes && !bothScored) ? 'won' : 'lost';
    }
    case 'draw_no_bet': {
      if (result === 'draw') return 'push';            // stake returned
      const winner = result === 'home' ? ev.homeTeam : ev.awayTeam;
      return name === winner ? 'won' : 'lost';
    }
    default:
      return 'push';
  }
}

/** Pull results, mark events completed, then settle any fully-decided bets. */
export async function settleFinished(): Promise<{ settled: number }> {
  const feed = getSportsFeed();
  const sportKeys = await SportEvent.distinct('sportKey', { status: { $in: ['upcoming', 'live'] } });

  for (const key of sportKeys) {
    let results;
    try { results = await feed.listResults(key); }
    catch { continue; }
    for (const res of results) {
      if (!res.completed) continue;
      await SportEvent.updateOne(
        { providerId: res.id, status: { $ne: 'settled' } },
        { $set: { status: 'completed', result: { homeScore: res.homeScore ?? 0, awayScore: res.awayScore ?? 0, completed: true } } },
      );
    }
  }

  // Settle pending live bets whose every event is completed.
  const pending = await Bet.find({ gameId: LIVE_GAME_ID, status: 'pending' });
  let settled = 0;
  for (const bet of pending) {
    const sels = (bet.selections as LiveSelection[] | undefined) ?? [];
    if (sels.length === 0) continue;
    const events = await SportEvent.find({ providerId: { $in: sels.map(s => s.eventId) } });
    const byId = new Map(events.map(e => [e.providerId, e]));
    const allDone = sels.every(s => byId.get(s.eventId)?.result?.completed);
    if (!allDone) continue;

    let combined = 1;
    let anyLost = false;
    for (const s of sels) {
      const ev = byId.get(s.eventId)!;
      const r = legResult(ev, s);
      if (r === 'lost') { anyLost = true; break; }
      if (r === 'won')  combined *= s.price;
      // push → treated as odds 1 (no contribution)
    }

    const uid = bet.userId.toString();
    if (anyLost) {
      await settleBetAtomic({ userId: bet.userId, betId: bet._id, won: false, payout: 0 });
      notifyWalletUpdate(uid, 'bet_settled');
    } else if (combined <= 1 + 1e-9) {
      // Entire slip pushed — refund the stake.
      await reverseBetAtomic(bet.userId, bet._id, 'refunded', 'all selections void/push');
      notifyWalletUpdate(uid, 'bet_refunded');
    } else {
      const payout = bet.stake * combined;
      await settleBetAtomic({ userId: bet.userId, betId: bet._id, won: true, payout });
      notifyWalletUpdate(uid, 'bet_settled');
      notifyUser(uid, {
        kind: 'bet:settled',
        title: `Won · ${bet.gameName}`,
        body: `+${(payout - bet.stake).toFixed(2)} ${bet.currency}`,
        data: { betId: bet._id.toString(), currency: bet.currency },
      });
    }
    // Mark the events settled once their bets are processed.
    await SportEvent.updateMany({ providerId: { $in: sels.map(s => s.eventId) }, status: 'completed' }, { $set: { status: 'settled' } });
    settled++;
  }
  return { settled };
}

// ─── Cashout valuation inputs for a live bet ─────────────────────────────────
//
// Computes potentialReturn (stake × combined locked odds) and the live
// winProbability (product of de-margined implied probs at CURRENT odds, with
// already-won legs = 1 and any decided-lost leg = 0).
export async function liveCashoutInputs(bet: { stake: number; selections?: unknown }): Promise<
  { potentialReturn: number; winProbability: number } | { error: 'leg_lost' | 'no_market' }
> {
  const sels = (bet.selections as LiveSelection[] | undefined) ?? [];
  if (sels.length === 0) return { error: 'no_market' };
  const events = await SportEvent.find({ providerId: { $in: sels.map(s => s.eventId) } });
  const byId = new Map(events.map(e => [e.providerId, e]));

  let combinedLocked = 1;
  let winProb = 1;
  for (const s of sels) {
    combinedLocked *= s.price;
    const ev = byId.get(s.eventId);
    if (!ev) return { error: 'no_market' };

    if (ev.result?.completed) {
      const r = legResult(ev, s);
      if (r === 'lost') return { error: 'leg_lost' };
      winProb *= 1; // won/push leg already secured
      continue;
    }
    const market = ev.markets.find(m => m.key === s.marketKey);
    const outcome = market?.outcomes.find(o => o.name === s.outcomeName && (s.point == null || o.point === s.point));
    if (!outcome || market?.suspended || ev.suspended) return { error: 'no_market' };
    // De-margin against the relevant book. For line markets (totals/spreads)
    // that's only the outcomes sharing the same line; otherwise the whole market.
    const siblings = s.point != null
      ? market!.outcomes.filter(o => o.point === s.point)
      : market!.outcomes;
    winProb *= impliedFair(siblings, outcome.price);
  }
  return { potentialReturn: bet.stake * combinedLocked, winProbability: Math.max(0, Math.min(1, winProb)) };
}

/** De-margined implied probability of one outcome within a set of siblings. */
function impliedFair(siblings: { price: number }[], price: number): number {
  const sum = siblings.reduce((a, o) => a + 1 / o.price, 0); // > 1 due to overround
  if (sum <= 0) return 0;
  return (1 / price) / sum;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

let started = false;
export function startLiveSportsScheduler(): void {
  if (started) return;
  started = true;

  // One-time cleanup: drop any demo/sandbox events left in the DB from before
  // the sandbox feed was removed, so no fake fixtures ever linger.
  void SportEvent.deleteMany({ provider: 'sandbox' })
    .then(r => { if (r.deletedCount) console.log(`[liveSports] purged ${r.deletedCount} legacy sandbox events`); })
    .catch(() => {});

  const { env } = require('../config/env') as typeof import('../config/env');
  if (!env.liveSports.enabled) {
    console.log('[liveSports] no ODDS_API_KEY — live feed disabled (section will be empty).');
    return;
  }

  const everyMs = Math.max(30, env.liveSports.pollSeconds) * 1000;
  const tick = async () => {
    try { await ingestEvents(); } catch (e) { console.error('[liveSports] ingest', (e as Error).message); }
    try { await settleFinished(); } catch (e) { console.error('[liveSports] settle', (e as Error).message); }
  };
  setTimeout(() => { void tick(); }, 4000);
  setInterval(() => { void tick(); }, everyMs);
  console.log(`[liveSports] scheduler started · provider=${getSportsFeed().name} · every ${everyMs / 1000}s`);
}

export { LIVE_GAME_ID };
