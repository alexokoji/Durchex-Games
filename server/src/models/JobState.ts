import { Schema, model, type Document } from 'mongoose';

/**
 * Tiny per-job state document. Used to track when the cashback (and any
 * future) recurring jobs last ran, so a server restart can't double-credit.
 *
 * Keyed by job name (string `_id`); we use one document per job.
 */
export interface IJobState extends Document<string> {
  _id: string;            // e.g. 'cashback_weekly'
  lastRunAt: Date;
  lastRunCount: number;   // how many users were credited on the last run
  lastRunError?: string;
  updatedAt: Date;
}

const jobStateSchema = new Schema<IJobState>({
  _id:          { type: String, required: true },
  lastRunAt:    { type: Date,   required: true },
  lastRunCount: { type: Number, default: 0 },
  lastRunError: { type: String },
  updatedAt:    { type: Date,   default: Date.now },
}, { _id: false, timestamps: false });

export const JobState = model<IJobState>('JobState', jobStateSchema);
