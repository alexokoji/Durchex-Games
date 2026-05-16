import type { Market, MarketOption, Team } from '../core/types';
import { probabilitiesToOdds, DEFAULT_OVERROUND } from '../core/oddsEngine';
import { teamStrength, getPersonality } from '../core/teamDatabase';

const HOME_ADVANTAGE = 0.35;
const LEAGUE_AVG_GOALS = 2.7;
const MAX_SCORE = 7;          // probability grid 0..7 per side

export interface ExpectedGoals {
  home: number;
  away: number;
}

/**
 * Personality-aware xG model. Combines:
 *  • Numeric strength (existing model)
 *  • Pressing intensity vs opponent's passing speed — high press squeezes
 *    weaker passers and adds attacking opportunities.
 *  • Counter-attack strength — even a low-possession side can be lethal
 *    against teams that commit forward.
 *  • Finishing vs opposing goalkeeping — converts shot quality to goals.
 *  • Form — short-term momentum bump.
 */
export function computeExpectedGoals(home: Team, away: Team): ExpectedGoals {
  const hStrength = teamStrength(home);
  const aStrength = teamStrength(away);
  const total = hStrength + aStrength;
  const homeShare = (hStrength + HOME_ADVANTAGE * 5) / Math.max(1, total + HOME_ADVANTAGE * 5);
  const awayShare = aStrength / Math.max(1, total + HOME_ADVANTAGE * 5);

  const attackBoost = ((home.ratings.attack + away.ratings.attack) - (home.ratings.defense + away.ratings.defense)) / 80;
  const totalGoals = Math.max(1.5, Math.min(4.5, LEAGUE_AVG_GOALS + attackBoost));

  // Personality modifiers (each ≈ -0.15..+0.25 xG)
  const hp = getPersonality(home);
  const ap = getPersonality(away);

  // High press disrupts opponent in their defensive third → extra xG for the
  // pressing side, capped to avoid runaway values.
  const hPressBonus = clamp01((hp.pressingIntensity - 60) / 100) * 0.4 - clamp01((ap.passingSpeed - 70) / 100) * 0.2;
  const aPressBonus = clamp01((ap.pressingIntensity - 60) / 100) * 0.4 - clamp01((hp.passingSpeed - 70) / 100) * 0.2;

  // Counter-attack reward for direct, fast teams.
  const hCounter = clamp01((hp.counterAttackStrength - 70) / 100) * 0.35;
  const aCounter = clamp01((ap.counterAttackStrength - 70) / 100) * 0.35;

  // Finishing vs opposing goalkeeping difference.
  const hFinish = ((hp.finishing - 75) - (ap.goalkeeping - 75)) / 400;
  const aFinish = ((ap.finishing - 75) - (hp.goalkeeping - 75)) / 400;

  // Form swing (current form runs -10..+10).
  const hForm = hp.currentForm * 0.025;
  const aForm = ap.currentForm * 0.025;

  return {
    home: Math.max(0.15, totalGoals * homeShare + hPressBonus + hCounter + hFinish + hForm),
    away: Math.max(0.15, totalGoals * awayShare + aPressBonus + aCounter + aFinish + aForm),
  };
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * Aggregate per-match event-rate profile derived from both teams'
 * personality. Used by the simulator to decide how many cards, corners,
 * fouls, etc. to surface in the timeline.
 */
export interface MatchEventRates {
  avgYellow: number;     // mean total yellow cards in the match
  redChance: number;     // probability of at least one red
  cornersAvg: number;    // mean total corners
  foulsAvg: number;      // mean total fouls
  penaltyChance: number; // probability of at least one penalty
  varDisallowed: number; // probability of a VAR-disallowed goal
  injuryChance: number;  // probability of an injury stoppage
  // Per-side bias 0–1 for events that lean toward one team's profile.
  yellowHomeShare: number;
}
export function computeEventRates(home: Team, away: Team): MatchEventRates {
  const hp = getPersonality(home);
  const ap = getPersonality(away);

  const aggression = (hp.aggression + ap.aggression) / 2;
  const discipline = (hp.discipline + ap.discipline) / 2;
  const possession = (hp.possessionStyle + ap.possessionStyle) / 2;
  const pressing   = (hp.pressingIntensity + ap.pressingIntensity) / 2;
  const injury     = (hp.injuryFactor + ap.injuryFactor) / 2;

  return {
    avgYellow:        3 + (aggression - 60) / 16 + (pressing - 65) / 28,
    redChance:        Math.max(0.04, Math.min(0.28, 0.10 + (aggression - 60) / 220 - (discipline - 65) / 260)),
    cornersAvg:       7 + (possession - 60) / 14 + (pressing - 65) / 18,
    foulsAvg:         18 + (aggression - 60) / 6,
    penaltyChance:    Math.max(0.04, Math.min(0.30, 0.12 + (aggression - 60) / 320)),
    varDisallowed:    0.10,
    injuryChance:     Math.max(0.10, Math.min(0.45, 0.20 + (injury - 45) / 220)),
    yellowHomeShare:  0.5 + (hp.aggression - ap.aggression) / 200,
  };
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function poissonPmf(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export type ScoreGrid = number[][]; // [home][away]

export function buildScoreGrid(xg: ExpectedGoals): ScoreGrid {
  const grid: ScoreGrid = [];
  let normaliser = 0;
  for (let h = 0; h <= MAX_SCORE; h++) {
    grid[h] = [];
    for (let a = 0; a <= MAX_SCORE; a++) {
      const p = poissonPmf(xg.home, h) * poissonPmf(xg.away, a);
      grid[h][a] = p;
      normaliser += p;
    }
  }
  // Normalise so probabilities sum to 1 (after truncating tail beyond MAX_SCORE).
  if (normaliser > 0) {
    for (let h = 0; h <= MAX_SCORE; h++) {
      for (let a = 0; a <= MAX_SCORE; a++) {
        grid[h][a] /= normaliser;
      }
    }
  }
  return grid;
}

function sumGrid(grid: ScoreGrid, predicate: (h: number, a: number) => boolean): number {
  let s = 0;
  for (let h = 0; h <= MAX_SCORE; h++) {
    for (let a = 0; a <= MAX_SCORE; a++) {
      if (predicate(h, a)) s += grid[h][a];
    }
  }
  return s;
}

function makeOptions(
  probs: { id: string; label: string; shortLabel?: string; p: number; description?: string }[],
  overround = DEFAULT_OVERROUND,
): MarketOption[] {
  const odds = probabilitiesToOdds(probs.map(p => p.p), overround);
  return probs.map((p, i) => ({
    id: p.id,
    label: p.label,
    shortLabel: p.shortLabel,
    odds: odds[i],
    description: p.description,
  }));
}

function makeMarket(matchId: string, idSuffix: string, category: Market['category'], label: string, options: MarketOption[]): Market {
  return {
    id: `${matchId}-${idSuffix}`,
    matchId,
    category,
    label,
    options,
    status: 'open',
  };
}

// Build the full Bet9ja-style market catalogue for one fixture.
export function buildSoccerMarkets(matchId: string, home: Team, away: Team, overround = DEFAULT_OVERROUND): {
  markets: Market[];
  xg: ExpectedGoals;
  grid: ScoreGrid;
} {
  const xg = computeExpectedGoals(home, away);
  const grid = buildScoreGrid(xg);

  const pHome = sumGrid(grid, (h, a) => h > a);
  const pDraw = sumGrid(grid, (h, a) => h === a);
  const pAway = sumGrid(grid, (h, a) => a > h);

  const markets: Market[] = [];

  // 1X2
  markets.push(makeMarket(matchId, '1x2', '1X2', 'Match Result (1X2)', makeOptions([
    { id: '1', label: home.shortName, shortLabel: '1', p: pHome, description: 'Home win' },
    { id: 'X', label: 'Draw',          shortLabel: 'X', p: pDraw, description: 'Match ends level' },
    { id: '2', label: away.shortName, shortLabel: '2', p: pAway, description: 'Away win' },
  ], overround)));

  // Double Chance
  markets.push(makeMarket(matchId, 'dc', 'DOUBLE_CHANCE', 'Double Chance', makeOptions([
    { id: '1X', label: `${home.abbr} or Draw`, shortLabel: '1X', p: pHome + pDraw },
    { id: '12', label: `${home.abbr} or ${away.abbr}`, shortLabel: '12', p: pHome + pAway },
    { id: 'X2', label: `Draw or ${away.abbr}`, shortLabel: 'X2', p: pDraw + pAway },
  ], overround * 0.98)));

  // BTTS
  const pBttsYes = sumGrid(grid, (h, a) => h > 0 && a > 0);
  markets.push(makeMarket(matchId, 'btts', 'BTTS', 'Both Teams to Score', makeOptions([
    { id: 'yes', label: 'Yes', p: pBttsYes },
    { id: 'no',  label: 'No',  p: 1 - pBttsYes },
  ], overround)));

  // Over/Under variants
  for (const line of [0.5, 1.5, 2.5, 3.5, 4.5]) {
    const pOver = sumGrid(grid, (h, a) => h + a > line);
    markets.push(makeMarket(matchId, `ou-${line}`, 'OVER_UNDER', `Total Goals — Over/Under ${line}`, makeOptions([
      { id: `over`,  label: `Over ${line}`,  p: pOver },
      { id: `under`, label: `Under ${line}`, p: 1 - pOver },
    ], overround)));
  }

  // Correct Score — top 13 most-likely + "Other"
  const scoreEntries: { h: number; a: number; p: number }[] = [];
  for (let h = 0; h <= 4; h++) for (let a = 0; a <= 4; a++) scoreEntries.push({ h, a, p: grid[h][a] });
  scoreEntries.sort((x, y) => y.p - x.p);
  const top = scoreEntries.slice(0, 13);
  const otherProb = 1 - top.reduce((s, e) => s + e.p, 0);
  const csOpts = top.map(e => ({
    id: `${e.h}-${e.a}`,
    label: `${e.h} – ${e.a}`,
    shortLabel: `${e.h}-${e.a}`,
    p: Math.max(0.005, e.p),
  }));
  csOpts.push({ id: 'other', label: 'Any other', shortLabel: 'AO', p: Math.max(0.01, otherProb) });
  markets.push(makeMarket(matchId, 'cs', 'CORRECT_SCORE', 'Correct Score', makeOptions(csOpts, overround * 1.08)));

  // First Goal
  const pNoGoal = grid[0][0];
  const pHomeScores = 1 - sumGrid(grid, (h) => h === 0);
  const pAwayScores = 1 - sumGrid(grid, (_h, a) => a === 0);
  // First-goal share, weighted by xG share
  const totalXg = xg.home + xg.away;
  const firstHome = (xg.home / Math.max(0.001, totalXg)) * (1 - pNoGoal);
  const firstAway = (xg.away / Math.max(0.001, totalXg)) * (1 - pNoGoal);
  markets.push(makeMarket(matchId, 'first-goal', 'FIRST_GOAL', 'First Goal', makeOptions([
    { id: 'home', label: home.shortName, p: firstHome },
    { id: 'away', label: away.shortName, p: firstAway },
    { id: 'none', label: 'No Goal',      p: pNoGoal },
  ], overround)));

  // Last Goal — mirror of first goal but slight bias to the trailing team
  markets.push(makeMarket(matchId, 'last-goal', 'LAST_GOAL', 'Last Goal', makeOptions([
    { id: 'home', label: home.shortName, p: firstHome * 0.95 + firstAway * 0.05 },
    { id: 'away', label: away.shortName, p: firstAway * 0.95 + firstHome * 0.05 },
    { id: 'none', label: 'No Goal',      p: pNoGoal },
  ], overround * 1.02)));

  // Clean Sheet (separate market per team)
  markets.push(makeMarket(matchId, 'cs-home', 'CLEAN_SHEET', `${home.shortName} Clean Sheet`, makeOptions([
    { id: 'yes', label: 'Yes', p: 1 - pAwayScores },
    { id: 'no',  label: 'No',  p: pAwayScores },
  ], overround)));
  markets.push(makeMarket(matchId, 'cs-away', 'CLEAN_SHEET', `${away.shortName} Clean Sheet`, makeOptions([
    { id: 'yes', label: 'Yes', p: 1 - pHomeScores },
    { id: 'no',  label: 'No',  p: pHomeScores },
  ], overround)));

  // Team Totals (home + away O/U 0.5, 1.5, 2.5)
  for (const side of ['home', 'away'] as const) {
    const teamRef = side === 'home' ? home : away;
    for (const line of [0.5, 1.5, 2.5]) {
      const p = side === 'home'
        ? sumGrid(grid, (h) => h > line)
        : sumGrid(grid, (_h, a) => a > line);
      markets.push(makeMarket(matchId, `tt-${side}-${line}`, 'TEAM_TOTAL',
        `${teamRef.shortName} — Over/Under ${line}`,
        makeOptions([
          { id: 'over',  label: `Over ${line}`,  p },
          { id: 'under', label: `Under ${line}`, p: 1 - p },
        ], overround),
      ));
    }
  }

  // Asian Handicap — three common lines
  for (const handicap of [-1.5, -0.5, +0.5, +1.5]) {
    const pHomeHcp = sumGrid(grid, (h, a) => h + handicap > a);
    const pPush    = handicap % 1 === 0 ? sumGrid(grid, (h, a) => h + handicap === a) : 0;
    markets.push(makeMarket(matchId, `ah-${handicap}`, 'HANDICAP', `Handicap ${formatHcp(handicap)}`, makeOptions([
      { id: 'home', label: `${home.abbr} ${formatHcp(handicap)}`,  p: pHomeHcp + pPush * 0.5 },
      { id: 'away', label: `${away.abbr} ${formatHcp(-handicap)}`, p: 1 - pHomeHcp - pPush * 0.5 },
    ], overround)));
  }

  // Half-Time Result — rough heuristic, ~45% of full-time goals come in 1st half
  const pHomeHt = pHome * 0.55 + pDraw * 0.20;
  const pAwayHt = pAway * 0.55 + pDraw * 0.20;
  const pDrawHt = 1 - pHomeHt - pAwayHt;
  markets.push(makeMarket(matchId, 'ht-1x2', 'HALF_TIME', 'Half-Time Result', makeOptions([
    { id: '1', label: home.shortName, shortLabel: '1', p: pHomeHt },
    { id: 'X', label: 'Draw',          shortLabel: 'X', p: Math.max(0.05, pDrawHt) },
    { id: '2', label: away.shortName, shortLabel: '2', p: pAwayHt },
  ], overround * 1.04)));

  return { markets, xg, grid };
}

function formatHcp(n: number): string {
  if (n > 0) return `+${n}`;
  return `${n}`;
}

// Extract a numeric line from a market id segment like "ou-2.5", "ah--1.5", "tt-home-1.5".
export function extractLine(marketId: string): number | null {
  const m = marketId.match(/(-?\d+(?:\.\d+)?)(?!.*\d)/);
  return m ? parseFloat(m[1]) : null;
}
