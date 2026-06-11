import { apiGet, apiPost } from './client';

export interface BookingCodeMintBody {
  selections: unknown[];          // opaque BetSelection[] snapshot
  suggestedStake?: number;
  currency?: string;
  label?: string;
}
export interface BookingCodeMintResult {
  code: string;                   // short, sharable
  expiresAt: string;
  selections: number;             // count, not the payload
}

export interface BookingCodeRedeemResult {
  code: string;
  label?: string;
  isPromo: boolean;
  campaign?: string;
  selections: unknown[];
  suggestedStake: number;
  currency: string;
  expiresAt: string;
  redemptionCount: number;
}

export const bookingCodesApi = {
  mint: (body: BookingCodeMintBody) =>
    apiPost<BookingCodeMintResult>('/booking-codes', body),
  redeem: (code: string) =>
    apiGet<BookingCodeRedeemResult>(`/booking-codes/${encodeURIComponent(code.trim().toUpperCase())}`),
  /** Fire-and-forget view ping (shareable link opened). */
  view: (code: string) =>
    apiPost<{ ok: true }>(`/booking-codes/${encodeURIComponent(code.trim().toUpperCase())}/view`, {}),
};
