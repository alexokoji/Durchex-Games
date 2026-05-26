import { JobState } from '../models/JobState';
import { Bet } from '../models/Bet';
import { settleBetAtomic } from './wallet';
import { teamsByLeague } from '../../../src/virtual-sports/core/teamDatabase';
import { getLeague, LEAGUES } from '../../../src/virtual-sports/core/leagueDatabase';
import { buildSeasonSchedule, buildLeaguePhaseSchedule, type ScheduledFixture } from '../../../src/virtual-sports/core/seasonScheduler';
import { simulateSoccerMatch, resolveSoccerSelection } from '../../../src/virtual-sports/soccer/soccerSimulation';
import { simulateBasketballMatch, resolveBasketballSelection } from '../../../src/virtual-sports/basketball/basketballSimulation';
import { simulateHockeyMatch, resolveHockeySelection } from '../../../src/virtual-sports/hockey/hockeySimulation';
import { calculatePayout } from '../../../src/virtual-sports/core/oddsEngine';

const JOB_PREFIX = 'virtual_settle';
const WEEK_SECONDS = 600; // same as client

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function seasonSeedFor(leagueId: string): number {
  const d = new Date();
  const dayKey = `${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}`;
  let h = 5381;
  for (const c of (leagueId + dayKey)) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return h >>> 0;
}

function combinations(n: number, k: number): number[][] {
  if (k <= 0 || k > n) return [];
  const out: number[][] = [];
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    out.push([...idx]);
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return out;
}

function buildWeekMatches(leagueId: string, week: number, seasonSeed: number, fixtures: ScheduledFixture[]): { home: any; away: any; seed: number }[] {
  const teams = teamsByLeague(leagueId);
  const teamsById = new Map(teams.map((t: any) => [t.id, t]));
  const matches = fixtures.filter((f: any) => f.week === week).map((f: any) => {
    const home = teamsById.get(f.homeId);
    const away = teamsById.get(f.awayId);
    if (!home || !away) return null;
    const seed = seasonSeed ^ (week * 7919) ^ hashStr(home.id + away.id);
    return { home, away, seed };
  }).filter(Boolean) as { home: any; away: any; seed: number }[];
  return matches;
}

