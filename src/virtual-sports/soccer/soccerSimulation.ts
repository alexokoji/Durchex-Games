import type { BetSelection, MatchEvent, Team } from '../core/types';
import { buildScoreGrid, computeExpectedGoals, computeEventRates, extractLine, type ScoreGrid } from './soccerMarkets';

export interface SimulatedMatch {
  homeId: string;
  awayId: string;
  finalScore: { home: number; away: number };
  events: MatchEvent[];        // ordered by minute
  firstScorer: 'home' | 'away' | 'none';
  lastScorer:  'home' | 'away' | 'none';
  xg: { home: number; away: number };
}

// Lightweight seeded RNG (mulberry32) for deterministic per-match simulation.
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ['Marco','Luca','Diego','Carlos','Andre','Kai','Tom','Jake','Sam','Leo','Noah','Felix','Ivan','Pierre','Jules','Oliver','Bruno','Pablo','Mateo','Tobias','Sergio'];
const LAST_NAMES  = ['Silva','Costa','Hernandez','Müller','Schmidt','Rossi','Bianchi','Garcia','Martinez','Lopez','Dubois','Petit','Smith','Jones','Brown','Wilson','Nakamura','Almeida','Kovac'];

function randomPlayer(rand: () => number): string {
  return `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`;
}

function sampleScoreFromGrid(grid: ScoreGrid, rand: () => number): { home: number; away: number } {
  const r = rand();
  let cum = 0;
  for (let h = 0; h < grid.length; h++) {
    for (let a = 0; a < grid[h].length; a++) {
      cum += grid[h][a];
      if (r <= cum) return { home: h, away: a };
    }
  }
  return { home: 0, away: 0 };
}

function distributeGoalMinutes(count: number, rand: () => number): number[] {
  // Slightly weight later minutes — football has more late goals than early ones.
  const minutes: number[] = [];
  while (minutes.length < count) {
    const u = rand();
    // bias the distribution: u^0.85 across [0,1]
    const minute = Math.max(1, Math.min(90, Math.floor(Math.pow(u, 0.85) * 90) + 1));
    if (!minutes.includes(minute)) minutes.push(minute);
  }
  return minutes.sort((a, b) => a - b);
}

