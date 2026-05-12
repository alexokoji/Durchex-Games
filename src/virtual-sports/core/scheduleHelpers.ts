import type { Team } from './types';

/** Cooldown: a matchup that played in any of the last N rounds is suppressed. */
export const REMATCH_COOLDOWN = 5;

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generate a matchday's fixtures with real-league constraints:
 *   • Each team appears in at most one match in the round.
 *   • Matchups that played within `forbiddenPairs` (typically the last N rounds)
 *     are avoided when an alternative exists. If every remaining candidate
 *     for a team is forbidden, the algorithm relaxes the constraint for that
 *     team only — a guaranteed fallback so small leagues still produce fixtures.
 *
 * The pairing order, side allocation, and tiebreaks are all driven by `roundSeed`
 * so the same round always produces the same fixtures.
 */
export function buildRoundPairings(
  teams: Team[],
  roundSeed: number,
  forbiddenPairs: Set<string>,
  maxMatches?: number,
): { home: Team; away: Team }[] {
  if (teams.length < 2) return [];

  const cap = Math.floor(teams.length / 2);
  const target = Math.min(maxMatches ?? cap, cap);
  if (target === 0) return [];

  // Deterministic seeded order over teams — different each round so the
  // "starting" team in the greedy match rotates and we get varied pairings.
  const ordered = [...teams].sort(
    (a, b) => hash(a.id + ':' + roundSeed) - hash(b.id + ':' + roundSeed),
  );

  const usedIds = new Set<string>();
  const matchups: { home: Team; away: Team }[] = [];

  for (let i = 0; i < ordered.length && matchups.length < target; i++) {
    const home = ordered[i];
    if (usedIds.has(home.id)) continue;

    // First pass: find an opponent that is NOT a recent rematch.
    let opponent: Team | null = null;
    for (let j = i + 1; j < ordered.length; j++) {
      const candidate = ordered[j];
      if (usedIds.has(candidate.id)) continue;
      const key = pairKey(home.id, candidate.id);
      if (!forbiddenPairs.has(key)) {
        opponent = candidate;
        break;
      }
    }
    // Fallback: every available opponent is on cooldown — pick the first one
    // anyway so this team doesn't sit out unnecessarily.
    if (!opponent) {
      for (let j = i + 1; j < ordered.length; j++) {
        const candidate = ordered[j];
        if (!usedIds.has(candidate.id)) { opponent = candidate; break; }
      }
    }
    if (!opponent) continue;

    usedIds.add(home.id);
    usedIds.add(opponent.id);

    // Flip home/away based on the seed so the same pair alternates venues.
    const flip = hash(pairKey(home.id, opponent.id) + ':side:' + roundSeed) % 2 === 1;
    matchups.push(flip ? { home: opponent, away: home } : { home, away: opponent });
  }

  return matchups;
}

/** Mutable rolling history used by sport schedule hooks. */
export interface RecentPairsHistory {
  /** Map of round-number -> set of pair keys played that round. */
  rounds: Map<number, Set<string>>;
}

export function createRecentPairsHistory(): RecentPairsHistory {
  return { rounds: new Map() };
}

export function forbiddenPairsForRound(history: RecentPairsHistory, currentRound: number): Set<string> {
  const out = new Set<string>();
  for (let r = currentRound - REMATCH_COOLDOWN; r < currentRound; r++) {
    const past = history.rounds.get(r);
    if (past) past.forEach(k => out.add(k));
  }
  return out;
}

export function recordRoundPairings(history: RecentPairsHistory, round: number, pairs: { home: Team; away: Team }[]): void {
  history.rounds.set(round, new Set(pairs.map(p => pairKey(p.home.id, p.away.id))));
  // Drop rounds older than the cooldown window.
  for (const r of history.rounds.keys()) {
    if (r < round - REMATCH_COOLDOWN) history.rounds.delete(r);
  }
}
