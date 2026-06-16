import { apiGet, apiPost } from './client';
import type { AnyCurrency } from '../utils/currency';
import type { ApiBet, CashoutQuote } from './bets';

export interface LiveOutcome { name: string; price: number; point?: number }
export interface LiveMarket  { key: string; suspended: boolean; outcomes: LiveOutcome[] }

export interface LiveEvent {
  _id: string;
  provider: string;
  providerId: string;
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: 'upcoming' | 'live' | 'completed' | 'settled';
  suspended: boolean;
  markets: LiveMarket[];
}

export interface LiveSportSummary { sportKey: string; sportTitle: string; sportGroup: string; count: number }

// ─── Rich match details ──────────────────────────────────────────────────────
export interface LineupPlayer { number?: number; name: string; pos?: string }
export interface LineupTeam {
  side: 'home' | 'away';
  team: string;
  formation?: string;
  coach?: string;
  startXI: LineupPlayer[];
  subs: LineupPlayer[];
}
export interface MatchStat { type: string; home: number | string | null; away: number | string | null }
export interface TimelineEvent {
  minute: number;
  side: 'home' | 'away';
  type: string;
  detail?: string;
  player?: string;
  assist?: string;
}
export interface H2HMatch {
  date: string; home: string; away: string;
  homeScore: number | null; awayScore: number | null; competition?: string;
}
export interface StandingRow {
  rank: number; team: string; played: number;
  win: number; draw: number; lose: number; goalsDiff: number; points: number; form?: string;
}
export interface MatchDetails {
  status?: { short: string; elapsed: number | null };
  score?: { home: number | null; away: number | null };
  venue?: string;
  referee?: string;
  lineups?: LineupTeam[];
  statistics?: MatchStat[];
  timeline?: TimelineEvent[];
  h2h?: H2HMatch[];
  standings?: StandingRow[];
}

export type LiveMarketKey = 'h2h' | 'h2h_3_way' | 'totals' | 'spreads' | 'double_chance' | 'btts' | 'draw_no_bet';

export interface LiveSelectionInput {
  eventId: string;
  marketKey: LiveMarketKey;
  outcomeName: string;
  point?: number;
}

export const liveSportsApi = {
  sports: () => apiGet<{ sports: LiveSportSummary[] }>('/live/sports'),
  events: (sportKey?: string, limit = 60) =>
    apiGet<{ events: LiveEvent[] }>(`/live/events${sportKey ? `?sport=${encodeURIComponent(sportKey)}&limit=${limit}` : `?limit=${limit}`}`),
  event: (id: string) => apiGet<{ event: LiveEvent }>(`/live/events/${id}`),
  details: (id: string) => apiGet<{ details: MatchDetails | null }>(`/live/events/${id}/details`),

  placeBet: (stake: number, selections: LiveSelectionInput[], fromCode?: string) =>
    apiPost<{ bet: ApiBet; balance: number; bonusBalance: number; currency: AnyCurrency; combinedOdds: number }>(
      '/live/bet', { stake, selections, fromCode }),

  myBets: () => apiGet<{ bets: ApiBet[] }>('/live/bets'),

  cashoutQuote: (betId: string) =>
    apiPost<{ quote: CashoutQuote; partialEnabled: boolean; potentialReturn: number; winProbability: number }>(
      `/live/bet/${betId}/cashout/quote`),
  cashout: (betId: string, fraction?: number) =>
    apiPost<{ bet: ApiBet; balance: number; paid: number; quote: CashoutQuote; partial: boolean }>(
      `/live/bet/${betId}/cashout`, fraction != null ? { fraction } : {}),
};
