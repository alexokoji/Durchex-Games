import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Team, Market, BetSelection } from './types';
import { useBetSlip, type SettlementOutcome } from './BetSlipContext';
import {
  buildSeasonSchedule,
  buildLeaguePhaseSchedule,
  type ScheduledFixture,
} from './seasonScheduler';
import { teamsByLeague } from './teamDatabase';
import { getLeague } from './leagueDatabase';
import { pushRecentResult } from './recentResults';

/**
 * Generic season + match-week scheduler.
 *
 * Concepts:
 *   - **Week** is the unit of progression. Each league has a fixed total
 *     number of weeks based on its size (e.g. 38 for a 20-team double
 *     round-robin, 34 for an 18-team one, 8 for the UCC league phase).
 *   - **Tick** within a week has three phases: betting → live → settled,
 *     totalling ~10 minutes. After settled, the next week begins.
 *   - **Pre-booking** lets users place bets on any week ahead of its
 *     kickoff. The slip pays out the moment that week's matches settle.
 *
 * Simulation is sport-agnostic: callers supply a `simulate` function that
 * takes (home, away, seed) → a result object with `finalScore`. The hook
 * stores the simulations once per (week, leagueId) so the live UI can stream
 * them deterministically without re-rolling on every render.
 */

export type SeasonPhase = 'betting' | 'live' | 'finished';

const DEFAULT_BETTING_S  = 360;  // 6 min betting
const DEFAULT_LIVE_S     = 180;  // 3 min live
const DEFAULT_FINISHED_S = 60;   // 1 min settled
const WEEK_SECONDS = DEFAULT_BETTING_S + DEFAULT_LIVE_S + DEFAULT_FINISHED_S; // 600s = 10min

export interface WeekMatch<TSim> {
  id: string;
  week: number;
  home: Team;
  away: Team;
  simulation: TSim;
  markets: Market[];
}

export interface SeasonWeek<TSim> {
  week: number;
  matches: WeekMatch<TSim>[];
  /** Absolute kickoff epoch (ms). */
  startsAt: number;
  liveAt: number;
  settledAt: number;
}

export interface UseLeagueSeasonArgs<TSim> {
  leagueId: string;
  /** Function that produces a simulation for a given (home, away, seed). */
  simulate: (home: Team, away: Team, seed: number) => TSim;
  /** Function that builds the markets for a match. */
  buildMarkets: (home: Team, away: Team, sim: TSim) => Market[];
  /** Function that resolves a bet selection against a simulation. */
  resolveSelection: (sel: BetSelection, sim: TSim) => SettlementOutcome['result'];
  /** Function that extracts the (home, away) score from a simulation. */
  scoreOf: (sim: TSim) => { home: number; away: number };
  /** Sport label (used when persisting recent results). */
  sport: 'soccer' | 'basketball' | 'hockey';
  /** How many weeks ahead to expose for pre-booking. Default 5. */
  lookahead?: number;
  /** Optional override for week duration breakdown. */
  bettingSeconds?: number;
  liveSeconds?: number;
  settledSeconds?: number;
}

export interface UseLeagueSeasonResult<TSim> {
  /** 1-indexed current week. */
  currentWeek: number;
  /** Total weeks in the season (e.g. 38, 34, 8). */
  totalWeeks: number;
  /** Phase of the *current* week. */
  phase: SeasonPhase;
  /** Seconds remaining until the next phase transition. */
  secondsToNextPhase: number;
  /** Seconds until the next week kicks off (always counts down). */
  secondsToNextWeek: number;
  /** Active week + the upcoming `lookahead` weeks for pre-booking. */
  weeks: SeasonWeek<TSim>[];
}

