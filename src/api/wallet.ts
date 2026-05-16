import { apiGet, apiPatch } from './client';
import type { FiatCurrency, CryptoCurrency, AnyCurrency } from '../utils/currency';
import type { ApiUser } from './auth';

export interface WalletSnapshot {
  currency: FiatCurrency;
  countryCode?: string;
  balance: number;
  bonusBalance: number;
  bonusRollover: number;
  cryptoBalances: Partial<Record<CryptoCurrency, number>>;
  totalWagered: number;
  totalWon: number;
  vipLevel: number;
  vipXp: number;
  referralCode: string;
  promoterStatus: 'none' | 'pending' | 'approved' | 'banned';
}

export interface ApiTransaction {
  _id: string;
  userId: string;
  kind: 'deposit' | 'withdraw' | 'bet_stake' | 'bet_payout' | 'bonus' | 'adjustment' | 'swap';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  method: 'card' | 'bank' | 'mobilemoney' | 'ussd' | 'crypto' | 'internal';
  amount: number;
  currency: AnyCurrency;
  reference: string;
  cryptoNetwork?: string;
  cryptoAddress?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export const walletApi = {
  get: () => apiGet<WalletSnapshot>('/wallet'),
  transactions: (limit = 50) =>
    apiGet<{ transactions: ApiTransaction[] }>(`/wallet/transactions?limit=${limit}`),
  setCurrency: (currency: FiatCurrency, countryCode?: string) =>
    apiPatch<{ user: ApiUser }>('/users/me/currency', { currency, countryCode }),
};
