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
  commissionModel?: 'revenue_share' | 'cpa' | 'hybrid';
  commissionRate: number;
  cpaAmountUsd?: number;
  cpaCount?: number;
  totalReferred: number;
  activeReferrals: number;
  totalWageredUsd: number;
  totalEarnedUsd: number;
  paidOutUsd: number;
  unpaidUsd?: number;
  conversionPct?: number;
  createdAt: string;
  approvedAt?: string;
  bannedAt?: string;
  banReason?: string;
}

export interface PromoterCommissionConfig {
  commissionModel?: 'revenue_share' | 'cpa' | 'hybrid';
  commissionRate?: number;
  cpaAmountUsd?: number;
}

export interface CreatePromoCodeBody {
  code: string;
  kind: PromoKind;
  tier?: PromoTier;
  bonusAmount: number;
  bonusType?: 'percentage' | 'fixed';
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
  bonusType?: 'percentage' | 'fixed';
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
  // Per-game knobs
  crashHouseEdge: number;
  crashInstaBustRate: number;
  crashMoonshotRate: number;
  diceHouseEdge: number;
  plinkoHouseEdge: number;
  slotsRtp: number;
  minesHouseEdge: number;
  rouletteHouseEdge: number;
  // Cash-out controls
  cashoutEnabled?: boolean;
  partialCashoutEnabled?: boolean;
  cashoutMargin?: number;
  maxCashoutMult?: number;
}

export interface RiskSnapshot {
  config: RiskConfigDto;
  rtp24h: number;
  overround: { base: number; adjusted: number };
  exposure: Array<{ market: string; liabilityUsd: number; count: number }>;
}

