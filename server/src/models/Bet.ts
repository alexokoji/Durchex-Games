import { Schema, model, type Document, type Types } from 'mongoose';
import { type AnyCurrency } from '../config/currencies';

export type BetStatus = 'pending' | 'won' | 'lost' | 'push' | 'cashout';

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
  currency: AnyCurrency;       // currency of stake/payout (user's local fiat for casino)
  status: BetStatus;
  details?: string;
  selections?: unknown;

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
  currency:  { type: String, required: true },
  status:    { type: String, enum: ['pending','won','lost','push','cashout'], default: 'pending', index: true },
  details:   { type: String },
  selections:{ type: Schema.Types.Mixed },
  placedAt:  { type: Date, default: Date.now, index: true },
  settledAt: { type: Date },
}, { timestamps: false });

betSchema.index({ userId: 1, placedAt: -1 });

export const Bet = model<IBet>('Bet', betSchema);
