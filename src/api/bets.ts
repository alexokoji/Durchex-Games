import { apiGet, apiPost } from './client';
import type { AnyCurrency } from '../utils/currency';

export type ApiBetStatus = 'pending' | 'won' | 'lost' | 'push' | 'cashout';

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
};
