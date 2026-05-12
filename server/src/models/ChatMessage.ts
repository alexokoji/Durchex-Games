import { Schema, model, type Document, type Types } from 'mongoose';

export interface IChatMessage extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  username: string;        // denormalised for fast rendering
  text: string;
  channel: string;         // 'global' | 'vip' | 'support' | …
  createdAt: Date;
}

const chatSchema = new Schema<IChatMessage>({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String, required: true },
  text:     { type: String, required: true, maxlength: 280 },
  channel:  { type: String, default: 'global', index: true },
  createdAt:{ type: Date,   default: Date.now, index: true },
}, { timestamps: false });

chatSchema.index({ channel: 1, createdAt: -1 });

export const ChatMessage = model<IChatMessage>('ChatMessage', chatSchema);
