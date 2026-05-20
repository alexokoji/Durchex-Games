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

  // ─── Per-game tuning ────────────────────────────────────────────────────
  // These shape the OUTCOME distribution of casino games (Crash, Dice, etc).
  // They don't fix outcomes — they bias the underlying RNG.
  /** Crash — house edge applied to the bust distribution (0.01 = 1% edge). */
  crashHouseEdge: number;     // 0.01 default
  /** Crash — chance the round busts almost immediately (< 1.10×). 0.05 = 5%. */
  crashInstaBustRate: number; // 0.05 default
  /** Crash — chance of a "moonshot" round (≥ 10×). 0.05 = 5%. */
  crashMoonshotRate: number;  // 0.05 default
  /** Dice — house edge in decimal (0.01 = 1%). */
  diceHouseEdge: number;      // 0.01 default
  /** Plinko — house edge in decimal. */
  plinkoHouseEdge: number;    // 0.01 default
  /** Slots — target RTP (0.96 = 96% returned to player on average). */
  slotsRtp: number;           // 0.95 default
  /** Mines — house edge in decimal. */
  minesHouseEdge: number;     // 0.01 default
  /** Roulette — house edge in decimal. */
  rouletteHouseEdge: number;  // 0.027 default (European single-zero)

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
  crashHouseEdge:      { type: Number, default: 0.01 },
  crashInstaBustRate:  { type: Number, default: 0.05 },
  crashMoonshotRate:   { type: Number, default: 0.05 },
  diceHouseEdge:       { type: Number, default: 0.01 },
  plinkoHouseEdge:     { type: Number, default: 0.01 },
  slotsRtp:            { type: Number, default: 0.95 },
  minesHouseEdge:      { type: Number, default: 0.01 },
  rouletteHouseEdge:   { type: Number, default: 0.027 },
  updatedAt:           { type: Date, default: Date.now },
}, { timestamps: false, _id: false });

export const RiskConfig = model<IRiskConfig>('RiskConfig', riskSchema);

/** Lazy-init helper — returns the singleton doc, creating defaults if missing. */
export async function getRiskConfig(): Promise<IRiskConfig> {
  const existing = await RiskConfig.findById('singleton');
  if (existing) return existing;
  return RiskConfig.create({ _id: 'singleton' });
}
