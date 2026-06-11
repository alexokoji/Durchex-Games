import { apiGet, apiPost } from './client';
import type { AnyCurrency } from '../utils/currency';

export type ApiBetStatus = 'pending' | 'won' | 'lost' | 'push' | 'cashout' | 'void' | 'refunded';

export interface CashoutQuote {
  fairValue: number;
  cashoutValue: number;
  margin: number;
}

export interface CashoutBody {
  /** Max return if the remaining bet wins = stake × combined odds. */
  potentialReturn: number;
  /** Live win probability (0..1) from the deterministic match engine. */
  winProbability: number;
  /** 1 = full cash-out (default); 0<f<1 = partial. */
  fraction?: number;
}

export interface ApiBet {
  _id: string;
  userId: string;
  gameId: string;
  gameName: string;
  stake: number;
  payout: number;
  multiplier?: number;
  mode?: string;
  systemK?: number;
  currency: AnyCurrency;
  status: ApiBetStatus;
  details?: string;
  selections?: unknown;
  /** Per-selection outcome snapshots — present on settled virtual-sports bets. */
  selectionResults?: unknown;
  placedAt: string;
  settledAt?: string;
}

export interface PlaceBetBody {
  gameId: string;
  gameName: string;
  stake: number;
  details?: string;
  selections?: unknown;
  mode?: 'single' | 'multi' | 'system';
  systemK?: number;
}

export interface SettleBetBody {
  won: boolean;
  payout: number;
  multiplier?: number;
  details?: string;
  selectionResults?: unknown;
}

export const betsApi = {
  place: (body: PlaceBetBody) =>
    apiPost<{ bet: ApiBet; balance: number; bonusBalance: number; currency: AnyCurrency }>('/bets', body),
  settle: (id: string, body: SettleBetBody) =>
    apiPost<{ bet: ApiBet; balance: number }>(`/bets/${id}/settle`, body),
  history: (params: { limit?: number; gameId?: string; status?: ApiBetStatus } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.gameId) qs.set('gameId', params.gameId);
    if (params.status) qs.set('status', params.status);
    const q = qs.toString();
    return apiGet<{ bets: ApiBet[] }>(`/bets/history${q ? `?${q}` : ''}`);
  },
  pending: () => apiGet<{ bets: ApiBet[] }>('/bets/pending'),

  /** Live cash-out value (no state change). */
  cashoutQuote: (id: string, body: Omit<CashoutBody, 'fraction'>) =>
    apiPost<{ quote: CashoutQuote; partialEnabled: boolean }>(`/bets/${id}/cashout/quote`, body),

  /** Execute a full or partial cash-out. */
  cashout: (id: string, body: CashoutBody) =>
    apiPost<{ bet: ApiBet; balance: number; paid: number; quote: CashoutQuote; partial: boolean }>(`/bets/${id}/cashout`, body),
};
