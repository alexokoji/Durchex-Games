import type { Market, MarketOption, Team } from '../core/types';
import { probabilitiesToOdds, DEFAULT_OVERROUND } from '../core/oddsEngine';
import { teamStrength } from '../core/teamDatabase';

const BASE_TOTAL_POINTS = 220;       // mean points per game (both teams combined)
const POINT_DIFF_STD = 11;            // std-dev of margin
const TOTAL_POINTS_STD = 13;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hashMatchId(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export interface BasketballProjection {
  homeMean: number;
  awayMean: number;
  diffMean: number;
  diffStd: number;
  totalMean: number;
  totalStd: number;
}

export function projectBasketball(home: Team, away: Team): BasketballProjection {
  const homePower = teamStrength(home) + 3;   // home-court advantage
  const awayPower = teamStrength(away);
  const diffMean  = (homePower - awayPower) * 0.55;
  const totalMean = BASE_TOTAL_POINTS + ((home.ratings.attack + away.ratings.attack) - (home.ratings.defense + away.ratings.defense)) * 0.35;
  return {
    homeMean: (totalMean + diffMean) / 2,
    awayMean: (totalMean - diffMean) / 2,
    diffMean,
    diffStd: POINT_DIFF_STD,
    totalMean,
    totalStd: TOTAL_POINTS_STD,
  };
}

// Standard normal CDF approximation.
export function normalCdf(x: number, mean = 0, std = 1): number {
  const z = (x - mean) / std;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

function makeMarket(matchId: string, idSuffix: string, category: Market['category'], label: string, options: MarketOption[]): Market {
  return { id: `${matchId}-${idSuffix}`, matchId, category, label, options, status: 'open' };
}

function makeOptions(probs: { id: string; label: string; shortLabel?: string; p: number }[], overround = DEFAULT_OVERROUND): MarketOption[] {
  const odds = probabilitiesToOdds(probs.map(p => p.p), overround);
  return probs.map((p, i) => ({ id: p.id, label: p.label, shortLabel: p.shortLabel, odds: odds[i] }));
}

export function buildBasketballMarkets(matchId: string, home: Team, away: Team): { markets: Market[]; projection: BasketballProjection } {
  // Per-match seed-based perturbation on the projected scoring totals (±8%)
  // so the same matchup produces slightly different odds in different rounds.
  const matchRand = mulberry32(hashMatchId(matchId));
  const perturbTotal = 0.92 + matchRand() * 0.16;   // 0.92 – 1.08
  const perturbDiff  = 0.85 + matchRand() * 0.30;   // 0.85 – 1.15 (wider range on spread)
  const baseProj = projectBasketball(home, away);
  const proj: BasketballProjection = {
    ...baseProj,
    totalMean: baseProj.totalMean * perturbTotal,
    diffMean:  baseProj.diffMean  * perturbDiff,
    homeMean:  (baseProj.totalMean * perturbTotal + baseProj.diffMean * perturbDiff) / 2,
    awayMean:  (baseProj.totalMean * perturbTotal - baseProj.diffMean * perturbDiff) / 2,
  };

  const pHomeWin = 1 - normalCdf(0, proj.diffMean, proj.diffStd);
  const pAwayWin = 1 - pHomeWin;

  const markets: Market[] = [];

  // Winner (no draws in basketball)
  markets.push(makeMarket(matchId, 'winner', 'WINNER', 'Match Winner', makeOptions([
    { id: 'home', label: home.shortName, shortLabel: '1', p: pHomeWin },
    { id: 'away', label: away.shortName, shortLabel: '2', p: pAwayWin },
  ])));

  // Spread — common lines around the projected margin
  const spreadCenter = Math.round(proj.diffMean * 2) / 2;
  for (const offset of [-6.5, -3.5, 0.5, 3.5, 6.5]) {
    const line = spreadCenter + offset;
    if (Math.abs(line) > 18) continue;
    const pHome = 1 - normalCdf(line, proj.diffMean, proj.diffStd);
    markets.push(makeMarket(matchId, `spread-${line}`, 'SPREAD', `Spread (${formatSpread(line)})`, makeOptions([
      { id: 'home', label: `${home.abbr} ${formatSpread(-line)}`, p: pHome },
      { id: 'away', label: `${away.abbr} ${formatSpread(line)}`,  p: 1 - pHome },
    ])));
  }

  // Total points
  const totalCenter = Math.round(proj.totalMean / 5) * 5;
  for (const offset of [-10, -5, 0, 5, 10]) {
    const line = totalCenter + offset - 0.5;
    const pOver = 1 - normalCdf(line, proj.totalMean, proj.totalStd);
    markets.push(makeMarket(matchId, `total-${line}`, 'TOTAL_POINTS', `Total Points — Over/Under ${line}`, makeOptions([
      { id: 'over',  label: `Over ${line}`,  p: pOver },
      { id: 'under', label: `Under ${line}`, p: 1 - pOver },
    ])));
  }

  // Team Totals
  for (const side of ['home', 'away'] as const) {
    const team = side === 'home' ? home : away;
    const mean = side === 'home' ? proj.homeMean : proj.awayMean;
    const center = Math.round(mean / 5) * 5;
    for (const offset of [-5, 0, 5]) {
      const line = center + offset - 0.5;
      const pOver = 1 - normalCdf(line, mean, TOTAL_POINTS_STD * 0.75);
      markets.push(makeMarket(matchId, `tt-${side}-${line}`, 'TEAM_TOTAL', `${team.shortName} — Over/Under ${line}`, makeOptions([
        { id: 'over',  label: `Over ${line}`,  p: pOver },
        { id: 'under', label: `Under ${line}`, p: 1 - pOver },
      ])));
    }
  }

  // 1st Quarter Winner – pulled toward 50/50 because of small-sample variance
  const pQ1Home = 0.5 + (pHomeWin - 0.5) * 0.6;
  markets.push(makeMarket(matchId, 'q1-winner', 'PERIOD_WINNER', '1st Quarter Winner', makeOptions([
    { id: 'home', label: home.shortName, shortLabel: '1', p: pQ1Home },
    { id: 'away', label: away.shortName, shortLabel: '2', p: 1 - pQ1Home },
  ])));

  // Halftime Result — also pulled toward 50/50 a bit
  const pHtHome = 0.5 + (pHomeWin - 0.5) * 0.75;
  markets.push(makeMarket(matchId, 'ht-winner', 'HALF_TIME', 'Halftime Winner', makeOptions([
    { id: 'home', label: home.shortName, shortLabel: '1', p: pHtHome },
    { id: 'away', label: away.shortName, shortLabel: '2', p: 1 - pHtHome },
  ])));

  return { markets, projection: proj };
}

function formatSpread(n: number): string {
  if (n > 0) return `+${n}`;
  return `${n}`;
}
