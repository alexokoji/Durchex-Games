import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * A record of every broadcast/transactional email sent from the admin Email Hub.
 * Kept so admins can see what was sent, to whom, when, and by which staff member.
 */
export type EmailAudience = 'all' | 'verified' | 'unverified' | 'single';

export interface IEmailCampaign extends Document {
  _id: Types.ObjectId;
  subject: string;
  html: string;
  audience: EmailAudience;
  targetEmail?: string;        // when audience === 'single'
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: 'sending' | 'sent' | 'failed';
  sentBy: Types.ObjectId;
  sentByEmail: string;
  createdAt: Date;
}

const schema = new Schema<IEmailCampaign>({
  subject:        { type: String, required: true },
  html:           { type: String, required: true },
  audience:       { type: String, required: true },
  targetEmail:    { type: String },
  recipientCount: { type: Number, default: 0 },
  sentCount:      { type: Number, default: 0 },
  failedCount:    { type: Number, default: 0 },
  status:         { type: String, default: 'sending', index: true },
  sentBy:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sentByEmail:    { type: String, required: true },
  createdAt:      { type: Date, default: Date.now, index: true },
}, { timestamps: false });

export const EmailCampaign = model<IEmailCampaign>('EmailCampaign', schema);
