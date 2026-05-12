import type { Market, MarketOption } from '../core/types';
import { probabilitiesToOdds, DEFAULT_OVERROUND, clampOdds } from '../core/oddsEngine';
import { RACE_TYPE_META, type RaceType } from './horseDatabase';

export interface HorseEntry {
  id: string;        // unique within race
  number: number;    // 1..n  (race number)
  name: string;
  silkPrimary: string;
  silkSecondary: string;
  jockey: string;
  speed: number;     // 50-95
  acceleration: number;
  stamina: number;
  form: number;      // -10..+10
}

export interface RaceProjection {
  expectedTimeMs: { [horseId: string]: number };
  winProb:        { [horseId: string]: number };
  placeProb:      { [horseId: string]: number };  // top 3 finish
}

export function projectRace(horses: HorseEntry[], raceType: RaceType): RaceProjection {
  const meta = RACE_TYPE_META[raceType];
  const expectedTimeMs: RaceProjection['expectedTimeMs'] = {};
  const composite: { id: string; comp: number }[] = [];
  for (const h of horses) {
    const score = h.speed * meta.weights.speed + h.acceleration * meta.weights.accel + h.stamina * meta.weights.stamina + h.form * 0.6;
    // higher score = lower time. Base from meta + adjustment.
    const adjustment = (75 - score) * 0.4;
    const eta = (meta.baseSeconds + adjustment) * 1000;
    expectedTimeMs[h.id] = eta;
    composite.push({ id: h.id, comp: score });
  }
  // Soft-max into probabilities (sharper for shorter races, flatter for longer).
  const tau = raceType === 'sprint' ? 3.5 : raceType === 'medium' ? 4.5 : 5.5;
  const expScores = composite.map(c => Math.exp(c.comp / tau));
  const sumExp = expScores.reduce((s, v) => s + v, 0);
  const winProb: RaceProjection['winProb'] = {};
  composite.forEach((c, i) => { winProb[c.id] = expScores[i] / sumExp; });

  // Place (top 3) approximated from win prob via Harville model.
  const placeProb: RaceProjection['placeProb'] = {};
  const ids = composite.map(c => c.id);
  for (const id of ids) {
    let p3 = winProb[id];
    // P(finish 2nd) = sum over others i of pi/(1-pi) * pHere
    let p2 = 0;
    for (const otherId of ids) {
      if (otherId === id) continue;
      p2 += winProb[otherId] * (winProb[id] / Math.max(0.0001, 1 - winProb[otherId]));
    }
    // P(finish 3rd) ≈ same idea, two layers deep — we approximate.
    const p3rd = 0.7 * p2;
    placeProb[id] = Math.min(0.96, p3 + p2 + p3rd);
  }
  return { expectedTimeMs, winProb, placeProb };
}

function makeMarket(raceId: string, suffix: string, category: Market['category'], label: string, options: MarketOption[]): Market {
  return { id: `${raceId}-${suffix}`, matchId: raceId, category, label, options, status: 'open' };
}

function makeOpts(probs: { id: string; label: string; shortLabel?: string; p: number }[], overround = DEFAULT_OVERROUND): MarketOption[] {
  const odds = probabilitiesToOdds(probs.map(p => p.p), overround);
  return probs.map((p, i) => ({ id: p.id, label: p.label, shortLabel: p.shortLabel, odds: odds[i] }));
}

export function buildRaceMarkets(raceId: string, horses: HorseEntry[], raceType: RaceType): { markets: Market[]; projection: RaceProjection } {
  const projection = projectRace(horses, raceType);
  const markets: Market[] = [];

  // WIN
  markets.push(makeMarket(raceId, 'win', 'WIN', 'Win', makeOpts(horses.map(h => ({
    id: h.id, label: `#${h.number} ${h.name}`, shortLabel: `#${h.number}`, p: projection.winProb[h.id],
  })), DEFAULT_OVERROUND * 1.05)));

  // PLACE (top 3 finish)
  markets.push(makeMarket(raceId, 'place', 'PLACE', 'Place (Top 3)', makeOpts(horses.map(h => ({
    id: h.id, label: `#${h.number} ${h.name}`, shortLabel: `#${h.number}`, p: projection.placeProb[h.id],
  })), DEFAULT_OVERROUND * 1.04)));

  // Top-N Forecast (1st AND 2nd in order) – build top 8 most likely pairs.
  const orderedIds = horses.slice().sort((a, b) => projection.winProb[b.id] - projection.winProb[a.id]);
  const forecastOpts: { id: string; label: string; p: number }[] = [];
  for (let i = 0; i < Math.min(4, orderedIds.length); i++) {
    for (let j = 0; j < Math.min(4, orderedIds.length); j++) {
      if (i === j) continue;
      const a = orderedIds[i], b = orderedIds[j];
      // Harville-style probability for exact order
      const p = projection.winProb[a.id] * (projection.winProb[b.id] / Math.max(0.0001, 1 - projection.winProb[a.id]));
      forecastOpts.push({ id: `${a.id}>${b.id}`, label: `#${a.number} → #${b.number}`, p });
    }
  }
  forecastOpts.sort((x, y) => y.p - x.p);
  const topForecast = forecastOpts.slice(0, 8);
  // these are sparse probabilities — bump them a bit so odds are reasonable display values
  const fcastTotalP = topForecast.reduce((s, o) => s + o.p, 0);
  const remainder = 1 - fcastTotalP;
  topForecast.push({ id: 'other', label: 'Any other order', p: Math.max(0.02, remainder) });
  markets.push(makeMarket(raceId, 'forecast', 'FORECAST', 'Forecast (1st-2nd in order)', makeOpts(topForecast.map(o => ({
    id: o.id, label: o.label, p: o.p,
  })), DEFAULT_OVERROUND * 1.18)));

  // Quinella (1st & 2nd in either order) – top 6 pairs
  const quinellaOpts: { id: string; label: string; p: number }[] = [];
  for (let i = 0; i < orderedIds.length; i++) {
    for (let j = i + 1; j < orderedIds.length; j++) {
      const a = orderedIds[i], b = orderedIds[j];
      const pa = projection.winProb[a.id] * (projection.winProb[b.id] / Math.max(0.0001, 1 - projection.winProb[a.id]));
      const pb = projection.winProb[b.id] * (projection.winProb[a.id] / Math.max(0.0001, 1 - projection.winProb[b.id]));
      quinellaOpts.push({ id: `${a.id}+${b.id}`, label: `#${a.number} & #${b.number}`, p: pa + pb });
    }
  }
  quinellaOpts.sort((x, y) => y.p - x.p);
  const topQui = quinellaOpts.slice(0, 8);
  const totalQ = topQui.reduce((s, o) => s + o.p, 0);
  topQui.push({ id: 'other', label: 'Any other pair', p: Math.max(0.05, 1 - totalQ) });
  markets.push(makeMarket(raceId, 'quinella', 'QUINELLA', 'Quinella (1st & 2nd any order)', makeOpts(topQui.map(o => ({
    id: o.id, label: o.label, p: o.p,
  })), DEFAULT_OVERROUND * 1.12)));

  return { markets, projection };
  void clampOdds;
}