export async function settleForLeagueWeek(leagueId: string, currentWeek: number) {
  const key = `${JOB_PREFIX}:${leagueId}:w${currentWeek}`;
  const existing = await JobState.findById(key).exec();
  if (existing) return; // already settled

  const leagueMeta = getLeague(leagueId);
  const teams = teamsByLeague(leagueId);
  if (teams.length < 2) return;

  const seed = seasonSeedFor(leagueId);
  const fixtures = leagueMeta?.tier === 'continental'
    ? buildLeaguePhaseSchedule(teams.map((t: any) => t.id), seed, 8)
    : buildSeasonSchedule(teams.map((t: any) => t.id), seed);

  // Build simulations and outcome map for this week
  const weekMatches = buildWeekMatches(leagueId, currentWeek, seed, fixtures);
  const outcomesBySelection = new Map<string, { result: 'win' | 'loss' | 'void'; finalScore?: { home: number; away: number } }>();

  for (const m of weekMatches) {
    let sim: any = null;
    if (leagueMeta?.sport === 'soccer') {
      sim = simulateSoccerMatch(m.home, m.away, m.seed);
    } else if (leagueMeta?.sport === 'basketball') {
      sim = simulateBasketballMatch(m.home, m.away, m.seed);
    } else if (leagueMeta?.sport === 'hockey') {
      sim = simulateHockeyMatch(m.home, m.away, m.seed);
    } else {
      continue;
    }

    // For each pending bet that references this match we'll resolve selections
    const matchId = `${leagueId}-w${currentWeek}-${m.home.id}-${m.away.id}`;
    const pending = await Bet.find({ status: 'pending', 'selections.matchId': matchId }).exec();
    if (pending.length === 0) continue;

    for (const bet of pending) {
      const sels = Array.isArray(bet.selections) ? bet.selections : [];
      // Build outcomes for selections that belong to this match
      for (const s of sels) {
        if (s.matchId !== matchId) continue;
        let res: 'win' | 'loss' | 'void' = 'void';
        if (leagueMeta?.sport === 'soccer') res = resolveSoccerSelection(s as any, sim);
        else if (leagueMeta?.sport === 'basketball') res = resolveBasketballSelection(s as any, sim);
        else if (leagueMeta?.sport === 'hockey') res = resolveHockeySelection(s as any, sim);
        outcomesBySelection.set(s.id, { result: res, finalScore: (sim && sim.finalScore) ? sim.finalScore : undefined });
      }
    }
  }

  // Now find all pending bets that have *all* their selections resolved
  // This requires checking all resolved outcomes globally, not just from this week
  const candidateBets = await Bet.find({ status: 'pending', 'selections.id': { $exists: true } }).exec();
  
  // Build a map of all resolved selections across all settlement passes
  const resolvedSelections = new Map<string, boolean>();
  for (const [selId] of outcomesBySelection) {
    resolvedSelections.set(selId, true);
  }
  
  // Check if any pending bets have been previously partially settled
  // by looking at their selections to see which ones are resolvable now
  const toSettle: { bet: any; settledPayout: number; won: boolean }[] = [];
  for (const bet of candidateBets) {
    const sels = Array.isArray(bet.selections) ? bet.selections : [];
    if (sels.length === 0) continue;
    
    const results: ('win' | 'loss' | 'void')[] = [];
    let allResolved = true;
    
    for (const s of sels) {
      const o = outcomesBySelection.get(s.id);
      if (!o) {
        allResolved = false;
        break;
      }
      results.push(o.result);
    }

    // Skip this bet if not all selections have been resolved yet
    if (!allResolved) continue;

    // Apply client logic to compute settled payout (single / multi / system)
    let settledPayout = 0;
    let isWon = false;
    const selsArr = bet.selections as any[];
    const isSingle = bet.mode === 'single';
    if (isSingle) {
      let payout = 0;
      const oddsInfo: any[] = [];
      const perSelectionStake = bet.stake / (selsArr.length || 1);
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const sel = selsArr[i];
        if (r === 'win') {
          const selPayout = calculatePayout(perSelectionStake, sel.odds);
          payout += selPayout;
          oddsInfo.push({ i, odds: sel.odds, result: r, selPayout });
        }
        else if (r === 'void') {
          payout += perSelectionStake;
          oddsInfo.push({ i, odds: sel.odds, result: r, selPayout: perSelectionStake });
        } else {
          oddsInfo.push({ i, odds: sel.odds, result: r, selPayout: 0 });
        }
      }
      console.log('[virtualSportsScheduler] Single bet settlement:', {
        betId: bet._id.toString(),
        stake: bet.stake,
        perSelectionStake,
        selections: oddsInfo,
        totalPayout: payout,
      });
      const allWon = results.every(r => r === 'win');
      const allLost = results.every(r => r === 'loss');
      settledPayout = payout;
      isWon = settledPayout > 0 && !allLost ? true : allWon;
    } else {
      // Determine if this is a system bet based on persisted systemK; otherwise treat as multi.
      const systemK = (typeof bet.systemK === 'number' && Number.isInteger(bet.systemK)) ? bet.systemK : undefined;
      if (!systemK) {
        // multi
        const anyLoss = results.some(r => r === 'loss');
        if (anyLoss) {
          settledPayout = 0;
          isWon = false;
        } else {
          console.log('[virtualSportsScheduler] MULTI BET DEBUG:', {
            betId: bet._id.toString(),
            stake: bet.stake,
            stakeType: typeof bet.stake,
            selectionsCount: selsArr.length,
            selectionsArr: JSON.stringify(selsArr.slice(0, 3)),
          });

          const oddsProd = selsArr.reduce((p: number, sel: any, i: number) => {
            const selOdds = results[i] === 'void' ? 1 : sel.odds;
            console.log(`  [${i}] odds=${sel.odds}, result=${results[i]}, useOdds=${selOdds}, product=${p} * ${selOdds} = ${p * selOdds}`);
            return p * selOdds;
          }, 1);

          settledPayout = bet.stake * oddsProd;
          console.log('[virtualSportsScheduler] Multi bet settlement:', {
            betId: bet._id.toString(),
            stake: bet.stake,
            selections: selsArr.map((s: any) => ({ odds: s.odds })),
            oddsProd,
            calculatedPayout: bet.stake * oddsProd,
            settledPayout,
          });
          isWon = settledPayout > 0;
        }
      } else {
        // Full system k-of-n: enumerate all combos and sum payouts for winning combos
        const n = selsArr.length;
        const combos = combinations(n, systemK);
        const winningCombos = combos.filter(combo => combo.every(i => results[i] === 'win'));
        if (winningCombos.length === 0) {
          settledPayout = 0;
          isWon = false;
        } else {
          const perLineStake = bet.stake / (combos.length || 1);
          const payout = winningCombos.reduce((sum, combo) => {
            const oddsProduct = combo.reduce((p, idx) => p * selsArr[idx].odds, 1);
            return sum + perLineStake * oddsProduct;
          }, 0);
          const fullWin = winningCombos.length === combinations(n, systemK).length;
          settledPayout = payout;
          isWon = fullWin || payout > 0;
        }
      }
    }
    toSettle.push({ bet, settledPayout, won: isWon });
  }

  // Execute settlements
  for (const s of toSettle) {
    try {
      console.log('[virtualSportsScheduler] Settling bet:', {
        betId: s.bet._id.toString(),
        userId: s.bet.userId.toString(),
        mode: s.bet.mode,
        stake: s.bet.stake,
        selections: s.bet.selections.map((sel: any) => ({
          id: sel.id,
          odds: sel.odds,
        })),
        settledPayout: s.settledPayout,
        won: s.won,
      });
      await settleBetAtomic({ userId: s.bet.userId, betId: s.bet._id, won: s.won, payout: s.settledPayout });
    } catch (err) {
      // ignore per-bet errors but log
      // eslint-disable-next-line no-console
      console.error('[virtual_settle] failed settle', s.bet._id, err);
    }
  }

  // Record JobState so we don't re-run
  await JobState.create({ _id: key, lastRunAt: new Date(), lastRunCount: toSettle.length });
}

