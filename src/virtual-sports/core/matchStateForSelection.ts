/**
 * Helpers that derive *current* match state from a stored `BetSelection`,
 * without needing the live `useLeagueSeason` hook. The bet slip uses this to
 * show live scores + per-selection status on open tickets, and to render
 * finished details on settled history rows.
 *
 * The derivation mirrors the exact same algorithm the sportsbook page uses
 * (`useLeagueSeason.ts` + `seasonScheduler.ts`) so the numbers always agree.
 * Everything is deterministic for a given UTC day + leagueId, so as long as
 * the ticket was placed today we can recompute the match it points at.
 *
 * If a ticket survives a UTC day rollover, the season seed and fixture order
 * change → the ticket's matchId no longer maps to a fixture. In that case
 * `deriveMatchState` returns null and the UI shows an "awaiting result"
 * placeholder. The settlement path (see useLeagueSeason → settleOutcomes)
 * snapshots per-selection results onto the ticket BEFORE moving it to
 * history, so the day-rollover edge case only affects display of *open*
 * tickets, never settled ones.
 */
import type { BetSelection, MatchEvent, SportKey, Team } from './types';
import { teamsByLeague } from './teamDatabase';
import { getLeague } from './leagueDatabase';
import { buildSeasonSchedule, buildLeaguePhaseSchedule } from './seasonScheduler';
import { simulateSoccerMatch } from '../soccer/soccerSimulation';
import { simulateBasketballMatch } from '../basketball/basketballSimulation';
import { simulateHockeyMatch } from '../hockey/hockeySimulation';
import { resolveSoccerSelection } from '../soccer/soccerSimulation';
import { resolveBasketballSelection } from '../basketball/basketballSimulation';
import { resolveHockeySelection } from '../hockey/hockeySimulation';

const BETTING_S  = 360;
const LIVE_S     = 180;
const FINISHED_S = 60;
const WEEK_S     = BETTING_S + LIVE_S + FINISHED_S;

export type SelectionPhase = 'betting' | 'live' | 'finished' | 'unknown';

export interface MatchStateForSelection {
  /** Sport — soccer/basketball/hockey. Horseracing is unsupported here. */
  sport: SportKey;
  /** Week number encoded in the matchId. */
  week: number;
  /** Phase of the match's week relative to `now`. */
  phase: SelectionPhase;
  /** Live progress 0..1 (only meaningful when phase === 'live'). */
  liveProgress: number;
  /** Final score from the simulation. */
  finalScore: { home: number; away: number };
  /** Live score derived from event log up to current progress (or final when finished). */
  liveScore: { home: number; away: number };
  /** What the selection's result is given the current scoreboard. While the
   *  match is still live this is "what would happen if the game ended now"
   *  — useful for showing players whether they're currently winning. */
  currentResult: 'win' | 'loss' | 'void';
  /** Same as currentResult but locked once the match finishes. */
  finalResult: 'win' | 'loss' | 'void';
}

interface ParsedMatchId {
  leagueId: string;
  week: number;
  homeId: string;
  awayId: string;
}

/**
 * matchIds look like `${leagueId}-w${week}-${homeId}-${awayId}`.
 * League IDs and team IDs don't contain `-` so a plain split is safe.
 */
function parseMatchId(matchId: string): ParsedMatchId | null {
  const parts = matchId.split('-');
  if (parts.length !== 4) return null;
  const [leagueId, wk, homeId, awayId] = parts;
  if (!wk.startsWith('w')) return null;
  const week = parseInt(wk.slice(1), 10);
  if (!Number.isFinite(week) || week < 1) return null;
  return { leagueId, week, homeId, awayId };
}

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

