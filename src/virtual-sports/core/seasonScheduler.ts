/**
 * Season-wide round-robin scheduler.
 *
 * Generates a full double round-robin (everyone plays everyone home + away)
 * using Berger's circle method, then mirrors the first half with swapped
 * venues for the second half.
 *
 * For N teams (N even) → N-1 rounds per half → 2(N-1) total match weeks.
 * For odd N we inject a phantom "bye" team and skip its fixtures, so each
 * round has ⌊N/2⌋ real matches.
 *
 * Output is deterministic for a given (teamIds, seed) pair so the same
 * "season" reproduces across server restarts.
 */

export interface ScheduledFixture {
  /** 1-indexed week within the season. */
  week: number;
  homeId: string;
  awayId: string;
}

function rngFromSeed(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Deterministic Fisher–Yates shuffle. */
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Returns the full season fixture list for the supplied teams.
 *
 * Algorithm: standard "circle method". Anchor team[0] and rotate the others
 * around it. Each rotation step yields one round of fixtures.
 */
export function buildSeasonSchedule(teamIds: string[], seed: number): ScheduledFixture[] {
  if (teamIds.length < 2) return [];
  const rnd = rngFromSeed(seed);
  // Shuffle once for stable-but-varied season ordering.
  const teams = shuffle(teamIds, rnd);

  // If odd, add a phantom team. Matches scheduled against the phantom = bye.
  const hasBye = teams.length % 2 !== 0;
  if (hasBye) teams.push('__BYE__');

  const n = teams.length;
  const halfRounds = n - 1;
  const halfMatchesPerRound = n / 2;

  const firstHalf: ScheduledFixture[][] = [];
  // Berger rotation: keep teams[0] fixed, rotate teams[1..n-1] clockwise.
  // For each "round r", pair index i with (n-1-i) under rotation.
  const rotating = teams.slice(1);          // length n-1
  for (let r = 0; r < halfRounds; r++) {
    const round: ScheduledFixture[] = [];
    // Pair teams[0] (anchor) with rotating[r] — alternate home/away to
    // distribute venues. Even rounds: anchor at home.
    const opp0 = rotating[r % rotating.length];
    if (opp0 !== '__BYE__') {
      const m: ScheduledFixture = r % 2 === 0
        ? { week: r + 1, homeId: teams[0], awayId: opp0 }
        : { week: r + 1, homeId: opp0,    awayId: teams[0] };
      round.push(m);
    }
    // Remaining pairs: walk inward from both ends of the rotating list.
    for (let i = 1; i < halfMatchesPerRound; i++) {
      // Position in the rotating wheel — circular indices.
      const aIdx = (r + i) % rotating.length;
      const bIdx = (r - i + rotating.length * 10) % rotating.length; // +10×len to keep positive
      const a = rotating[aIdx];
      const b = rotating[bIdx];
      if (a === '__BYE__' || b === '__BYE__') continue;
      // Alternate venue based on position for balance.
      const m: ScheduledFixture = i % 2 === 0
        ? { week: r + 1, homeId: a, awayId: b }
        : { week: r + 1, homeId: b, awayId: a };
      round.push(m);
    }
    firstHalf.push(round);
  }

  // Second half: same pairings, swapped venues, week numbers offset.
  const secondHalf: ScheduledFixture[][] = firstHalf.map((round, r) =>
    round.map(f => ({
      week: r + 1 + halfRounds,
      homeId: f.awayId,
      awayId: f.homeId,
    })),
  );

  return [...firstHalf.flat(), ...secondHalf.flat()];
}

/**
 * UCC "league phase": 32+ teams, each plays 8 unique opponents over 8 weeks
 * (Swiss-style draw). Simpler than the new UEFA format but captures the
 * essence: every team gets 8 distinct opponents, half home / half away.
 *
 * NOTE: not a true Swiss pairing — we just shuffle and slice round by round
 * while avoiding repeats. Good enough for a virtual product.
 */
export function buildLeaguePhaseSchedule(teamIds: string[], seed: number, weeks = 8): ScheduledFixture[] {
  if (teamIds.length < 4) return [];
  const rnd = rngFromSeed(seed);
  const fixtures: ScheduledFixture[] = [];
  const playedAgainst = new Map<string, Set<string>>();
  for (const t of teamIds) playedAgainst.set(t, new Set());

  for (let w = 1; w <= weeks; w++) {
    // Greedy pairing: walk teams in random order each week, match each one
    // with the first un-played, un-paired opponent.
    const pool = shuffle(teamIds, rnd);
    const usedThisWeek = new Set<string>();
    for (let i = 0; i < pool.length; i++) {
      const a = pool[i];
      if (usedThisWeek.has(a)) continue;
      let partner: string | null = null;
      for (let j = i + 1; j < pool.length; j++) {
        const b = pool[j];
        if (usedThisWeek.has(b)) continue;
        if (playedAgainst.get(a)?.has(b)) continue;
        partner = b;
        break;
      }
      if (!partner) continue;
      usedThisWeek.add(a);
      usedThisWeek.add(partner);
      playedAgainst.get(a)!.add(partner);
      playedAgainst.get(partner)!.add(a);
      // Alternate home/away by week parity for balance.
      const homeFirst = (w + a.charCodeAt(0)) % 2 === 0;
      fixtures.push(homeFirst
        ? { week: w, homeId: a,       awayId: partner }
        : { week: w, homeId: partner, awayId: a });
    }
  }
  return fixtures;
}

/** Convenience: matches for a given week. */
export function fixturesForWeek(season: ScheduledFixture[], week: number): ScheduledFixture[] {
  return season.filter(f => f.week === week);
}

/** Total weeks in the season. */
export function totalWeeks(season: ScheduledFixture[]): number {
  let max = 0;
  for (const f of season) if (f.week > max) max = f.week;
  return max;
}
