import { Schema, model, type Document, type Types } from 'mongoose';
import { type AnyCurrency } from '../config/currencies';

export type BetStatus = 'pending' | 'won' | 'lost' | 'push' | 'cashout' | 'void' | 'refunded';

export interface IBet extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;

  gameId: string;
  gameName: string;

  stake: number;
  /** Portion of `stake` paid out of bonus funds (rest is real balance). */
  bonusStake: number;
  payout: number;
  multiplier?: number;
  mode?: string;
  systemK?: number;
  currency: AnyCurrency;       // currency of stake/payout (user's local fiat for casino)
  status: BetStatus;
  details?: string;
  selections?: unknown;
  /** Per-selection outcome snapshots written at settle time. Lets any device
   *  reconstruct the per-leg win/loss display for settled tickets. */
  selectionResults?: unknown;

  // ── Cashout ────────────────────────────────────────────────────────────────
  /** Cumulative amount already paid out via (partial) cash-out, in `currency`. */
  cashoutAmount?: number;
  /** Fraction of the original stake that has been cashed out so far (0..1). */
  cashoutFraction?: number;
  /** Original stake before any partial cash-out reduced it. */
  originalStake?: number;
  cashedOutAt?: Date;

  /** Reason recorded when an admin voids/refunds the bet. */
  reverseReason?: string;

  placedAt: Date;
  settledAt?: Date;
}

const betSchema = new Schema<IBet>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  gameId:    { type: String, required: true, index: true },
  gameName:  { type: String, required: true },
  stake:     { type: Number, required: true, min: 0 },
  bonusStake:{ type: Number, default: 0, min: 0 },
  payout:    { type: Number, default: 0, min: 0 },
  multiplier:{ type: Number },
  mode:      { type: String },
  systemK:   { type: Number },
  currency:  { type: String, required: true },
  status:    { type: String, enum: ['pending','won','lost','push','cashout','void','refunded'], default: 'pending', index: true },
  details:          { type: String },
  selections:       { type: Schema.Types.Mixed },
  selectionResults: { type: Schema.Types.Mixed },
  cashoutAmount:    { type: Number, default: 0, min: 0 },
  cashoutFraction:  { type: Number, default: 0, min: 0, max: 1 },
  originalStake:    { type: Number, min: 0 },
  cashedOutAt:      { type: Date },
  reverseReason:    { type: String },
  placedAt:         { type: Date, default: Date.now, index: true },
  settledAt: { type: Date },
}, { timestamps: false });

betSchema.index({ userId: 1, placedAt: -1 });

export const Bet = model<IBet>('Bet', betSchema);