export function simulateSoccerMatch(home: Team, away: Team, seed: number): SimulatedMatch {
  const rand = mulberry32(seed);
  const xg = computeExpectedGoals(home, away);
  const grid = buildScoreGrid(xg);
  const finalScore = sampleScoreFromGrid(grid, rand);

  const goalMinutes = distributeGoalMinutes(finalScore.home + finalScore.away, rand);
  const goalAssignments: ('home' | 'away')[] = [];
  // Interleave goals proportionally to each team's contribution.
  const totalGoals = finalScore.home + finalScore.away;
  let homeLeft = finalScore.home;
  let awayLeft = finalScore.away;
  for (let i = 0; i < totalGoals; i++) {
    const tilt = homeLeft / Math.max(1, homeLeft + awayLeft);
    if (rand() < tilt && homeLeft > 0) { goalAssignments.push('home'); homeLeft--; }
    else if (awayLeft > 0)              { goalAssignments.push('away'); awayLeft--; }
    else if (homeLeft > 0)              { goalAssignments.push('home'); homeLeft--; }
  }

  const events: MatchEvent[] = [{
    id: `e-kick-${seed}`,
    minute: 0,
    type: 'kickoff',
    team: 'neutral',
    description: `Kick-off! ${home.shortName} vs ${away.shortName}.`,
  }];

  // Goals
  for (let i = 0; i < goalMinutes.length; i++) {
    const minute = goalMinutes[i];
    const team = goalAssignments[i];
    const teamName = team === 'home' ? home.shortName : away.shortName;
    const player = randomPlayer(rand);
    const isPenalty = rand() < 0.12;
    events.push({
      id: `e-g-${seed}-${i}`,
      minute,
      type: isPenalty ? 'penalty' : 'goal',
      team,
      player,
      description: isPenalty
        ? `⚽ GOAL! ${player} converts the penalty for ${teamName}!`
        : `⚽ GOAL! ${player} finds the net for ${teamName}!`,
    });
  }

  // Halftime marker
  events.push({
    id: `e-ht-${seed}`,
    minute: 45,
    type: 'halftime',
    team: 'neutral',
    description: 'Half-time whistle.',
  });

  // Personality-driven event rates — aggressive sides produce more cards,
  // possession-heavy sides produce more corners, etc.
  const rates = computeEventRates(home, away);

  // Yellow cards — Poisson-style around `avgYellow`, biased toward the
  // more-aggressive side via `yellowHomeShare`.
  const yellowCount = Math.max(1, Math.round(rates.avgYellow + (rand() - 0.5) * 2));
  for (let i = 0; i < yellowCount; i++) {
    const minute = 10 + Math.floor(rand() * 75);
    const team: 'home' | 'away' = rand() < rates.yellowHomeShare ? 'home' : 'away';
    const player = randomPlayer(rand);
    events.push({
      id: `e-y-${seed}-${i}`,
      minute,
      type: 'yellow-card',
      team,
      player,
      description: `🟨 Yellow card for ${player} (${team === 'home' ? home.shortName : away.shortName}).`,
    });
  }

  // Red card — chance from aggregate aggression/discipline.
  if (rand() < rates.redChance) {
    const minute = 30 + Math.floor(rand() * 55);
    const team: 'home' | 'away' = rand() < rates.yellowHomeShare ? 'home' : 'away';
    const player = randomPlayer(rand);
    events.push({
      id: `e-r-${seed}`,
      minute,
      type: 'red-card',
      team,
      player,
      description: `🟥 RED CARD! ${player} is sent off for ${team === 'home' ? home.shortName : away.shortName}.`,
    });
  }

  // VAR disallowed goal — fixed-ish chance.
  if (rand() < rates.varDisallowed) {
    const minute = 20 + Math.floor(rand() * 65);
    const team: 'home' | 'away' = rand() < 0.5 ? 'home' : 'away';
    events.push({
      id: `e-var-${seed}`,
      minute,
      type: 'var-disallowed',
      team,
      description: `VAR check… GOAL DISALLOWED for ${team === 'home' ? home.shortName : away.shortName}!`,
    });
  }

  // Corners — rate from combined possession + pressing.
  const cornerCount = Math.max(2, Math.round(rates.cornersAvg + (rand() - 0.5) * 3));
  for (let i = 0; i < cornerCount; i++) {
    const minute = 5 + Math.floor(rand() * 85);
    // Possession-heavy side wins more corners (xG-tilt as proxy).
    const homeShare = xg.home / Math.max(0.001, xg.home + xg.away);
    const team: 'home' | 'away' = rand() < homeShare ? 'home' : 'away';
    events.push({
      id: `e-c-${seed}-${i}`,
      minute,
      type: 'corner',
      team,
      description: `Corner kick for ${team === 'home' ? home.shortName : away.shortName}.`,
    });
  }

  // Injury — chance from combined injury factors.
  if (rand() < rates.injuryChance) {
    const minute = 25 + Math.floor(rand() * 60);
    const team: 'home' | 'away' = rand() < 0.5 ? 'home' : 'away';
    const player = randomPlayer(rand);
    events.push({
      id: `e-i-${seed}`,
      minute,
      type: 'injury',
      team,
      player,
      description: `Injury concern — ${player} down for ${team === 'home' ? home.shortName : away.shortName}.`,
    });
  }

  events.push({
    id: `e-ft-${seed}`,
    minute: 90,
    type: 'fulltime',
    team: 'neutral',
    description: `Full-time! ${home.shortName} ${finalScore.home} – ${finalScore.away} ${away.shortName}.`,
  });

  events.sort((a, b) => a.minute - b.minute);

  const goalEvents = events.filter(e => e.type === 'goal' || e.type === 'penalty');
  const firstScorer: SimulatedMatch['firstScorer'] = goalEvents.length === 0
    ? 'none'
    : (goalEvents[0].team as 'home' | 'away');
  const lastScorer: SimulatedMatch['lastScorer'] = goalEvents.length === 0
    ? 'none'
    : (goalEvents[goalEvents.length - 1].team as 'home' | 'away');

  return { homeId: home.id, awayId: away.id, finalScore, events, firstScorer, lastScorer, xg };
}

