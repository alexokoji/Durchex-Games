import { Schema, model, type Document, type Types } from 'mongoose';

export type SportEventStatus = 'upcoming' | 'live' | 'completed' | 'settled';

export interface IEventOutcome { name: string; price: number; point?: number }
export interface IEventMarket {
  key: string;                 // 'h2h' | 'totals'
  suspended: boolean;          // trading engine can suspend a single market
  outcomes: IEventOutcome[];
}

export interface ISportEvent extends Document {
  _id: Types.ObjectId;
  provider: string;
  providerId: string;          // stable feed id
  sportKey: string;            // competition key, e.g. 'soccer_epl'
  sportTitle: string;          // competition name, e.g. 'EPL'
  sportGroup: string;          // sport, e.g. 'Soccer' | 'Basketball'
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  status: SportEventStatus;
  suspended: boolean;          // whole-event suspension
  markets: IEventMarket[];
  /** USD liability currently exposed on this event (trading engine). */
  exposureUsd: number;
  result?: { homeScore: number; awayScore: number; completed: boolean };
  updatedAt: Date;
}

const outcomeSchema = new Schema<IEventOutcome>({
  name:  { type: String, required: true },
  price: { type: Number, required: true, min: 1 },
  point: { type: Number },
}, { _id: false });

const marketSchema = new Schema<IEventMarket>({
  key:       { type: String, required: true },
  suspended: { type: Boolean, default: false },
  outcomes:  { type: [outcomeSchema], default: [] },
}, { _id: false });

const eventSchema = new Schema<ISportEvent>({
  provider:     { type: String, required: true },
  providerId:   { type: String, required: true, unique: true, index: true },
  sportKey:     { type: String, required: true, index: true },
  sportTitle:   { type: String, required: true },
  sportGroup:   { type: String, required: true, default: 'Other', index: true },
  homeTeam:     { type: String, required: true },
  awayTeam:     { type: String, required: true },
  commenceTime: { type: Date, required: true, index: true },
  status:       { type: String, enum: ['upcoming','live','completed','settled'], default: 'upcoming', index: true },
  suspended:    { type: Boolean, default: false },
  markets:      { type: [marketSchema], default: [] },
  exposureUsd:  { type: Number, default: 0 },
  result:       { type: new Schema({ homeScore: Number, awayScore: Number, completed: Boolean }, { _id: false }), default: undefined },
  updatedAt:    { type: Date, default: Date.now },
}, { timestamps: false });

eventSchema.index({ sportKey: 1, commenceTime: 1 });

export const SportEvent = model<ISportEvent>('SportEvent', eventSchema);
