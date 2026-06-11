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

export interface SportsFeedProvider {
  readonly name: string;
  /** Whether this is the live provider (false for sandbox). */
  readonly live: boolean;
  listSports(): Promise<FeedSport[]>;
  /** Upcoming + in-play events with odds for a sport key. */
  listEvents(sportKey: string): Promise<FeedEvent[]>;
  /** Results for finished events (for settlement). */
  listResults(sportKey: string): Promise<FeedResult[]>;
}
