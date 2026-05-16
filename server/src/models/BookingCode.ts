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
  expiresAt: Date;
  redemptionCount: number;
  createdAt: Date;
}

const bookingSchema = new Schema<IBookingCode>({
  code:    { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  selections:     { type: [Schema.Types.Mixed], default: [] },
  suggestedStake: { type: Number, default: 0 },
  currency:       { type: String, default: 'USD' },
  label:          { type: String },
  isPromo:        { type: Boolean, default: false },
  expiresAt:      { type: Date, required: true, index: true },
  redemptionCount:{ type: Number, default: 0 },
  createdAt:      { type: Date, default: Date.now },
}, { timestamps: false });

bookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const BookingCode = model<IBookingCode>('BookingCode', bookingSchema);

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // unambiguous (no 0/O/1/I)
export function generateCode(len = 6): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}
