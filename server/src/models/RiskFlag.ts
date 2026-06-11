import { Schema, model, type Document, type Types } from 'mongoose';

export type RiskFlagType =
  | 'multi_account'       // shares device/IP with other accounts
  | 'self_referral'       // referred by an account sharing device/IP
  | 'bonus_abuse'         // withdrawing with ~no real deposits / bonus farming
  | 'sharp_bettor'        // sustained high ROI / win-rate
  | 'velocity'            // abnormal bet frequency
  | 'suspicious_betting'; // stake spikes / pattern anomalies

export type RiskSeverity = 'low' | 'medium' | 'high';
export type RiskFlagStatus = 'open' | 'reviewed' | 'dismissed';

export interface IRiskFlag extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: RiskFlagType;
  severity: RiskSeverity;
  /** Points this flag contributes to the user's aggregate risk score. */
  weight: number;
  detail: string;
  evidence?: Record<string, unknown>;
  status: RiskFlagStatus;
  createdAt: Date;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
}

const schema = new Schema<IRiskFlag>({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:     { type: String, required: true, index: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], required: true, index: true },
  weight:   { type: Number, required: true, min: 0 },
  detail:   { type: String, required: true },
  evidence: { type: Schema.Types.Mixed },
  status:   { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open', index: true },
  createdAt:  { type: Date, default: Date.now, index: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: false });

// One open flag per (user, type) — re-scanning updates the existing one.
schema.index({ userId: 1, type: 1, status: 1 });

export const RiskFlag = model<IRiskFlag>('RiskFlag', schema);
