import { Schema, model, type Document, type Types } from 'mongoose';
import { type AnyCurrency } from '../config/currencies';

export type TxKind   = 'deposit' | 'withdraw' | 'bet_stake' | 'bet_payout' | 'bonus' | 'adjustment' | 'swap';
export type TxStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type TxMethod = 'card' | 'bank' | 'mobilemoney' | 'ussd' | 'crypto' | 'internal';

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;

  kind: TxKind;
  status: TxStatus;
  method: TxMethod;

  /** Amount in `currency`. Signed: positive = credit, negative = debit. */
  amount: number;
  currency: AnyCurrency;

  reference: string;
  flwTxId?: string;
  flwTxRef?: string;
  cryptoNetwork?: string;
  cryptoAddress?: string;

  betId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const txSchema = new Schema<ITransaction>({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind:     { type: String, enum: ['deposit','withdraw','bet_stake','bet_payout','bonus','adjustment','swap'], required: true, index: true },
  status:   { type: String, enum: ['pending','completed','failed','cancelled'], default: 'completed', index: true },
  method:   { type: String, enum: ['card','bank','mobilemoney','ussd','crypto','internal'], default: 'internal' },

  amount:   { type: Number, required: true },
  currency: { type: String, required: true },

  reference: { type: String, required: true, unique: true, index: true },
  flwTxId:   { type: String, index: true, sparse: true },
  flwTxRef:  { type: String, index: true, sparse: true },
  cryptoNetwork: { type: String },
  cryptoAddress: { type: String },

  betId:  { type: Schema.Types.ObjectId, ref: 'Bet' },
  notes:  { type: String },
  completedAt: { type: Date },
}, { timestamps: true });

txSchema.index({ userId: 1, createdAt: -1 });

export const Transaction = model<ITransaction>('Transaction', txSchema);