function utcMidnight(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function spanForSport(sport: SportKey): number {
  return sport === 'soccer' ? 90 : sport === 'basketball' ? 48 : 60;
}

function liveScoreFromEvents(
  events: MatchEvent[],
  finalScore: { home: number; away: number },
  sport: SportKey,
  liveProgress: number,
): { home: number; away: number } {
  if (liveProgress >= 1) return finalScore;
  if (liveProgress <= 0) return { home: 0, away: 0 };
  if (!events || events.length === 0) {
    // Fallback: scale final score by progress.
    const p = Math.max(0, Math.min(1, liveProgress));
    return { home: Math.floor(finalScore.home * p), away: Math.floor(finalScore.away * p) };
  }
  const fullSpan = spanForSport(sport);
  const minute = Math.floor(Math.min(fullSpan, liveProgress * fullSpan));
  let home = 0, away = 0;
  for (const e of events) {
    if (e.minute > minute) break;
    if (e.type !== 'goal') continue;
    if (e.team === 'home') home++;
    else if (e.team === 'away') away++;
  }
  // Match MatchPreview2D's clip-to-final behavior so the bet slip and preview agree.
  return {
    home: Math.min(home, finalScore.home),
    away: Math.min(away, finalScore.away),
  };
}

/**
 * Module-level cache keyed by `${leagueId}-${dayKey}-${matchId}`. Simulations
 * are deterministic so re-running them gives the same result, but they cost
 * a non-trivial amount of CPU per call. Caching means the open-bets list can
 * tick every second without burning the simulator.
 */
interface CacheEntry {
  sport: SportKey;
  finalScore: { home: number; away: number };
  events: MatchEvent[];
}
const simCache = new Map<string, CacheEntry>();
const totalWeeksCache = new Map<string, number>();
let cacheDayKey = '';

function ensureCache(): void {
  const d = new Date();
  const dayKey = `${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}`;
  if (dayKey !== cacheDayKey) {
    simCache.clear();
    totalWeeksCache.clear();
    cacheDayKey = dayKey;
  }
}

/**
 * Number of weeks in the league's current-day fixture set. We rebuild the
 * same schedule useLeagueSeason builds (same seed + same algorithm) so the
 * total matches across both, which lets the phase-clock MOD line up.
 */
function getTotalWeeks(leagueId: string): number {
  ensureCache();
  const cached = totalWeeksCache.get(leagueId);
  if (cached != null) return cached;
  const league = getLeague(leagueId);
  if (!league) { totalWeeksCache.set(leagueId, 0); return 0; }
  const teams = teamsByLeague(leagueId);
  if (teams.length < 2) { totalWeeksCache.set(leagueId, 0); return 0; }
  const seed = seasonSeedFor(leagueId);
  const fixtures = league.tier === 'continental'
    ? buildLeaguePhaseSchedule(teams.map(t => t.id), seed, 8)
    : buildSeasonSchedule(teams.map(t => t.id), seed);
  let m = 0;
  for (const f of fixtures) if (f.week > m) m = f.week;
  totalWeeksCache.set(leagueId, m);
  return m;
}

function getSimForMatch(parsed: ParsedMatchId): CacheEntry | null {
  ensureCache();
  const key = `${parsed.leagueId}-${parsed.week}-${parsed.homeId}-${parsed.awayId}`;
  const cached = simCache.get(key);
  if (cached) return cached;

  const league = getLeague(parsed.leagueId);
  if (!league) return null;
  const sport = league.sport as SportKey;
  if (sport === 'horseracing') return null;

  const teams = teamsByLeague(parsed.leagueId);
  const home: Team | undefined = teams.find(t => t.id === parsed.homeId);
  const away: Team | undefined = teams.find(t => t.id === parsed.awayId);
  if (!home || !away) return null;

  const seasonSeed = seasonSeedFor(parsed.leagueId);
  const seed = seasonSeed ^ (parsed.week * 7919) ^ hashStr(home.id + away.id);
  const sim = sport === 'soccer' ? simulateSoccerMatch(home, away, seed)
            : sport === 'basketball' ? simulateBasketballMatch(home, away, seed)
            : simulateHockeyMatch(home, away, seed);

  const entry: CacheEntry = {
    sport,
    finalScore: sim.finalScore,
    events: sim.events,
  };
  simCache.set(key, entry);
  return entry;
}

/**
 * Derive everything we need to render an open ticket's selection: the live
 * score, phase, and what the outcome would be if the game ended right now.
 * Returns null when the matchId can't be resolved (e.g. a ticket carried
 * over from yesterday — fixtures have re-rolled, the team IDs no longer
 * point at a known match).
 */
export function deriveMatchState(sel: BetSelection): MatchStateForSelection | null {
  const parsed = parseMatchId(sel.matchId);
  if (!parsed) return null;

  const cached = getSimForMatch(parsed);
  if (!cached) return null;

  // Phase clock — mirror useLeagueSeason's algorithm EXACTLY, including the
  // MOD-by-totalWeeks step. The season is short (e.g. 38 weeks × 10 min =
  // ~6.3h) and cycles multiple times per UTC day. Without the MOD, a bet
  // placed in the first cycle's week 8 would look "past" by the time the
  // second cycle's week 8 rolls around, leaking the result via a "finished"
  // phase + score chip even though the match hasn't actually played yet.
  const anchor = utcMidnight();
  const now = Date.now();
  const elapsedFromAnchor = Math.max(0, now - anchor);
  const totalWeeks = getTotalWeeks(parsed.leagueId);
  if (totalWeeks === 0) return null;
  const totalSeasonSeconds = totalWeeks * WEEK_S;
  const elapsedInLoopMs = elapsedFromAnchor % (totalSeasonSeconds * 1000);
  const elapsedSecondsInSeason = Math.floor(elapsedInLoopMs / 1000);
  const currentWeek = Math.min(totalWeeks, Math.floor(elapsedSecondsInSeason / WEEK_S) + 1);
  const secondsIntoWeek = elapsedSecondsInSeason % WEEK_S;

  // Distance (in weeks) between this match's encoded week and the current
  // active week, treating it as the live week.
  //   parsed.week === currentWeek → the match is the current week.
  //   parsed.week > currentWeek   → upcoming (still in pre-booking).
  //   parsed.week < currentWeek   → already finished THIS CYCLE; will come
  //                                  around again after totalWeeks - delta
  //                                  weeks, but is awaiting settle now.
  //
  // Special case: if a bet is placed far ahead (e.g. week 15 when we're in week 5),
  // the match won't enter 'finished' phase until that week arrives AND passes the
  // settlement phase. After settlement, it stays 'finished' for the rest of the day.
  let phase: SelectionPhase;
  let liveProgress = 0;
  if (parsed.week === currentWeek) {
    phase = secondsIntoWeek < BETTING_S ? 'betting'
          : secondsIntoWeek < BETTING_S + LIVE_S ? 'live'
          : 'finished';
    liveProgress = phase === 'live'
      ? Math.max(0, Math.min(1, (secondsIntoWeek - BETTING_S) / LIVE_S))
      : phase === 'finished' ? 1
      : 0;
  } else if (parsed.week > currentWeek) {
    phase = 'betting';
    liveProgress = 0;
  } else {
    // Week is in the past (may have wrapped around)
    // Check if enough time has passed for settlement to have occurred
    const weekDiff = currentWeek - parsed.week;
    const secondsSinceFinished = (weekDiff * WEEK_S) + (WEEK_S - secondsIntoWeek);
    
    // Give settlement ~1 minute to process after the finished phase
    // If more time has passed, the bet should be settled
    const settlementBuffer = 60; // seconds
    phase = secondsSinceFinished > settlementBuffer ? 'finished' : 'finished';
    liveProgress = 1;
  }

  const finalScore = cached.finalScore;
  const liveScore = liveScoreFromEvents(cached.events, finalScore, cached.sport, liveProgress);
  const finalResult = resolveFor(cached.sport, sel, finalScore);
  const currentResult = phase === 'finished' ? finalResult : resolveFor(cached.sport, sel, liveScore);

  return {
    sport: cached.sport,
    week: parsed.week,
    phase,
    liveProgress,
    finalScore,
    liveScore,
    currentResult,
    finalResult,
  };
}

/**
 * Resolve a selection against a (possibly partial) scoreboard. We thin-wrap
 * each sport's existing resolver by passing a minimal simulation object
 * (just the score) since 1X2 / DC / O-U / Winner / Spread / Total-Points
 * markets all read only `finalScore`. Markets that need event-level state
 * (correct score, first goal, etc.) will produce best-effort outputs.
 */
function resolveFor(
  sport: SportKey,
  sel: BetSelection,
  score: { home: number; away: number },
): 'win' | 'loss' | 'void' {
  if (sport === 'soccer') {
    return resolveSoccerSelection(sel, {
      homeId: '', awayId: '',
      finalScore: score,
      events: [],
      firstScorer: 'none', lastScorer: 'none',
      xg: { home: 0, away: 0 },
    });
  }
  if (sport === 'basketball') {
    return resolveBasketballSelection(sel, {
      homeId: '', awayId: '',
      finalScore: score,
      quarterScores: [],
      events: [],
    });
  }
  return resolveHockeySelection(sel, {
    homeId: '', awayId: '',
    finalScore: score,
    periodScores: [],
    events: [],
  });
}
