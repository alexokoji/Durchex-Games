import type { Market, MarketOption, Team } from '../core/types';
import { probabilitiesToOdds, DEFAULT_OVERROUND } from '../core/oddsEngine';
import { teamStrength } from '../core/teamDatabase';

const HOME_ADVANTAGE = 0.25;
const LEAGUE_AVG_GOALS = 5.6;
const MAX_GOALS = 9;

export interface ExpectedGoals { home: number; away: number }

export function computeHockeyExpectedGoals(home: Team, away: Team): ExpectedGoals {
  const h = teamStrength(home);
  const a = teamStrength(away);
  const total = h + a;
  const homeShare = (h + HOME_ADVANTAGE * 5) / Math.max(1, total + HOME_ADVANTAGE * 5);
  const awayShare = a / Math.max(1, total + HOME_ADVANTAGE * 5);
  const attackBoost = ((home.ratings.attack + away.ratings.attack) - (home.ratings.defense + away.ratings.defense)) / 80;
  const totalGoals = Math.max(3.2, Math.min(8, LEAGUE_AVG_GOALS + attackBoost));
  return {
    home: Math.max(0.4, totalGoals * homeShare),
    away: Math.max(0.4, totalGoals * awayShare),
  };
}

function factorial(n: number): number { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }
function poissonPmf(lambda: number, k: number): number { return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k); }

export type ScoreGrid = number[][];

export function buildScoreGrid(xg: ExpectedGoals): ScoreGrid {
  const grid: ScoreGrid = [];
  let normaliser = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    grid[h] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = poissonPmf(xg.home, h) * poissonPmf(xg.away, a);
      grid[h][a] = p;
      normaliser += p;
    }
  }
  if (normaliser > 0) {
    for (let h = 0; h <= MAX_GOALS; h++) for (let a = 0; a <= MAX_GOALS; a++) grid[h][a] /= normaliser;
  }
  return grid;
}

function sumGrid(grid: ScoreGrid, pred: (h: number, a: number) => boolean): number {
  let s = 0;
  for (let h = 0; h < grid.length; h++) for (let a = 0; a < grid[h].length; a++) if (pred(h, a)) s += grid[h][a];
  return s;
}

function makeMarket(matchId: string, suffix: string, category: Market['category'], label: string, options: MarketOption[]): Market {
  return { id: `${matchId}-${suffix}`, matchId, category, label, options, status: 'open' };
}

function makeOptions(probs: { id: string; label: string; shortLabel?: string; p: number }[], overround = DEFAULT_OVERROUND): MarketOption[] {
  const odds = probabilitiesToOdds(probs.map(p => p.p), overround);
  return probs.map((p, i) => ({ id: p.id, label: p.label, shortLabel: p.shortLabel, odds: odds[i] }));
}

export function buildHockeyMarkets(matchId: string, home: Team, away: Team): { markets: Market[]; xg: ExpectedGoals; grid: ScoreGrid } {
  const xg = computeHockeyExpectedGoals(home, away);
  const grid = buildScoreGrid(xg);

  const pHome = sumGrid(grid, (h, a) => h > a);
  const pDraw = sumGrid(grid, (h, a) => h === a);
  const pAway = sumGrid(grid, (h, a) => a > h);

  const markets: Market[] = [];

  // 3-way result (regulation)
  markets.push(makeMarket(matchId, '1x2', '1X2', 'Result (Regulation)', makeOptions([
    { id: '1', label: home.shortName, shortLabel: '1', p: pHome },
    { id: 'X', label: 'Tie',           shortLabel: 'X', p: pDraw },
    { id: '2', label: away.shortName, shortLabel: '2', p: pAway },
  ])));

  // Double chance
  markets.push(makeMarket(matchId, 'dc', 'DOUBLE_CHANCE', 'Double Chance', makeOptions([
    { id: '1X', label: `${home.abbr} or Tie`, shortLabel: '1X', p: pHome + pDraw },
    { id: '12', label: `${home.abbr} or ${away.abbr}`, shortLabel: '12', p: pHome + pAway },
    { id: 'X2', label: `Tie or ${away.abbr}`,  shortLabel: 'X2', p: pDraw + pAway },
  ], DEFAULT_OVERROUND * 0.98)));

  // Totals
  for (const line of [3.5, 4.5, 5.5, 6.5, 7.5]) {
    const pOver = sumGrid(grid, (h, a) => h + a > line);
    markets.push(makeMarket(matchId, `ou-${line}`, 'OVER_UNDER', `Total Goals — Over/Under ${line}`, makeOptions([
      { id: 'over',  label: `Over ${line}`,  p: pOver },
      { id: 'under', label: `Under ${line}`, p: 1 - pOver },
    ])));
  }

  // Team Totals
  for (const side of ['home', 'away'] as const) {
    const team = side === 'home' ? home : away;
    for (const line of [1.5, 2.5, 3.5]) {
      const p = side === 'home' ? sumGrid(grid, h => h > line) : sumGrid(grid, (_h, a) => a > line);
      markets.push(makeMarket(matchId, `tt-${side}-${line}`, 'TEAM_TOTAL', `${team.shortName} Over/Under ${line}`, makeOptions([
        { id: 'over',  label: `Over ${line}`,  p },
        { id: 'under', label: `Under ${line}`, p: 1 - p },
      ])));
    }
  }

  // Asian handicap
  for (const h of [-1.5, -0.5, +0.5, +1.5]) {
    const pHomeHcp = sumGrid(grid, (hg, ag) => hg + h > ag);
    markets.push(makeMarket(matchId, `ah-${h}`, 'HANDICAP', `Handicap ${formatH(h)}`, makeOptions([
      { id: 'home', label: `${home.abbr} ${formatH(h)}`,  p: pHomeHcp },
      { id: 'away', label: `${away.abbr} ${formatH(-h)}`, p: 1 - pHomeHcp },
    ])));
  }

  // 1st Period winner (pulled toward 50/50 due to small sample)
  const pP1Home = 0.5 + (pHome - 0.5) * 0.55;
  const pP1Away = 0.5 + (pAway - 0.5) * 0.55;
  const pP1Tie  = Math.max(0.15, 1 - pP1Home - pP1Away);
  markets.push(makeMarket(matchId, 'p1-winner', 'PERIOD_WINNER', '1st Period Winner', makeOptions([
    { id: '1', label: home.shortName, shortLabel: '1', p: pP1Home },
    { id: 'X', label: 'Tie',           shortLabel: 'X', p: pP1Tie },
    { id: '2', label: away.shortName, shortLabel: '2', p: pP1Away },
  ])));

  return { markets, xg, grid };
}

function formatH(n: number): string { return n > 0 ? `+${n}` : `${n}`; }
