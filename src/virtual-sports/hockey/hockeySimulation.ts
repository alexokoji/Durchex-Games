import type { BetSelection, MatchEvent, Team } from '../core/types';
import { buildScoreGrid, computeHockeyExpectedGoals } from './hockeyMarkets';

export interface SimulatedHockey {
  homeId: string;
  awayId: string;
  finalScore: { home: number; away: number };
  periodScores: { home: number; away: number }[];   // length 3
  events: MatchEvent[];
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const FIRST = ['Mikko','Alex','Pavel','Sven','Jaromir','Connor','Tyler','Marc','Jack','Sergei','Logan','Brent','Dylan','Henri'];
const LAST  = ['Andersen','Petrov','Olsen','Karlsson','Tremblay','MacKenzie','Crosby','Vasilevski','Hawkins','Lindholm','Reilly'];
function player(rand: () => number): string {
  return `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`;
}

function sampleScore(grid: number[][], rand: () => number): { home: number; away: number } {
  const r = rand(); let cum = 0;
  for (let h = 0; h < grid.length; h++) for (let a = 0; a < grid[h].length; a++) {
    cum += grid[h][a]; if (r <= cum) return { home: h, away: a };
  }
  return { home: 0, away: 0 };
}

function distributeMinutes(count: number, totalMinutes: number, rand: () => number): number[] {
  const minutes: number[] = [];
  while (minutes.length < count) {
    const m = Math.max(1, Math.min(totalMinutes - 1, Math.floor(rand() * totalMinutes) + 1));
    if (!minutes.includes(m)) minutes.push(m);
  }
  return minutes.sort((a, b) => a - b);
}

export function simulateHockeyMatch(home: Team, away: Team, seed: number): SimulatedHockey {
  const rand = mulberry32(seed);
  const xg = computeHockeyExpectedGoals(home, away);
  const grid = buildScoreGrid(xg);
  const finalScore = sampleScore(grid, rand);
  const goalMinutes = distributeMinutes(finalScore.home + finalScore.away, 60, rand);
  const assignments: ('home' | 'away')[] = [];
  let hL = finalScore.home, aL = finalScore.away;
  for (let i = 0; i < goalMinutes.length; i++) {
    const tilt = hL / Math.max(1, hL + aL);
    if (rand() < tilt && hL > 0) { assignments.push('home'); hL--; }
    else if (aL > 0)              { assignments.push('away'); aL--; }
    else                          { assignments.push('home'); hL--; }
  }

  const periodScores = [{ home: 0, away: 0 }, { home: 0, away: 0 }, { home: 0, away: 0 }];
  const events: MatchEvent[] = [{
    id: `hk-puck-${seed}`, minute: 0, type: 'kickoff', team: 'neutral',
    description: `Puck drop! ${home.shortName} vs ${away.shortName}.`,
  }];

  for (let i = 0; i < goalMinutes.length; i++) {
    const minute = goalMinutes[i];
    const team = assignments[i];
    const period = Math.min(2, Math.floor(minute / 20));
    if (team === 'home') periodScores[period].home++;
    else periodScores[period].away++;
    const p = player(rand);
    const isPowerPlay = rand() < 0.2;
    events.push({
      id: `hk-g-${seed}-${i}`,
      minute,
      type: 'goal',
      team,
      player: p,
      description: isPowerPlay
        ? `🥅 GOAL on the power play! ${p} scores for ${team === 'home' ? home.shortName : away.shortName}.`
        : `🥅 GOAL! ${p} buries it for ${team === 'home' ? home.shortName : away.shortName}.`,
    });
  }

  // Period breaks
  events.push({ id: `hk-p1-${seed}`, minute: 20, type: 'halftime', team: 'neutral', description: 'End of 1st period.' });
  events.push({ id: `hk-p2-${seed}`, minute: 40, type: 'halftime', team: 'neutral', description: 'End of 2nd period.' });

  // Penalties (3-5)
  const penCount = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < penCount; i++) {
    const team: 'home' | 'away' = rand() < 0.5 ? 'home' : 'away';
    const reasons = ['Tripping', 'Hooking', 'High-sticking', 'Slashing', 'Interference', 'Cross-checking'];
    const reason = reasons[Math.floor(rand() * reasons.length)];
    events.push({
      id: `hk-pn-${seed}-${i}`,
      minute: 5 + Math.floor(rand() * 50),
      type: 'yellow-card',
      team,
      player: player(rand),
      description: `Penalty: ${reason} on ${team === 'home' ? home.shortName : away.shortName}.`,
    });
  }

  // Power play (1-2)
  for (let i = 0; i < 1 + Math.floor(rand() * 2); i++) {
    const team: 'home' | 'away' = rand() < 0.5 ? 'home' : 'away';
    events.push({
      id: `hk-pp-${seed}-${i}`,
      minute: 8 + Math.floor(rand() * 50),
      type: 'corner',
      team,
      description: `Power play opportunity for ${team === 'home' ? home.shortName : away.shortName}.`,
    });
  }

  events.push({ id: `hk-ft-${seed}`, minute: 60, type: 'fulltime', team: 'neutral', description: `Final: ${home.shortName} ${finalScore.home} – ${finalScore.away} ${away.shortName}.` });
  events.sort((a, b) => a.minute - b.minute);

  return { homeId: home.id, awayId: away.id, finalScore, periodScores, events };
}

export function resolveHockeySelection(selection: BetSelection, match: SimulatedHockey): 'win' | 'loss' | 'void' {
  const { marketCategory, optionId, marketId } = selection;
  const { home: h, away: a } = match.finalScore;
  const total = h + a;
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
    case 'OVER_UNDER': {
      const m = marketId.match(/ou-(-?\d+(?:\.\d+)?)/);
      if (!m) return 'void';
      const line = parseFloat(m[1]);
      if (optionId === 'over')  return total > line ? 'win' : 'loss';
      if (optionId === 'under') return total < line ? 'win' : 'loss';
      return 'loss';
    }
    case 'TEAM_TOTAL': {
      const m = marketId.match(/tt-(home|away)-(-?\d+(?:\.\d+)?)/);
      if (!m) return 'void';
      const side = m[1];
      const line = parseFloat(m[2]);
      const score = side === 'home' ? h : a;
      if (optionId === 'over')  return score > line ? 'win' : 'loss';
      if (optionId === 'under') return score < line ? 'win' : 'loss';
      return 'loss';
    }
    case 'HANDICAP': {
      const m = marketId.match(/ah-(-?\d+(?:\.\d+)?)/);
      if (!m) return 'void';
      const line = parseFloat(m[1]);
      const adj = h + line;
      if (optionId === 'home') return adj > a ? 'win' : 'loss';
      if (optionId === 'away') return a > adj ? 'win' : 'loss';
      return 'loss';
    }
    case 'PERIOD_WINNER': {
      const p1 = match.periodScores[0];
      if (optionId === '1') return p1.home > p1.away ? 'win' : 'loss';
      if (optionId === 'X') return p1.home === p1.away ? 'win' : 'loss';
      if (optionId === '2') return p1.away > p1.home ? 'win' : 'loss';
      return 'loss';
    }
    default:
      return 'void';
  }
}

export function hockeyEventsUpTo(events: MatchEvent[], gameMinute: number): MatchEvent[] {
  return events.filter(e => e.minute <= gameMinute);
}
