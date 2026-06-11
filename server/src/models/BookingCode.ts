import { Schema, model, type Document, type Types } from 'mongoose';

/** A short, shareable bet-slip pointer — Bet9ja/SportyBet-style booking code. */
export interface IBookingCode extends Document {
  _id: Types.ObjectId;
  /** 6-char alphanumeric code, uppercase. Indexed unique. */
  code: string;
  /** User who minted it. Null for admin-generated promo slips. */
  ownerId?: Types.ObjectId | null;
  /** Snapshot of selections from BetSlip — kept opaque so the frontend can
   *  hydrate its own model without us caring about every field. */
  selections: unknown[];
  /** Suggested stake at mint time, in `currency`. */
  suggestedStake: number;
  currency: string;
  /** Optional human label — used by admin promo slips (e.g. "Weekly Boost"). */
  label?: string;
  /** Mark slips that are admin-curated promos (influencer campaigns etc.). */
  isPromo: boolean;
  /** Campaign tag for promo slips (e.g. "MIRAGE-IG-JAN"). */
  campaign?: string;
  /** Admin who created a promo slip. */
  createdByAdmin?: Types.ObjectId | null;
  expiresAt: Date;
  /** Times the code page was opened/previewed. */
  views: number;
  /** Times the slip was loaded/hydrated (a.k.a. redemptions). */
  redemptionCount: number;
  /** Bets actually placed from this code + USD turnover they generated. */
  betsPlaced: number;
  revenueUsd: number;
  createdAt: Date;
}

const bookingSchema = new Schema<IBookingCode>({
  code:    { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  selections:     { type: [Schema.Types.Mixed], default: [] },
  suggestedStake: { type: Number, default: 0 },
  currency:       { type: String, default: 'USD' },
  label:          { type: String },
  isPromo:        { type: Boolean, default: false, index: true },
  campaign:       { type: String },
  createdByAdmin: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  expiresAt:      { type: Date, required: true, index: true },
  views:          { type: Number, default: 0 },
  redemptionCount:{ type: Number, default: 0 },
  betsPlaced:     { type: Number, default: 0 },
  revenueUsd:     { type: Number, default: 0 },
  createdAt:      { type: Date, default: Date.now },
}, { timestamps: false });

bookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const BookingCode = model<IBookingCode>('BookingCode', bookingSchema);

/** Attribute a placed bet to the code it was loaded from (promo-slip tracking). */
export async function attributeBetToCode(code: string, revenueUsd: number): Promise<void> {
  if (!code) return;
  await BookingCode.updateOne(
    { code: code.toUpperCase() },
    { $inc: { betsPlaced: 1, revenueUsd: Math.max(0, revenueUsd) } },
  );
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // unambiguous (no 0/O/1/I)
export function generateCode(len = 6): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}
