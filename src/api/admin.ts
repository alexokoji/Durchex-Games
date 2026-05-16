import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type { PromoKind, PromoTier, PromoCodeSummary } from './promo';

export interface AdminPromoter {
  _id: string;
  userId: {
    _id: string;
    email: string;
    username: string;
    countryCode?: string;
    referralCode: string;
  } | string;
  status: 'pending' | 'approved' | 'banned';
  applicationMessage?: string;
  commissionRate: number;
  totalReferred: number;
  activeReferrals: number;
  totalWageredUsd: number;
  totalEarnedUsd: number;
  paidOutUsd: number;
  createdAt: string;
  approvedAt?: string;
  bannedAt?: string;
  banReason?: string;
}

export interface CreatePromoCodeBody {
  code: string;
  kind: PromoKind;
  tier?: PromoTier;
  bonusAmount: number;
  currency?: string;
  maxBonus?: number;
  minDeposit?: number;
  rollover?: number;
  maxWithdraw?: number;
  eligibleCountries?: string[];
  eligibleGames?: string[];
  promoterId?: string;
  totalUsageLimit?: number;
  perUserLimit?: number;
  expiresAt?: string;
}

export interface AdminPromoCode extends PromoCodeSummary {
  maxBonus?: number;
  minDeposit?: number;
  maxWithdraw?: number;
  eligibleCountries?: string[];
  eligibleGames?: string[];
  promoterId?: { _id: string; email: string; username: string } | string | null;
  perUserLimit?: number;
}

export const adminApi = {
  // Promoters
  promoters: (status?: 'pending' | 'approved' | 'banned') =>
    apiGet<{ promoters: AdminPromoter[] }>(`/admin/promoters${status ? `?status=${status}` : ''}`),
  approvePromoter: (userId: string, body?: { commissionRate?: number }) =>
    apiPost<{ promoter: AdminPromoter }>(`/admin/promoters/${userId}/approve`, body ?? {}),
  banPromoter: (userId: string, reason?: string) =>
    apiPost<{ promoter: AdminPromoter }>(`/admin/promoters/${userId}/ban`, { reason }),
  updatePromoter: (userId: string, body: { commissionRate?: number }) =>
    apiPatch<{ promoter: AdminPromoter }>(`/admin/promoters/${userId}`, body),

  // Promo codes
  promoCodes: (filters?: { kind?: PromoKind; tier?: PromoTier; active?: boolean }) => {
    const qs = new URLSearchParams();
    if (filters?.kind) qs.set('kind', filters.kind);
    if (filters?.tier) qs.set('tier', filters.tier);
    if (filters?.active != null) qs.set('active', String(filters.active));
    const q = qs.toString();
    return apiGet<{ codes: AdminPromoCode[] }>(`/admin/promo-codes${q ? `?${q}` : ''}`);
  },
  createPromoCode: (body: CreatePromoCodeBody) =>
    apiPost<{ code: AdminPromoCode }>('/admin/promo-codes', body),
  updatePromoCode: (code: string, body: Partial<CreatePromoCodeBody> & { active?: boolean }) =>
    apiPatch<{ code: AdminPromoCode }>(`/admin/promo-codes/${code}`, body),
  deletePromoCode: (code: string) =>
    apiDelete<{ ok: true }>(`/admin/promo-codes/${code}`),
};
