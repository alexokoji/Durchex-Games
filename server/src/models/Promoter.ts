import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * Per-promoter stats and config. One per approved user — created when an
 * application is approved. Lifetime totals are denormalised here for fast
 * dashboard reads (no aggregate query on every page load).
 */
export interface IPromoter extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Lifecycle. Mirrors User.promoterStatus but tracked here too for history. */
  status: 'pending' | 'approved' | 'banned';
  /** Application notes / pitch. */
  applicationMessage?: string;
  /** Commission structure:
   *   • revenue_share → `commissionRate` of net gaming revenue from referrals
   *   • cpa           → one-off `cpaAmountUsd` bounty per qualifying referral
   *   • hybrid        → both                                                    */
  commissionModel: 'revenue_share' | 'cpa' | 'hybrid';
  /** Commission rate as a fraction (e.g. 0.20 = 20% of platform revenue from referrals). */
  commissionRate: number;
  /** One-off bounty (USD) paid per referral that becomes active (CPA/hybrid). */
  cpaAmountUsd: number;
  /** CPA bounties paid so far (for reporting). */
  cpaCount: number;
  /** Total referrals to-date (any signup status). */
  totalReferred: number;
  /** Referrals that have made at least one settled bet. */
  activeReferrals: number;
  /** Sum of referred users' lifetime wager in USD. */
  totalWageredUsd: number;
  /** Lifetime commission earned in USD. */
  totalEarnedUsd: number;
  /** Commission already paid out (vs. unpaid balance). */
  paidOutUsd: number;
  createdAt: Date;
  approvedAt?: Date;
  bannedAt?: Date;
  banReason?: string;
}

const promoterSchema = new Schema<IPromoter>({
  userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  status:  { type: String, enum: ['pending', 'approved', 'banned'], default: 'pending', index: true },
  applicationMessage: { type: String, maxlength: 1000 },
  commissionModel:    { type: String, enum: ['revenue_share', 'cpa', 'hybrid'], default: 'revenue_share' },
  commissionRate:     { type: Number, default: 0.20, min: 0, max: 1 },
  cpaAmountUsd:       { type: Number, default: 0, min: 0 },
  cpaCount:           { type: Number, default: 0, min: 0 },
  totalReferred:      { type: Number, default: 0, min: 0 },
  activeReferrals:    { type: Number, default: 0, min: 0 },
  totalWageredUsd:    { type: Number, default: 0, min: 0 },
  totalEarnedUsd:     { type: Number, default: 0, min: 0 },
  paidOutUsd:         { type: Number, default: 0, min: 0 },
  approvedAt: { type: Date },
  bannedAt:   { type: Date },
  banReason:  { type: String },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

export const Promoter = model<IPromoter>('Promoter', promoterSchema);
