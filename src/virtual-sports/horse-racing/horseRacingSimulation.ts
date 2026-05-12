import type { BetSelection, MatchEvent } from '../core/types';
import { RACE_TYPE_META, type RaceType } from './horseDatabase';
import { projectRace, type HorseEntry } from './horseRacingMarkets';

export interface SimulatedRace {
  finishOrder: string[];      // horseIds, 1st to last
  finishTimesMs: { [horseId: string]: number };
  events: MatchEvent[];
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function simulateRace(horses: HorseEntry[], raceType: RaceType, seed: number): SimulatedRace {
  const rand = mulberry32(seed);
  const projection = projectRace(horses, raceType);
  // Add noise to each horse's expected time
  const noisy: { id: string; t: number }[] = horses.map(h => {
    const expected = projection.expectedTimeMs[h.id];
    const noise = (rand() - 0.5) * expected * 0.06;   // ±3%
    return { id: h.id, t: expected + noise };
  });
  noisy.sort((a, b) => a.t - b.t);
  const finishOrder = noisy.map(n => n.id);
  const finishTimesMs: SimulatedRace['finishTimesMs'] = {};
  for (const n of noisy) finishTimesMs[n.id] = n.t;

  const events: MatchEvent[] = [{
    id: `r-start-${seed}`,
    minute: 0,
    type: 'kickoff',
    team: 'neutral',
    description: `And they're off! ${RACE_TYPE_META[raceType].distance} race underway.`,
  }];

  // Quarter-pole, half-pole, home stretch commentary
  for (const fraction of [0.25, 0.5, 0.75]) {
    const leader = noisy[0];
    const leaderHorse = horses.find(h => h.id === leader.id)!;
    events.push({
      id: `r-c-${seed}-${fraction}`,
      minute: Math.round(fraction * 60),
      type: 'corner',
      team: 'neutral',
      description: `${fraction === 0.25 ? 'Quarter pole' : fraction === 0.5 ? 'Half-mile mark' : 'Home stretch'} — #${leaderHorse.number} ${leaderHorse.name} leads.`,
    });
  }

  // Finish event
  const winner = horses.find(h => h.id === finishOrder[0])!;
  const second = horses.find(h => h.id === finishOrder[1])!;
  events.push({
    id: `r-finish-${seed}`,
    minute: 90,
    type: 'fulltime',
    team: 'neutral',
    description: `🏆 #${winner.number} ${winner.name} wins! #${second.number} ${second.name} second.`,
  });

  return { finishOrder, finishTimesMs, events };
}

export function resolveHorseSelection(selection: BetSelection, race: SimulatedRace): 'win' | 'loss' | 'void' {
  const { marketCategory, optionId } = selection;
  switch (marketCategory) {
    case 'WIN':
      return race.finishOrder[0] === optionId ? 'win' : 'loss';
    case 'PLACE':
      return race.finishOrder.slice(0, 3).includes(optionId) ? 'win' : 'loss';
    case 'FORECAST': {
      if (optionId === 'other') {
        // wins if the actual 1st-2nd combination wasn't one of the displayed top pairs
        return 'void'; // resolved against the displayed list by the caller
      }
      const [first, second] = optionId.split('>');
      return race.finishOrder[0] === first && race.finishOrder[1] === second ? 'win' : 'loss';
    }
    case 'QUINELLA': {
      if (optionId === 'other') return 'void';
      const [a, b] = optionId.split('+');
      const top2 = race.finishOrder.slice(0, 2);
      return top2.includes(a) && top2.includes(b) ? 'win' : 'loss';
    }
    default:
      return 'void';
  }
}
