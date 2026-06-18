import { Schema, model, type Document, type Types } from 'mongoose';

export type PromoKind   = 'welcome' | 'deposit' | 'free-bet' | 'cashback';
export type PromoTier   = 'public' | 'influencer' | 'vip' | 'seasonal';

/**
 * Admin-created promo campaign. Codes are typed in by users at signup or
 * deposit; the redeem helper checks all the constraints and credits the
 * matching bonus.
 *
 * `bonusAmount` is interpreted per `kind`:
 *   • welcome  → fixed bonus credited on signup (in `currency`)
 *   • deposit  → percentage-of-deposit (0..1) up to `maxBonus`
 *   • free-bet → fixed amount stake-only credit
 *   • cashback → percentage of recent net losses up to `maxBonus`
 */
export interface IPromoCode extends Document {
  _id: Types.ObjectId;
  code: string;
  kind: PromoKind;
  tier: PromoTier;
  /** Amount or fraction depending on `kind` and `bonusType`. */
  bonusAmount: number;
  /** For deposit codes: 'percentage' (of the deposit, default) or 'fixed'
   *  (a flat bonus in `currency`, ignoring the deposit size beyond minDeposit). */
  bonusType?: 'percentage' | 'fixed';
  /** Currency the bonus is denominated in. Falls back to user's currency when unset. */
  currency?: string;
  /** Bonus cap for percentage-style codes. */
  maxBonus?: number;
  /** Minimum deposit required (deposit-bonus codes). */
  minDeposit?: number;
  /** Wagering requirement multiple — bonus * rollover = wager needed before withdraw. */
  rollover: number;
  /** Max withdrawal allowed from this bonus (in `currency`). */
  maxWithdraw?: number;
  /** Optional country whitelist. */
  eligibleCountries?: string[];
  /** Optional game whitelist (matches Bet.gameId). */
  eligibleGames?: string[];
  /** Promoter who owns this code, if any. Their commission accrues on referee bets. */
  promoterId?: Types.ObjectId | null;
  /** Lifecycle. */
  active: boolean;
  expiresAt?: Date;
  /** Usage caps. */
  totalUsageLimit?: number;
  perUserLimit?: number;
  /** Counters — denormalised. */
  totalRedemptions: number;
  createdAt: Date;
}

const promoCodeSchema = new Schema<IPromoCode>({
  code:        { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  kind:        { type: String, enum: ['welcome', 'deposit', 'free-bet', 'cashback'], required: true },
  tier:        { type: String, enum: ['public', 'influencer', 'vip', 'seasonal'], default: 'public' },
  bonusAmount: { type: Number, required: true, min: 0 },
  bonusType:   { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  currency:    { type: String },
  maxBonus:    { type: Number, min: 0 },
  minDeposit:  { type: Number, min: 0 },
  rollover:    { type: Number, default: 1, min: 0 },
  maxWithdraw: { type: Number, min: 0 },
  eligibleCountries: { type: [String], default: undefined },
  eligibleGames:     { type: [String], default: undefined },
  promoterId:        { type: Schema.Types.ObjectId, ref: 'Promoter', default: null, index: true },
  active:            { type: Boolean, default: true, index: true },
  expiresAt:         { type: Date, index: true },
  totalUsageLimit:   { type: Number, min: 0 },
  perUserLimit:      { type: Number, min: 0, default: 1 },
  totalRedemptions:  { type: Number, default: 0, min: 0 },
  createdAt:         { type: Date, default: Date.now },
}, { timestamps: false });

export const PromoCode = model<IPromoCode>('PromoCode', promoCodeSchema);

/** A per-user audit row — used to enforce per-user limits and analytics. */
export interface IPromoRedemption extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  promoCodeId: Types.ObjectId;
  code: string;
  kind: PromoKind;
  bonusCredited: number;
  currency: string;
  rolloverInitial: number;
  createdAt: Date;
}
const redemptionSchema = new Schema<IPromoRedemption>({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  promoCodeId: { type: Schema.Types.ObjectId, ref: 'PromoCode', required: true, index: true },
  code:        { type: String, required: true },
  kind:        { type: String, required: true },
  bonusCredited:  { type: Number, required: true },
  currency:       { type: String, required: true },
  rolloverInitial:{ type: Number, default: 0 },
  createdAt:      { type: Date, default: Date.now },
}, { timestamps: false });

redemptionSchema.index({ userId: 1, promoCodeId: 1 });

export const PromoRedemption = model<IPromoRedemption>('PromoRedemption', redemptionSchema);
