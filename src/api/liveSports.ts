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

export type LiveMarketKey = 'h2h' | 'totals' | 'spreads' | 'double_chance' | 'btts' | 'draw_no_bet';

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
