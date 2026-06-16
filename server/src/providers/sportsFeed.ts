/**
 * Provider-agnostic Live Sports feed.
 *
 * Any odds provider (The Odds API, API-Football, SportRadar, …) is wrapped in
 * a SportsFeedProvider so the rest of the platform never depends on a specific
 * vendor's payload shape. A deterministic sandbox provider implements the same
 * interface so the section runs with no API key.
 */

export interface FeedSport {
  key: string;        // provider sport key, e.g. 'soccer_epl'
  group: string;      // 'Soccer', 'Basketball', …
  title: string;      // human label, e.g. 'EPL'
  active: boolean;
}

export interface FeedOutcome {
  name: string;       // 'Arsenal' | 'Draw' | 'Chelsea' | 'Over' | 'Under'
  price: number;      // DECIMAL odds, e.g. 1.85
  point?: number;     // line for totals/handicaps
}

export interface FeedMarket {
  key: string;        // 'h2h' | 'totals' | 'spreads'
  outcomes: FeedOutcome[];
}

export interface FeedEvent {
  id: string;             // provider event id (stable)
  sportKey: string;
  sportTitle: string;
  commenceTime: string;   // ISO
  homeTeam: string;
  awayTeam: string;
  markets: FeedMarket[];  // best/representative prices per market
}

export interface FeedResult {
  id: string;             // provider event id
  completed: boolean;
  homeScore?: number;
  awayScore?: number;
}

// ─── Rich match-details payloads (lineups, stats, timeline, …) ───────────────
// Optional — only providers with this data (e.g. API-Football) populate it.
export interface FeedLineupPlayer { number?: number; name: string; pos?: string }
export interface FeedLineupTeam {
  side: 'home' | 'away';
  team: string;
  formation?: string;
  coach?: string;
  startXI: FeedLineupPlayer[];
  subs: FeedLineupPlayer[];
}
export interface FeedStat { type: string; home: number | string | null; away: number | string | null }
export interface FeedTimelineEvent {
  minute: number;
  side: 'home' | 'away';
  type: string;           // 'Goal' | 'Card' | 'subst' | 'Var'
  detail?: string;        // 'Yellow Card' | 'Normal Goal' | …
  player?: string;
  assist?: string;
}
export interface FeedH2HMatch {
  date: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  competition?: string;
}
export interface FeedStandingRow {
  rank: number;
  team: string;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsDiff: number;
  points: number;
  form?: string;          // e.g. 'WWDLW'
}
export interface FeedMatchDetails {
  status?: { short: string; elapsed: number | null };
  score?: { home: number | null; away: number | null };
  venue?: string;
  referee?: string;
  lineups?: FeedLineupTeam[];
  statistics?: FeedStat[];
  timeline?: FeedTimelineEvent[];
  h2h?: FeedH2HMatch[];
  standings?: FeedStandingRow[];
}

export interface SportsFeedProvider {
  readonly name: string;
  /** Whether this is the live provider (false for sandbox). */
  readonly live: boolean;
  listSports(): Promise<FeedSport[]>;
  /** Upcoming + in-play events with odds for a sport key. */
  listEvents(sportKey: string): Promise<FeedEvent[]>;
  /** Results for finished events (for settlement). */
  listResults(sportKey: string): Promise<FeedResult[]>;
  /** Provider quota remaining (from rate-limit headers); null if unknown. */
  requestsRemaining?(): number | null;
  /** Rich details (lineups, stats, timeline, H2H, table) for one event. */
  matchDetails?(eventId: string): Promise<FeedMatchDetails | null>;
}
