import type { BetSelection, MatchEvent, Team } from '../core/types';
import { projectBasketball } from './basketballMarkets';

export interface SimulatedBasketball {
  homeId: string;
  awayId: string;
  finalScore: { home: number; away: number };
  quarterScores: { home: number; away: number }[];   // length 4
  events: MatchEvent[];
}

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

const PLAYERS = ['Smith','Johnson','Lee','Davis','Williams','Brown','Walker','Taylor','Green','Hill','Knight','Robinson','Foster','Reed'];

function randPlayer(rand: () => number): string {
  return PLAYERS[Math.floor(rand() * PLAYERS.length)];
}

function sampleNormal(rand: () => number, mean: number, std: number): number {
  const u1 = Math.max(0.0001, rand());
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

export function simulateBasketballMatch(home: Team, away: Team, seed: number): SimulatedBasketball {
  const rand = mulberry32(seed);
  const proj = projectBasketball(home, away);

  const finalHome = Math.max(70, Math.round(sampleNormal(rand, proj.homeMean, 8)));
  const finalAway = Math.max(70, Math.round(sampleNormal(rand, proj.awayMean, 8)));

  // Distribute points across 4 quarters (~25% each, jitter +/-).
  function splitQuarters(total: number): number[] {
    const base = total / 4;
    const q = [base, base, base, base].map(v => v + (rand() - 0.5) * 6);
    // round and rebalance to sum exactly to total
    let rounded = q.map(v => Math.max(15, Math.round(v)));
    let diff = total - rounded.reduce((s, v) => s + v, 0);
    rounded[3] += diff;
    return rounded;
  }
  const homeQ = splitQuarters(finalHome);
  const awayQ = splitQuarters(finalAway);
  const quarterScores = [0, 1, 2, 3].map(i => ({ home: homeQ[i], away: awayQ[i] }));

  // Build event timeline. 1 simulated game = 48 game-minutes. We tag scoring "events"
  // periodically (1 per ~90 seconds of game time) plus fouls and timeouts.
  const events: MatchEvent[] = [{
    id: `bb-tip-${seed}`, minute: 0, type: 'kickoff', team: 'neutral',
    description: `Tip-off! ${home.shortName} vs ${away.shortName}.`,
  }];

  let runningHome = 0;
  let runningAway = 0;
  for (let q = 0; q < 4; q++) {
    const startMin = q * 12;
    // ~6 scoring "highlights" per quarter
    for (let s = 0; s < 6; s++) {
      const minute = startMin + Math.floor(s * 2 + rand() * 1.5);
      const ratio = (s + 1) / 6;
      const targetHome = Math.round(homeQ[q] * ratio);
      const targetAway = Math.round(awayQ[q] * ratio);
      const homeBefore = runningHome - homeQ.slice(0, q).reduce((a, b) => a + b, 0);
      const awayBefore = runningAway - awayQ.slice(0, q).reduce((a, b) => a + b, 0);
      if (targetHome > homeBefore) {
        const pts = targetHome - homeBefore;
        const player = randPlayer(rand);
        const shot = pts >= 3 ? '3-pointer' : pts === 2 ? 'jump shot' : 'free throw';
        runningHome += pts;
        events.push({
          id: `bb-h-${seed}-${q}-${s}`, minute, type: 'goal', team: 'home', player,
          description: `🏀 ${player} drains a ${shot}! ${home.shortName} (${runningHome}-${runningAway})`,
        });
      }
      if (targetAway > awayBefore) {
        const pts = targetAway - awayBefore;
        const player = randPlayer(rand);
        const shot = pts >= 3 ? '3-pointer' : pts === 2 ? 'jump shot' : 'free throw';
        runningAway += pts;
        events.push({
          id: `bb-a-${seed}-${q}-${s}`, minute: minute + 0.5, type: 'goal', team: 'away', player,
          description: `🏀 ${player} answers with a ${shot}. ${home.shortName} (${runningHome}-${runningAway})`,
        });
      }
    }
    // Quarter break
    if (q < 3) {
      events.push({
        id: `bb-qb-${seed}-${q}`, minute: startMin + 12, type: 'halftime', team: 'neutral',
        description: q === 1 ? 'Halftime.' : `End of Q${q + 1}.`,
      });
    }
  }
  // Fouls
  for (let i = 0; i < 3; i++) {
    const team: 'home' | 'away' = rand() < 0.5 ? 'home' : 'away';
    events.push({
      id: `bb-f-${seed}-${i}`,
      minute: 5 + Math.floor(rand() * 38),
      type: 'yellow-card',
      team,
      player: randPlayer(rand),
      description: `Foul called on ${team === 'home' ? home.shortName : away.shortName}.`,
    });
  }
  // Timeouts
  for (let i = 0; i < 2; i++) {
    events.push({
      id: `bb-to-${seed}-${i}`,
      minute: 8 + Math.floor(rand() * 38),
      type: 'substitution',
      team: rand() < 0.5 ? 'home' : 'away',
      description: 'Timeout called — teams huddle.',
    });
  }
  events.push({ id: `bb-ft-${seed}`, minute: 48, type: 'fulltime', team: 'neutral', description: `Final: ${home.shortName} ${finalHome} – ${finalAway} ${away.shortName}.` });
  events.sort((a, b) => a.minute - b.minute);

  return {
    homeId: home.id,
    awayId: away.id,
    finalScore: { home: finalHome, away: finalAway },
    quarterScores,
    events,
  };
}

export function resolveBasketballSelection(selection: BetSelection, match: SimulatedBasketball): 'win' | 'loss' | 'void' {
  const { marketCategory, optionId, marketId } = selection;
  const { home: h, away: a } = match.finalScore;
  const total = h + a;
  const diff = h - a;

  switch (marketCategory) {
    case 'WINNER':
      if (optionId === 'home') return h > a ? 'win' : 'loss';
      if (optionId === 'away') return a > h ? 'win' : 'loss';
      return 'loss';
    case 'SPREAD': {
      const m = marketId.match(/spread-(-?\d+(?:\.\d+)?)/);
      if (!m) return 'void';
      const line = parseFloat(m[1]);
      // line is from the home-team perspective
      if (optionId === 'home') return diff - line > 0 ? 'win' : 'loss';
      if (optionId === 'away') return diff - line < 0 ? 'win' : 'loss';
      return 'loss';
    }
    case 'TOTAL_POINTS': {
      const m = marketId.match(/total-(-?\d+(?:\.\d+)?)/);
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
    case 'PERIOD_WINNER': {
      const q1 = match.quarterScores[0];
      if (optionId === 'home') return q1.home > q1.away ? 'win' : 'loss';
      if (optionId === 'away') return q1.away > q1.home ? 'win' : 'loss';
      return 'loss';
    }
    case 'HALF_TIME': {
      const h1 = match.quarterScores[0].home + match.quarterScores[1].home;
      const a1 = match.quarterScores[0].away + match.quarterScores[1].away;
      if (optionId === 'home') return h1 > a1 ? 'win' : 'loss';
      if (optionId === 'away') return a1 > h1 ? 'win' : 'loss';
      return 'loss';
    }
    default:
      return 'void';
  }
}

export function basketballEventsUpTo(events: MatchEvent[], gameMinute: number): MatchEvent[] {
  return events.filter(e => e.minute <= gameMinute);
}
