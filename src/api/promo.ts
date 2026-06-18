import { apiGet, apiPost, apiPatch } from './client';
import type { ApiUser } from './auth';
import type { AnyCurrency } from '../utils/currency';

export type PromoKind = 'welcome' | 'deposit' | 'free-bet' | 'cashback';
export type PromoTier = 'public' | 'influencer' | 'vip' | 'seasonal';

export interface PromoRedemptionRecord {
  _id: string;
  code: string;
  kind: PromoKind;
  bonusCredited: number;
  currency: string;
  rolloverInitial: number;
  createdAt: string;
}

export interface PromoCodeSummary {
  _id: string;
  code: string;
  kind: PromoKind;
  tier: PromoTier;
  bonusAmount: number;
  currency?: string;
  rollover: number;
  active: boolean;
  totalRedemptions: number;
  totalUsageLimit?: number;
  expiresAt?: string;
  createdAt: string;
}

export interface PromoterDashboard {
  promoter: {
    status: 'pending' | 'approved' | 'banned';
    commissionRate: number;
    totalReferred: number;
    activeReferrals: number;
    totalWageredUsd: number;
    totalEarnedUsd: number;
    paidOutUsd: number;
    unpaidUsd: number;
    createdAt: string;
    approvedAt?: string;
  };
  referralCode: string;
  codes: PromoCodeSummary[];
  recentReferrals: Array<{
    _id: string;
    username: string;
    countryCode?: string;
    totalWagered: number;
    createdAt: string;
  }>;
}

export interface RedeemResponse {
  ok: true;
  redemption: { bonusCredited: number; rollover: number; kind: PromoKind; redemptionId: string };
  user: ApiUser;
}

export const promoApi = {
  redeem: (code: string, opts?: { trigger?: 'manual' | 'deposit'; depositAmount?: number; depositReference?: string }) =>
    apiPost<RedeemResponse>('/promo/redeem', { code, ...opts }),

  redemptions: () =>
    apiGet<{ redemptions: PromoRedemptionRecord[] }>('/promo/redemptions'),

  applyPromoter: (applicationMessage?: string) =>
    apiPost<{ status: 'pending' }>('/promo/promoter/apply', { applicationMessage }),

  promoterDashboard: () =>
    apiGet<PromoterDashboard>('/promo/promoter/me'),

  setReferralCode: (code: string) =>
    apiPatch<{ referralCode: string }>('/promo/promoter/referral-code', { code }),
};

export type { AnyCurrency };
