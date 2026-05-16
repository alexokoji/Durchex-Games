import { Schema, model, type Document } from 'mongoose';

/**
 * Singleton document — the platform-wide risk dials. Admin tunes them
 * through `/api/admin/risk` and the simulation/odds modules read at runtime.
 *
 * IMPORTANT: none of these dials force outcomes. They shape weighted
 * randomness — RTP targets, volatility, max liability, etc. The match engine
 * itself remains seeded + random. This is by design — see the project spec.
 */
export interface IRiskConfig extends Document<string> {
  /** Target Return-To-Player window — odds compress / inflate to land in this band. */
  rtpTargetMin: number;       // 0.92
  rtpTargetMax: number;       // 0.96
  /** Bookmaker margin baseline applied to odds before adjustments. */
  baseOverround: number;      // 1.06
  /** Volatility shapes goal/upset/draw rates relative to median. */
  volatility: number;         // 0.5 - 2.0, default 1.0
  /** Draw rate scale — multiplies the natural draw probability. */
  drawRate: number;           // default 1.0
  /** Upset frequency — chance a weaker team beats a stronger one. */
  upsetRate: number;          // default 1.0
  /** Per-market max liability (in USD-equivalent). New bets blocked beyond this. */
  maxLiabilityUsd: number;    // 50_000
  /** Per-user concentration cap (% of platform exposure). */
  maxUserConcentration: number;  // 0.25 = 25%
  /** Booking-code expiry in days. */
  bookingCodeDays: number;    // 7
  updatedAt: Date;
}

const riskSchema = new Schema<IRiskConfig>({
  _id: { type: String, default: 'singleton' },
  rtpTargetMin:        { type: Number, default: 0.92 },
  rtpTargetMax:        { type: Number, default: 0.96 },
  baseOverround:       { type: Number, default: 1.06 },
  volatility:          { type: Number, default: 1.00 },
  drawRate:            { type: Number, default: 1.00 },
  upsetRate:           { type: Number, default: 1.00 },
  maxLiabilityUsd:     { type: Number, default: 50_000 },
  maxUserConcentration:{ type: Number, default: 0.25 },
  bookingCodeDays:     { type: Number, default: 7 },
  updatedAt:           { type: Date, default: Date.now },
}, { timestamps: false, _id: false });

export const RiskConfig = model<IRiskConfig>('RiskConfig', riskSchema);

/** Lazy-init helper — returns the singleton doc, creating defaults if missing. */
export async function getRiskConfig(): Promise<IRiskConfig> {
  const existing = await RiskConfig.findById('singleton');
  if (existing) return existing;
  return RiskConfig.create({ _id: 'singleton' });
}
