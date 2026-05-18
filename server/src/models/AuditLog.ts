import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * Append-only audit trail for sensitive admin actions. Never mutate or delete
 * an existing row — corrections should write a new row referencing the
 * original. We keep before/after snapshots small (the diff, not the full
 * document) so this table doesn't balloon.
 */
export type AuditAction =
  | 'promoter.approve'
  | 'promoter.ban'
  | 'promoter.commission_update'
  | 'promocode.create'
  | 'promocode.update'
  | 'promocode.delete'
  | 'risk.update'
  | 'cashback.run'
  | 'user.view';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;       // the admin who performed the action
  actorEmail: string;            // denormalised so log stays readable after a user delete
  action: AuditAction;
  /** The thing being acted on (user id, promo code id, etc.). Always a string
   *  so we don't need a polymorphic ref. */
  targetType: 'user' | 'promo_code' | 'risk_config' | 'system';
  targetId?: string;
  /** Lightweight diff: { before: {...}, after: {...} } or just { payload: {...} }. */
  payload?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  actorId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorEmail: { type: String, required: true },
  action:     { type: String, required: true, index: true },
  targetType: { type: String, required: true },
  targetId:   { type: String, index: true, sparse: true },
  payload:    { type: Schema.Types.Mixed },
  ip:         { type: String },
  createdAt:  { type: Date, default: Date.now, index: true },
}, { timestamps: false });

auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
