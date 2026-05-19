import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A request to withdraw accumulated house P/L out of the platform's
 * Flutterwave float to an external bank account. Stays in `requested`
 * until an admin marks it actioned (and optionally pastes the Flutterwave
 * reference). We don't auto-call the Flutterwave Transfers API yet because
 * the user prefers manual review for any movement of real money.
 */
export type HousePayoutStatus = 'requested' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

export interface IHousePayout extends Document {
  _id: Types.ObjectId;
  amountUsd: number;
  /** Destination currency the bank account is denominated in. */
  currency: string;
  /** Free-form description from the requesting admin. */
  notes?: string;
  /** Where the funds are headed — opaque key/value pairs (bank, account #,
   *  beneficiary, etc.). Stored as a Map so we don't have to chase the
   *  schema every time a new field is needed. */
  destination: Record<string, string>;
  status: HousePayoutStatus;
  /** Admin who created the request. */
  requestedById: Types.ObjectId;
  requestedByEmail: string;
  /** Admin who actioned/completed the payout. */
  actionedById?: Types.ObjectId;
  actionedByEmail?: string;
  actionedAt?: Date;
  flutterwaveReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const housePayoutSchema = new Schema<IHousePayout>({
  amountUsd:        { type: Number, required: true, min: 0 },
  currency:         { type: String, default: 'NGN' },
  notes:            { type: String, maxlength: 500 },
  destination:      { type: Schema.Types.Mixed, default: {} },
  status:           { type: String, enum: ['requested', 'in_progress', 'completed', 'cancelled', 'failed'], default: 'requested', index: true },
  requestedById:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedByEmail: { type: String, required: true },
  actionedById:     { type: Schema.Types.ObjectId, ref: 'User' },
  actionedByEmail:  { type: String },
  actionedAt:       { type: Date },
  flutterwaveReference: { type: String, index: true, sparse: true },
}, { timestamps: true });

housePayoutSchema.index({ createdAt: -1 });
housePayoutSchema.index({ status: 1, createdAt: -1 });

export const HousePayout = model<IHousePayout>('HousePayout', housePayoutSchema);
