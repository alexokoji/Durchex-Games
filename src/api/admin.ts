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

export interface AuditEntry {
  _id: string;
  actorEmail: string;
  action: string;
  targetType: 'user' | 'promo_code' | 'risk_config' | 'system';
  targetId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface FlaggedReferral {
  _id: string;
  email: string;
  username: string;
  createdAt: string;
  countryCode?: string;
  totalWagered: number;
  referralAbuseFlag: 'self_device' | 'self_ip' | 'duplicate_device' | 'duplicate_ip';
  signupIp?: string;
  signupDeviceSignature?: string;
  referredBy?: { _id: string; email: string; username: string; referralCode: string } | string | null;
}

export interface AdminUserSummary {
  _id: string;
  email: string;
  username: string;
  createdAt: string;
  currency: string;
  countryCode?: string;
  balance: number;
  bonusBalance: number;
  totalWagered: number;
  totalWon: number;
  promoterStatus: 'none' | 'pending' | 'approved' | 'banned';
  referralAbuseFlag?: string | null;
}

export interface RiskConfigDto {
  rtpTargetMin: number;
  rtpTargetMax: number;
  baseOverround: number;
  volatility: number;
  drawRate: number;
  upsetRate: number;
  maxLiabilityUsd: number;
  maxUserConcentration: number;
  bookingCodeDays: number;
}

export interface RiskSnapshot {
  config: RiskConfigDto;
  rtp24h: number;
  overround: { base: number; adjusted: number };
  exposure: Array<{ market: string; liabilityUsd: number; count: number }>;
}

export interface CashbackJobInfo {
  state: {
    _id: string;
    lastRunAt: string;
    lastRunCount: number;
    lastRunError?: string;
  } | null;
  cashbackCode: string;
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

  // Audit
  auditLog: (filters?: { action?: string; limit?: number; before?: string }) => {
    const qs = new URLSearchParams();
    if (filters?.action) qs.set('action', filters.action);
    if (filters?.limit)  qs.set('limit', String(filters.limit));
    if (filters?.before) qs.set('before', filters.before);
    const q = qs.toString();
    return apiGet<{ entries: AuditEntry[] }>(`/admin/audit-log${q ? `?${q}` : ''}`);
  },

  // Flagged referrals
  flaggedReferrals: () =>
    apiGet<{ flagged: FlaggedReferral[] }>('/admin/flagged-referrals'),
  clearFlag: (userId: string) =>
    apiPost<{ ok: true }>(`/admin/flagged-referrals/${userId}/clear`, {}),

  // Users
  searchUsers: (q: string) =>
    apiGet<{ users: AdminUserSummary[] }>(`/admin/users?q=${encodeURIComponent(q)}`),
  userDetail: (id: string) =>
    apiGet<{ user: AdminUserSummary & Record<string, unknown> }>(`/admin/users/${id}`),

  // Risk
  risk: () =>
    apiGet<RiskSnapshot>('/admin/risk'),
  updateRisk: (body: Partial<RiskConfigDto>) =>
    apiPatch<{ config: RiskConfigDto }>('/admin/risk', body),

  // Cashback job
  cashbackInfo: () =>
    apiGet<CashbackJobInfo>('/admin/jobs/cashback'),
  runCashback: (force?: boolean) =>
    apiPost<{ ran: boolean; credited: number; skipped: number; reason?: string }>('/admin/jobs/cashback/run', { force: !!force }),

  // Ledger + summary
  ledgerSummary: () =>
    apiGet<LedgerSummary>('/admin/ledger/summary'),
  ledger: (limit = 60) =>
    apiGet<{ rows: LedgerRow[] }>(`/admin/ledger?limit=${limit}`),
  runDailySummary: (force?: boolean) =>
    apiPost<{ sent: boolean; reason?: string }>('/admin/jobs/daily-summary/run', { force: !!force }),

  // House payouts
  payouts: (status?: HousePayout['status']) =>
    apiGet<{ payouts: HousePayout[] }>(`/admin/payouts${status ? `?status=${status}` : ''}`),
  createPayout: (body: CreatePayoutBody) =>
    apiPost<{ payout: HousePayout }>('/admin/payouts', body),
  updatePayout: (id: string, body: Partial<Pick<HousePayout, 'status' | 'flutterwaveReference' | 'notes'>>) =>
    apiPatch<{ payout: HousePayout }>(`/admin/payouts/${id}`, body),
};

export interface LedgerRow {
  _id: string;             // YYYY-MM-DD
  betsCount: number;
  totalStakeUsd: number;
  totalPayoutUsd: number;
  houseProfitUsd: number;
  depositVolumeUsd: number;
  withdrawVolumeUsd: number;
  bonusCreditedUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerSummary {
  today: LedgerRow | null;
  yesterday: LedgerRow | null;
  last7:  { betsCount: number; totalStakeUsd: number; totalPayoutUsd: number; houseProfitUsd: number; depositVolumeUsd: number; withdrawVolumeUsd: number; bonusCreditedUsd: number; days: number };
  last30: { betsCount: number; totalStakeUsd: number; totalPayoutUsd: number; houseProfitUsd: number; depositVolumeUsd: number; withdrawVolumeUsd: number; bonusCreditedUsd: number; days: number };
  pendingPayouts: number;
  recentPayouts: HousePayout[];
  series: LedgerRow[];
}

export interface HousePayout {
  _id: string;
  amountUsd: number;
  currency: string;
  notes?: string;
  destination: Record<string, string>;
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  requestedById: string;
  requestedByEmail: string;
  actionedById?: string;
  actionedByEmail?: string;
  actionedAt?: string;
  flutterwaveReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayoutBody {
  amountUsd: number;
  currency?: string;
  notes?: string;
  destination?: Record<string, string>;
}
