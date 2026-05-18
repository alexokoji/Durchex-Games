// Recent results store + generator.
//
// Virtual matches run client-side, so we don't have a server-side history.
// Two paths converge here:
//   1. When the live page finishes a simulation, the page calls
//      `pushRecentResult({ ... })` so the next visit shows it.
//   2. On a cold start with no stored history, we generate plausible recent
//      results so the "Recent results" panel never looks empty.
//
// Stored in localStorage, keyed by sport. Capped at 60 per sport.

import { TEAMS } from './teamDatabase';
import { LEAGUES } from './leagueDatabase';
import type { SportKey, Team } from './types';

const STORAGE_KEY = 'duchex.virtual.results.v1';
const CAP_PER_SPORT = 60;

export interface RecentResult {
  id: string;
  sport: SportKey;
  leagueId: string;
  leagueName: string;
  home: { id: string; name: string; abbr: string; score: number };
  away: { id: string; name: string; abbr: string; score: number };
  finishedAt: number;          // epoch ms
  /** "live" if it just finished in this session; "history" if generated. */
  source: 'live' | 'history';
}

type Store = Partial<Record<SportKey, RecentResult[]>>;

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch { return {}; }
}

function save(store: Store): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* ignore */ }
}

export function pushRecentResult(r: Omit<RecentResult, 'id' | 'source'> & Partial<Pick<RecentResult, 'source'>>): void {
  const store = load();
  const list = store[r.sport] ?? [];
  const id = `${r.home.id}-${r.away.id}-${r.finishedAt}`;
  if (list.some(x => x.id === id)) return;
  list.unshift({ ...r, id, source: r.source ?? 'live' });
  store[r.sport] = list.slice(0, CAP_PER_SPORT);
  save(store);
}

export function getRecentResults(opts: { sport?: SportKey; leagueId?: string; limit?: number } = {}): RecentResult[] {
  const store = load();
  const sports: SportKey[] = opts.sport ? [opts.sport] : (Object.keys(store) as SportKey[]);
  let pool: RecentResult[] = [];
  for (const s of sports) pool = pool.concat(store[s] ?? []);
  if (opts.leagueId) pool = pool.filter(r => r.leagueId === opts.leagueId);
  pool.sort((a, b) => b.finishedAt - a.finishedAt);
  return pool.slice(0, opts.limit ?? 30);
}

// ─── Generator (used on cold start) ──────────────────────────────────────

function rngFromSeed(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function generateScore(home: Team, away: Team, sport: SportKey, rnd: () => number): { hs: number; as: number } {
  if (sport === 'basketball') {
    const hs = Math.round(85 + (home.ratings.attack - away.ratings.defense) / 6 + rnd() * 25);
    const as = Math.round(85 + (away.ratings.attack - home.ratings.defense) / 6 + rnd() * 25);
    return { hs, as };
  }
  if (sport === 'hockey') {
    const hs = Math.round(1 + (home.ratings.attack - away.ratings.defense) / 30 + rnd() * 4);
    const as = Math.round(1 + (away.ratings.attack - home.ratings.defense) / 30 + rnd() * 4);
    return { hs: Math.max(0, hs), as: Math.max(0, as) };
  }
  // Soccer-ish: Poisson-lite around 1.2–1.5 goals/team
  const homeLambda = 1.0 + (home.ratings.attack - away.ratings.defense) / 50 + 0.2;
  const awayLambda = 1.0 + (away.ratings.attack - home.ratings.defense) / 50;
  const hs = Math.min(7, Math.max(0, Math.round(homeLambda + (rnd() - 0.5) * 2.4)));
  const as = Math.min(6, Math.max(0, Math.round(awayLambda + (rnd() - 0.5) * 2.0)));
  return { hs, as };
}

/**
 * Generates `count` plausible recent results across the supplied sport. Used
 * as a one-shot seed when the user first opens the panel. Deterministic per
 * (sport, day) so refreshing doesn't constantly shuffle scores.
 */
export function generateRecentResults(sport: SportKey, count = 24): RecentResult[] {
  const today = new Date();
  const seed = sport.charCodeAt(0) * 31 + today.getUTCFullYear() * 366 + today.getUTCMonth() * 31 + today.getUTCDate();
  const rnd = rngFromSeed(seed);

  // Filter teams to leagues of this sport.
  const sportLeagues = LEAGUES.filter(l => l.sport === sport);
  if (sportLeagues.length === 0) return [];
  const teamsBySport = TEAMS.filter(t => sportLeagues.some(l => l.id === t.leagueId));
  if (teamsBySport.length < 4) return [];

  const out: RecentResult[] = [];
  for (let i = 0; i < count; i++) {
    const league = sportLeagues[Math.floor(rnd() * sportLeagues.length)];
    const teamsInLeague = teamsBySport.filter(t => t.leagueId === league.id);
    if (teamsInLeague.length < 2) continue;
    const homeIdx = Math.floor(rnd() * teamsInLeague.length);
    let awayIdx = Math.floor(rnd() * teamsInLeague.length);
    if (awayIdx === homeIdx) awayIdx = (awayIdx + 1) % teamsInLeague.length;
    const home = teamsInLeague[homeIdx];
    const away = teamsInLeague[awayIdx];
    const { hs, as } = generateScore(home, away, sport, rnd);
    // Spread fake match times over the past ~6h.
    const finishedAt = Date.now() - Math.floor(rnd() * 6 * 60 * 60 * 1000);
    out.push({
      id: `gen-${seed}-${i}`,
      sport,
      leagueId: league.id,
      leagueName: league.shortName,
      home: { id: home.id, name: home.shortName, abbr: home.abbr, score: hs },
      away: { id: away.id, name: away.shortName, abbr: away.abbr, score: as },
      finishedAt,
      source: 'history',
    });
  }
  return out.sort((a, b) => b.finishedAt - a.finishedAt);
}

/**
 * Returns the visible result list — actual live results first, padded with
 * generated history if we don't have enough yet.
 */
export function getResultsForView(opts: { sport: SportKey; leagueId?: string; limit?: number } = { sport: 'soccer' }): RecentResult[] {
  const stored = getRecentResults({ sport: opts.sport, leagueId: opts.leagueId, limit: opts.limit ?? 30 });
  if (stored.length >= (opts.limit ?? 20)) return stored;
  const generated = generateRecentResults(opts.sport, 30).filter(r => !opts.leagueId || r.leagueId === opts.leagueId);
  // Combine and dedupe by team-pair (live result wins over generated).
  const pairs = new Set(stored.map(r => `${r.home.id}-${r.away.id}`));
  const merged = stored.concat(generated.filter(g => !pairs.has(`${g.home.id}-${g.away.id}`)));
  merged.sort((a, b) => b.finishedAt - a.finishedAt);
  return merged.slice(0, opts.limit ?? 30);
}
