import { Schema, model, type Document, type Types } from 'mongoose';

/** Persisted notification — the unified in-app feed. */
export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  kind: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

const schema = new Schema<INotification>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind:      { type: String, required: true },
  title:     { type: String, required: true },
  body:      { type: String },
  data:      { type: Schema.Types.Mixed },
  read:      { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

schema.index({ userId: 1, createdAt: -1 });
// Auto-purge after 60 days.
schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export const Notification = model<INotification>('Notification', schema);
