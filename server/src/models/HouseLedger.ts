import { Schema, model, type Document } from 'mongoose';

/**
 * One row per UTC calendar day capturing the platform's P/L. Wallet
 * settlements increment this row in real time so the admin dashboard and
 * the daily summary email both have a single source of truth.
 *
 * Stored in USD-equivalent so the admin doesn't have to mentally aggregate
 * across 18 fiat currencies. The settlement code converts each bet's stake
 * and payout via the static `FIAT[code].usdPerUnit` table before adding.
 *
 * `_id` is the date string in `YYYY-MM-DD` so the upsert is idempotent.
 */
export interface IHouseLedger extends Document<string> {
  _id: string;                  // 'YYYY-MM-DD' (UTC)
  // Aggregate counters — all in USD-equivalent.
  betsCount: number;
  totalStakeUsd: number;
  totalPayoutUsd: number;
  /** = totalStakeUsd - totalPayoutUsd. Positive = house won the day. */
  houseProfitUsd: number;
  /** New-money in (fiat deposits that completed). */
  depositVolumeUsd: number;
  /** Cash-out volume (withdrawals that completed). */
  withdrawVolumeUsd: number;
  /** Bonus credited (welcome / deposit-match / cashback). */
  bonusCreditedUsd: number;
  /** First time we touched this row. */
  createdAt: Date;
  /** Last increment. */
  updatedAt: Date;
}

const houseLedgerSchema = new Schema<IHouseLedger>({
  _id:               { type: String, required: true },
  betsCount:         { type: Number, default: 0 },
  totalStakeUsd:     { type: Number, default: 0 },
  totalPayoutUsd:    { type: Number, default: 0 },
  houseProfitUsd:    { type: Number, default: 0 },
  depositVolumeUsd:  { type: Number, default: 0 },
  withdrawVolumeUsd: { type: Number, default: 0 },
  bonusCreditedUsd:  { type: Number, default: 0 },
}, { _id: false, timestamps: true });

houseLedgerSchema.index({ createdAt: -1 });

export const HouseLedger = model<IHouseLedger>('HouseLedger', houseLedgerSchema);

/** Returns the UTC date key (`YYYY-MM-DD`) for a Date instance. */
export function ledgerKeyFor(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