export function startVirtualSportsScheduler(): void {
  // Run once at startup and then every minute
  const tick = async () => {
    try {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      const anchor = d.getTime();
      const now = Date.now();
      for (const league of LEAGUES) {
        const teams = teamsByLeague(league.id);
        if (teams.length < 2) continue;
        const seed = seasonSeedFor(league.id);
        const fixtures = league.tier === 'continental'
          ? buildLeaguePhaseSchedule(teams.map((t: any) => t.id), seed, 8)
          : buildSeasonSchedule(teams.map((t: any) => t.id), seed);
        const total = fixtures.reduce((m: number, f: any) => Math.max(m, f.week), 0);
        if (total === 0) continue;
        const totalSeasonSeconds = total * WEEK_SECONDS;
        const elapsedFromAnchor = Math.max(0, now - anchor);
        const elapsedInLoop = totalSeasonSeconds > 0 ? (elapsedFromAnchor % (totalSeasonSeconds * 1000)) : 0;
        const elapsedSecondsInSeason = Math.floor(elapsedInLoop / 1000);
        const currentWeek = Math.min(total, Math.floor(elapsedSecondsInSeason / WEEK_SECONDS) + 1);
        const secondsIntoWeek = elapsedSecondsInSeason % WEEK_SECONDS;
        const phase = secondsIntoWeek < 360 ? 'betting' : secondsIntoWeek < 360 + 180 ? 'live' : 'finished';

        const weeksToSettle: number[] = [];
        for (let week = 1; week < currentWeek; week++) {
          weeksToSettle.push(week);
        }
        if (phase === 'finished') {
          weeksToSettle.push(currentWeek);
        }

        for (const week of weeksToSettle) {
          // eslint-disable-next-line no-await-in-loop
          await settleForLeagueWeek(league.id, week);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[virtual_settle] tick error', err);
    }
  };
  void tick();
  setInterval(tick, 10_000);
}
