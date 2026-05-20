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
let cacheDayKey = '';

function ensureCache(): void {
  const d = new Date();
  const dayKey = `${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}`;
  if (dayKey !== cacheDayKey) {
    simCache.clear();
    cacheDayKey = dayKey;
  }
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

  // Phase clock — replicate useLeagueSeason's algorithm. The active week
  // rotates around the season; absolute week N in the matchId maps to a
  // slot in the rotation based on today's anchor.
  const anchor = utcMidnight();
  const now = Date.now();
  const elapsedSec = Math.max(0, Math.floor((now - anchor) / 1000));

  // The fixtures cycle every `totalWeeks` weeks. Without rebuilding the full
  // schedule we don't know totalWeeks, but we can still locate parsed.week's
  // slot WITHIN today's cycle by looking at which week is currently live.
  const currentWeekSlot = Math.floor(elapsedSec / WEEK_S) + 1;
  const secondsIntoWeek = elapsedSec % WEEK_S;

  // Distance (in weeks) between this match's encoded week and the current
  // active slot, treating the slot as the live week.
  // If parsed.week === currentWeekSlot → the match is the current week.
  // If parsed.week > currentWeekSlot   → upcoming (still in pre-booking).
  // If parsed.week < currentWeekSlot   → already finished.
  let phase: SelectionPhase;
  let liveProgress = 0;
  if (parsed.week === currentWeekSlot) {
    phase = secondsIntoWeek < BETTING_S ? 'betting'
          : secondsIntoWeek < BETTING_S + LIVE_S ? 'live'
          : 'finished';
    liveProgress = phase === 'live'
      ? Math.max(0, Math.min(1, (secondsIntoWeek - BETTING_S) / LIVE_S))
      : phase === 'finished' ? 1
      : 0;
  } else if (parsed.week > currentWeekSlot) {
    phase = 'betting';
    liveProgress = 0;
  } else {
    phase = 'finished';
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