export interface PublicGameConfig {
  crash:    { houseEdge: number; instaBustRate: number; moonshotRate: number };
  dice:     { houseEdge: number };
  plinko:   { houseEdge: number };
  slots:    { rtp: number };
  mines:    { houseEdge: number };
  roulette: { houseEdge: number };
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

export interface ReferredUserDto {
  _id: string;
  email: string;
  username: string;
  countryCode?: string;
  createdAt: string;
  emailVerified: boolean;
  totalWagered: number;
  totalWon: number;
  referralAbuseFlag?: string | null;
  lastLoginAt?: string;
  referralRewardedAt?: string;
}

export interface SelectionExposureDto {
  eventId: string;
  eventLabel: string;
  marketKey: string;
  outcomeName: string;
  point?: number;
  bettors: number;
  betCount: number;
  stakeUsd: number;
  liabilityUsd: number;
}
export interface RecentBetDto {
  id: string;
  userEmail?: string;
  username?: string;
  gameId: string;
  gameName: string;
  currency: string;
  stake: number;
  stakeUsd: number;
  payout: number;
  multiplier?: number;
  status: string;
  mode: string;
  details?: string;
  placedAt: string;
  selections: { label: string; marketKey: string; outcomeName: string; point?: number; price: number }[];
}
export interface GameActivityDto {
  gameId: string;
  gameName: string;
  players: number;
  bets: number;
  turnoverUsd: number;
  payoutUsd: number;
  netUsd: number;
  openLiabilityUsd: number;
  pendingCount: number;
}
export interface EventControlDto {
  suspended: boolean;
  manualSuspended: boolean;
  status: string;
  commenceTime: string;
}
export interface BettingExposureDto {
  games: GameActivityDto[];
  recentBets: RecentBetDto[];
  selections: SelectionExposureDto[];
  events: Record<string, EventControlDto>;
  totals: {
    openLiabilityUsd: number;
    turnover60mUsd: number;
    net60mUsd: number;
    sportsLiabilityUsd: number;
    optionCount: number;
  };
}

export interface EmailCampaignDto {
  _id: string;
  subject: string;
  audience: 'all' | 'verified' | 'unverified' | 'single';
  targetEmail?: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: 'sending' | 'sent' | 'failed';
  sentByEmail: string;
  createdAt: string;
}

export const adminApi = {
  // Promoters
  promoters: (status?: 'pending' | 'approved' | 'banned') =>
    apiGet<{ promoters: AdminPromoter[] }>(`/admin/promoters${status ? `?status=${status}` : ''}`),
  approvePromoter: (userId: string, body?: PromoterCommissionConfig) =>
    apiPost<{ promoter: AdminPromoter }>(`/admin/promoters/${userId}/approve`, body ?? {}),
  banPromoter: (userId: string, reason?: string) =>
    apiPost<{ promoter: AdminPromoter }>(`/admin/promoters/${userId}/ban`, { reason }),
  updatePromoter: (userId: string, body: PromoterCommissionConfig) =>
    apiPatch<{ promoter: AdminPromoter }>(`/admin/promoters/${userId}`, body),
  promotersReport: () =>
    apiGet<{ report: AdminPromoter[]; totals: { earnedUsd: number; unpaidUsd: number; referrals: number } }>('/admin/promoters/report'),
  payoutPromoter: (userId: string, amountUsd: number) =>
    apiPost<{ promoter: AdminPromoter; unpaidUsd: number }>(`/admin/promoters/${userId}/payout`, { amountUsd }),
  promoterReferrals: (userId: string) =>
    apiGet<{ referrals: ReferredUserDto[] }>(`/admin/promoters/${userId}/referrals`),

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
  getAllUsers: (page = 1, limit = 50) =>
    apiGet<{ users: AdminUserSummary[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/admin/users/all/paginated?page=${page}&limit=${limit}`),
  userDetail: (id: string) =>
    apiGet<{ user: AdminUserSummary & Record<string, unknown> }>(`/admin/users/${id}`),

  // Risk
  risk: () =>
    apiGet<RiskSnapshot>('/admin/risk'),
  updateRisk: (body: Partial<RiskConfigDto>) =>
    apiPatch<{ config: RiskConfigDto }>('/admin/risk', body),

  // Public game knobs (no auth required server-side). Returned in a shape
  // each game can read at startup.
  publicGameConfig: () =>
    apiGet<PublicGameConfig>('/admin/public-game-config'),

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

  // Deposit reconciliation
  pendingDeposits: () =>
    apiGet<{ rows: PendingDepositRow[] }>('/admin/payments/pending'),
  reconcileDeposit: (body: { txRef?: string; flwTxId?: string | number; trustLocal?: boolean }) =>
    apiPost<ReconcileResult>('/admin/payments/reconcile', body),
  reconcileSweep: () =>
    apiPost<ReconcileSweepResult>('/admin/payments/reconcile-sweep', {}),

  // House payouts
  payouts: (status?: HousePayout['status']) =>
    apiGet<{ payouts: HousePayout[] }>(`/admin/payouts${status ? `?status=${status}` : ''}`),
  createPayout: (body: CreatePayoutBody) =>
    apiPost<{ payout: HousePayout }>('/admin/payouts', body),
  updatePayout: (id: string, body: Partial<Pick<HousePayout, 'status' | 'flutterwaveReference' | 'notes'>>) =>
    apiPatch<{ payout: HousePayout }>(`/admin/payouts/${id}`, body),

  // ── Risk management ──
  riskFlags: (filters?: { status?: string; severity?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (filters?.status) qs.set('status', filters.status);
    if (filters?.severity) qs.set('severity', filters.severity);
    if (filters?.type) qs.set('type', filters.type);
    const q = qs.toString();
    return apiGet<{ flags: RiskFlagDto[] }>(`/admin/risk/flags${q ? `?${q}` : ''}`);
  },
  riskUsers: (level: 'low' | 'medium' | 'high' = 'medium') =>
    apiGet<{ users: RiskUserDto[] }>(`/admin/risk/users?level=${level}`),
  scanUser: (userId: string) =>
    apiPost<{ userId: string; score: number; level: string; flags: { type: string; severity: string; detail: string }[] }>(`/admin/risk/scan/${userId}`, {}),
  resolveFlag: (id: string, status: 'reviewed' | 'dismissed') =>
    apiPost<{ flag: RiskFlagDto }>(`/admin/risk/flags/${id}/resolve`, { status }),

  // ── Analytics ──
  analytics: () => apiGet<AnalyticsDto>('/admin/analytics'),

  // ── Promo bet slips (influencer / campaign) ──
  promoSlips: () => apiGet<{ promos: PromoSlipDto[] }>('/admin/promo-slips'),
  createPromoSlip: (body: {
    selections: unknown[]; label: string; campaign?: string;
    suggestedStake?: number; currency?: string; expiresInDays?: number;
  }) => apiPost<{ promo: PromoSlipDto }>('/admin/promo-slips', body),
  deletePromoSlip: (code: string) =>
    apiDelete<{ ok: true }>(`/admin/promo-slips/${encodeURIComponent(code)}`),

  // ── Betting exposure (per-option) ──
  bettingExposure: () => apiGet<BettingExposureDto>('/admin/betting-exposure'),
  suspendLiveEvent: (providerId: string, suspended: boolean) =>
    apiPost<{ ok: true; providerId: string; suspended: boolean; manualSuspended: boolean }>(
      `/admin/live-events/${encodeURIComponent(providerId)}/suspend`, { suspended }),

  // ── Email hub ──
  emailAudienceCount: () =>
    apiGet<{ all: number; verified: number; unverified: number }>('/admin/email/audience-count'),
  emailCampaigns: () =>
    apiGet<{ campaigns: EmailCampaignDto[] }>('/admin/email/campaigns'),
  sendEmail: (body: { subject: string; html: string; audience: 'all' | 'verified' | 'unverified' | 'single'; email?: string }) =>
    apiPost<{ ok: true; recipientCount: number; campaign: EmailCampaignDto }>('/admin/email/send', body),

  // Force-settle pending bets (admin override for edge cases)
  forceSettlePending: () =>
    apiPost<{ ok: true; settled: number; skipped: number; total: number }>('/admin/force-settle-pending', {}),
};

export interface AnalyticsDto {
  users: { active24h: number; newToday: number; depositorsToday: number };
  betting: { betsToday: number; rtp24h: number; turnoverUsd: number; payoutUsd: number };
  exposure: { gameId: string; liabilityUsd: number }[];
  risk: { openBonusAbuse: number; highRiskUsers: number };
  promoters: { earnedUsd: number; unpaidUsd: number; referred: number; conversionPct: number };
  promoSlips: { views: number; loads: number; bets: number; revenue: number; conversionPct: number };
}

export interface PromoSlipDto {
  _id: string;
  code: string;
  label?: string;
  campaign?: string;
  selections: unknown[];
  suggestedStake: number;
  currency: string;
  isPromo: boolean;
  expiresAt: string;
  views: number;
  redemptionCount: number;
  betsPlaced: number;
  revenueUsd: number;
  createdAt: string;
}

export interface RiskFlagDto {
  _id: string;
  userId: { _id: string; email: string; username: string; riskScore?: number; riskLevel?: string; countryCode?: string; totalWagered?: number } | string;
  type: 'multi_account' | 'self_referral' | 'bonus_abuse' | 'sharp_bettor' | 'velocity' | 'suspicious_betting';
  severity: 'low' | 'medium' | 'high';
  weight: number;
  detail: string;
  evidence?: Record<string, unknown>;
  status: 'open' | 'reviewed' | 'dismissed';
  createdAt: string;
}

export interface RiskUserDto {
  _id: string;
  email: string;
  username: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskUpdatedAt?: string;
  countryCode?: string;
  totalWagered: number;
  totalWon: number;
  balance: number;
  bonusBalance: number;
}

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

export interface PendingDepositRow {
  _id: string;
  reference: string;
  amount: number;
  currency: string;
  method: string;
  flwTxId?: string;
  createdAt: string;
  notes?: string;
  userId: { _id: string; email: string; username: string; currency: string } | string;
}

/** All possible terminal states from a single reconcile attempt. Matches
 *  `ReconcileOutcome` on the server. */
export type ReconcileResult =
  | { ok: true;  status: 'credited' }
  | { ok: true;  status: 'already_credited' }
  | { ok: false; status: 'not_found' }
  | { ok: false; status: 'user_not_found' }
  | { ok: false; status: 'not_successful'; flwStatus?: string }
  | { ok: false; status: 'currency_mismatch'; expected: string; got: string }
  | { ok: false; status: 'amount_mismatch'; expected: number; got: number }
  | { ok: false; status: 'not_fiat' }
  | { ok: false; status: 'verify_failed'; message: string };

export interface ReconcileSweepResult {
  scanned: number;
  credited: number;
  alreadyCredited: number;
  notSuccessful: number;
  failed: number;
  details: Array<{ ref: string; status: string; message?: string }>;
}