export function useLeagueSeason<TSim>(args: UseLeagueSeasonArgs<TSim>): UseLeagueSeasonResult<TSim> {
  const {
    leagueId, simulate, buildMarkets, resolveSelection, scoreOf, sport,
    lookahead = 5,
    bettingSeconds  = DEFAULT_BETTING_S,
    liveSeconds     = DEFAULT_LIVE_S,
    settledSeconds  = DEFAULT_FINISHED_S,
  } = args;
  const slip = useBetSlip();
  const settledWeeks = useRef(new Set<string>());

  // ─── Build the season fixture list once per league ─────────────────────
  const teams = useMemo(() => teamsByLeague(leagueId), [leagueId]);
  const leagueMeta = useMemo(() => getLeague(leagueId), [leagueId]);
  const seasonSeed = useMemo(() => {
    // Anchor to UTC date so the same calendar day always rebuilds the same
    // season — gives the user predictable "today's fixtures" yet rotates
    // when the date changes.
    const d = new Date();
    const dayKey = `${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}`;
    let h = 5381;
    for (const c of (leagueId + dayKey)) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    return h >>> 0;
  }, [leagueId]);

  const fixtures: ScheduledFixture[] = useMemo(() => {
    if (teams.length < 2) return [];
    const ids = teams.map(t => t.id);
    // Continental cups get the league-phase generator; everything else gets
    // a full double round-robin.
    if (leagueMeta?.tier === 'continental') {
      return buildLeaguePhaseSchedule(ids, seasonSeed, 8);
    }
    return buildSeasonSchedule(ids, seasonSeed);
  }, [teams, leagueMeta, seasonSeed]);

  const total = useMemo(() => {
    let m = 0;
    for (const f of fixtures) if (f.week > m) m = f.week;
    return m;
  }, [fixtures]);

  // ─── Phase clock ────────────────────────────────────────────────────────
  // The season uses today's UTC midnight as anchor so two viewers at the same
  // moment see the same week + phase even without a shared backend.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const anchor = useMemo(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const elapsedFromAnchor = Math.max(0, now - anchor);
  const totalSeasonSeconds = total * WEEK_SECONDS;
  const elapsedInLoop = totalSeasonSeconds > 0 ? elapsedFromAnchor % (totalSeasonSeconds * 1000) : 0;
  const elapsedSecondsInSeason = Math.floor(elapsedInLoop / 1000);
  const currentWeek = Math.min(total, Math.floor(elapsedSecondsInSeason / WEEK_SECONDS) + 1);
  const secondsIntoWeek = elapsedSecondsInSeason % WEEK_SECONDS;
  const phase: SeasonPhase =
    secondsIntoWeek < bettingSeconds ? 'betting'
    : secondsIntoWeek < bettingSeconds + liveSeconds ? 'live'
    : 'finished';

  const secondsToNextPhase =
    phase === 'betting'  ? bettingSeconds - secondsIntoWeek
    : phase === 'live'   ? (bettingSeconds + liveSeconds) - secondsIntoWeek
    : (bettingSeconds + liveSeconds + settledSeconds) - secondsIntoWeek;
  const secondsToNextWeek = WEEK_SECONDS - secondsIntoWeek;

  // ─── Build simulations for the active + upcoming weeks ─────────────────
  const teamsById = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  const weeks: SeasonWeek<TSim>[] = useMemo(() => {
    if (total === 0) return [];
    const out: SeasonWeek<TSim>[] = [];
    const weeksToBuild = Math.min(total, lookahead + 1);
    for (let i = 0; i < weeksToBuild; i++) {
      const week = ((currentWeek - 1 + i) % total) + 1;
      const matchesThisWeek = fixtures.filter(f => f.week === week);
      const startsAt = anchor + ((currentWeek - 1 + i) * WEEK_SECONDS) * 1000;
      const liveAt   = startsAt + bettingSeconds * 1000;
      const settledAt= liveAt   + liveSeconds * 1000;
      const built: WeekMatch<TSim>[] = matchesThisWeek
        .map(f => {
          const home = teamsById.get(f.homeId);
          const away = teamsById.get(f.awayId);
          if (!home || !away) return null;
          // Per-match seed combines season, week and team ids so it's stable
          // for the duration of this season but unique per fixture.
          const seed = seasonSeed ^ (week * 7919) ^ hashStr(home.id + away.id);
          const simulation = simulate(home, away, seed);
          const markets = buildMarkets(home, away, simulation);
          return {
            id: `${leagueId}-w${week}-${home.id}-${away.id}`,
            week,
            home,
            away,
            simulation,
            markets,
          };
        })
        .filter((m): m is WeekMatch<TSim> => m != null);
      out.push({ week, matches: built, startsAt, liveAt, settledAt });
    }
    return out;
  }, [
    total, currentWeek, lookahead, fixtures, anchor, bettingSeconds, liveSeconds,
    teamsById, leagueId, seasonSeed, simulate, buildMarkets,
  ]);

  // ─── Settle slip outcomes when the active week finishes ────────────────
  const settle = useCallback(() => {
    if (phase !== 'finished') return;
    const key = `${leagueId}-w${currentWeek}`;
    if (settledWeeks.current.has(key)) return;
    settledWeeks.current.add(key);

    const week = weeks.find(w => w.week === currentWeek);
    if (!week) return;
    const outcomes: SettlementOutcome[] = [];
    const pending: BetSelection[] = slip.openTickets.flatMap(t => t.selections);
    for (const sel of pending) {
      const match = week.matches.find(m => m.id === sel.matchId);
      if (!match) continue;
      outcomes.push({ selectionId: sel.id, result: resolveSelection(sel, match.simulation) });
    }
    if (outcomes.length > 0) slip.settleOutcomes(outcomes);

    // Push results into the recent-results store.
    const leagueName = leagueMeta?.shortName ?? leagueId.toUpperCase();
    for (const m of week.matches) {
      const { home: hs, away: as } = scoreOf(m.simulation);
      pushRecentResult({
        sport,
        leagueId,
        leagueName,
        home: { id: m.home.id, name: m.home.shortName, abbr: m.home.abbr, score: hs },
        away: { id: m.away.id, name: m.away.shortName, abbr: m.away.abbr, score: as },
        finishedAt: Date.now(),
        source: 'live',
      });
    }
  }, [phase, leagueId, currentWeek, weeks, slip, resolveSelection, scoreOf, sport, leagueMeta]);

  useEffect(() => {
    settle();
  }, [settle]);

  return {
    currentWeek,
    totalWeeks: total,
    phase,
    secondsToNextPhase,
    secondsToNextWeek,
    weeks,
  };
}

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