// Resolve a single bet selection against the final simulated state.
export function resolveSoccerSelection(
  selection: BetSelection,
  match: SimulatedMatch,
): 'win' | 'loss' | 'void' {
  const { home: h, away: a } = match.finalScore;
  const { marketCategory, optionId, marketId, marketLabel } = selection;

  switch (marketCategory) {
    case '1X2':
      if (optionId === '1') return h > a ? 'win' : 'loss';
      if (optionId === 'X') return h === a ? 'win' : 'loss';
      if (optionId === '2') return a > h ? 'win' : 'loss';
      return 'loss';

    case 'DOUBLE_CHANCE':
      if (optionId === '1X') return h >= a ? 'win' : 'loss';
      if (optionId === '12') return h !== a ? 'win' : 'loss';
      if (optionId === 'X2') return a >= h ? 'win' : 'loss';
      return 'loss';

    case 'BTTS':
      return (optionId === 'yes') === (h > 0 && a > 0) ? 'win' : 'loss';

    case 'OVER_UNDER': {
      const line = extractLine(marketId) ?? 0;
      const total = h + a;
      if (optionId === 'over')  return total > line ? 'win' : 'loss';
      if (optionId === 'under') return total < line ? 'win' : 'loss';
      return 'loss';
    }

    case 'TEAM_TOTAL': {
      const line = extractLine(marketId) ?? 0;
      const side = marketId.includes('home') ? 'home' : 'away';
      const goals = side === 'home' ? h : a;
      if (optionId === 'over')  return goals > line ? 'win' : 'loss';
      if (optionId === 'under') return goals < line ? 'win' : 'loss';
      return 'loss';
    }

    case 'HANDICAP': {
      const line = extractLine(marketId) ?? 0;
      const adjusted = h + line;
      if (optionId === 'home') {
        if (adjusted === a) return 'void';
        return adjusted > a ? 'win' : 'loss';
      }
      if (optionId === 'away') {
        if (a === adjusted) return 'void';
        return a > adjusted ? 'win' : 'loss';
      }
      return 'loss';
    }

    case 'CORRECT_SCORE': {
      if (optionId === 'other') {
        // "other" wins when the score falls outside the top-13 most likely
        // scoreboard the market was built from (any side > 4 is a safe proxy).
        return (h > 4 || a > 4) ? 'win' : 'loss';
      }
      void marketLabel;
      return optionId === `${h}-${a}` ? 'win' : 'loss';
    }

    case 'FIRST_GOAL':
      if (optionId === 'none') return match.firstScorer === 'none' ? 'win' : 'loss';
      return optionId === match.firstScorer ? 'win' : 'loss';

    case 'LAST_GOAL':
      if (optionId === 'none') return match.lastScorer === 'none' ? 'win' : 'loss';
      return optionId === match.lastScorer ? 'win' : 'loss';

    case 'CLEAN_SHEET': {
      const side = marketId.includes('home') ? 'home' : 'away';
      const concededZero = side === 'home' ? a === 0 : h === 0;
      if (optionId === 'yes') return concededZero ? 'win' : 'loss';
      if (optionId === 'no')  return concededZero ? 'loss' : 'win';
      return 'loss';
    }

    case 'HALF_TIME': {
      // We don't simulate per-half goals precisely; approximate by counting
      // goal events before minute 45.
      const htHome = match.events.filter(e => (e.type === 'goal' || e.type === 'penalty') && e.team === 'home' && e.minute < 45).length;
      const htAway = match.events.filter(e => (e.type === 'goal' || e.type === 'penalty') && e.team === 'away' && e.minute < 45).length;
      if (optionId === '1') return htHome > htAway ? 'win' : 'loss';
      if (optionId === 'X') return htHome === htAway ? 'win' : 'loss';
      if (optionId === '2') return htAway > htHome ? 'win' : 'loss';
      return 'loss';
    }

    default:
      return 'void';
  }
}

// Events visible at the given simulated minute.
export function eventsUpTo(events: MatchEvent[], liveMinute: number): MatchEvent[] {
  return events.filter(e => e.minute <= liveMinute);
}
