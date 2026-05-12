export type OddsFormat = 'decimal' | 'fractional' | 'american';
export type SportKey = 'soccer' | 'basketball' | 'hockey' | 'horseracing';
export type MatchPhase = 'scheduled' | 'betting' | 'live' | 'finished';
export type EventType =
  | 'goal'
  | 'penalty'
  | 'var-disallowed'
  | 'yellow-card'
  | 'red-card'
  | 'corner'
  | 'substitution'
  | 'injury'
  | 'kickoff'
  | 'halftime'
  | 'fulltime';

export interface TeamRatings {
  attack: number;     // 50–95
  defense: number;    // 50–95
  midfield: number;   // 50–95
  pace: number;       // 50–95
  finishing: number;  // 50–95
  keeping: number;    // 50–95
  form: number;       // -10 .. +10
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  abbr: string;          // 3-letter code: ARS, RMA
  leagueId: string;
  country: string;
  primary: string;       // hex
  secondary: string;     // hex
  accent?: string;
  emblemKey: string;     // key into TeamEmblem switch
  ratings: TeamRatings;
}

export interface League {
  id: string;
  name: string;
  shortName: string;
  country: string;
  countryCode: string;
  sport: SportKey;
  tier: 'top' | 'cup' | 'continental';
  flag: string;          // emoji
  accent: string;
}

export interface MarketOption {
  id: string;            // unique within market
  label: string;
  shortLabel?: string;
  odds: number;          // decimal
  description?: string;
}

export type MarketCategory =
  | '1X2'
  | 'DOUBLE_CHANCE'
  | 'BTTS'
  | 'OVER_UNDER'
  | 'CORRECT_SCORE'
  | 'FIRST_GOAL'
  | 'LAST_GOAL'
  | 'CLEAN_SHEET'
  | 'TEAM_TOTAL'
  | 'HANDICAP'
  | 'HALF_TIME'
  | 'WINNER'                   // basketball/hockey/horseracing
  | 'SPREAD'
  | 'TOTAL_POINTS'
  | 'PERIOD_WINNER'
  | 'WIN'                      // horseracing
  | 'PLACE'
  | 'FORECAST'
  | 'QUINELLA';

export interface Market {
  id: string;                  // unique within match
  matchId: string;
  category: MarketCategory;
  label: string;
  options: MarketOption[];
  status: 'open' | 'suspended' | 'closed';
}

export interface MatchEvent {
  id: string;
  minute: number;
  type: EventType;
  team: 'home' | 'away' | 'neutral';
  player?: string;
  description: string;
}

export interface MatchScore {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  sport: SportKey;
  leagueId: string;
  homeId: string;
  awayId: string;
  startsAt: number;            // ms epoch
  kickoffOffsetMs: number;     // ms when match becomes live
  endsAt: number;              // ms when finished
  phase: MatchPhase;
  liveMinute: number;          // 0..90 for soccer
  score: MatchScore;
  finalScore?: MatchScore;
  events: MatchEvent[];
  markets: Market[];
  seed: number;                // for deterministic simulation
}

export interface BetSelection {
  id: string;                  // matchId:marketId:optionId
  matchId: string;
  marketId: string;
  marketCategory: MarketCategory;
  marketLabel: string;
  optionId: string;
  optionLabel: string;
  odds: number;                // captured at selection time
  sport: SportKey;
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: number;
  addedAt: number;
}

export type BetMode = 'single' | 'multi' | 'system';

export interface BetTicket {
  id: string;
  mode: BetMode;
  selections: BetSelection[];
  stake: number;               // per-line stake
  totalStake: number;          // stake * number of lines
  systemK?: number;            // for system mode (k of n)
  placedAt: number;
  status: 'pending' | 'won' | 'lost' | 'partial' | 'cashout';
  potentialPayout: number;
  settledPayout?: number;
  settledAt?: number;
}
