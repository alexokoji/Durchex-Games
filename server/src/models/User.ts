import { Schema, model, type Document, type Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { type FiatCurrency, type CryptoCurrency } from '../config/currencies';
import { isAdminEmail } from '../config/admin';

export type CryptoBalances = Partial<Record<CryptoCurrency, number>>;

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  username: string;
  passwordHash?: string;
  googleId?: string;
  appleId?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;

  // ─── Wallet ────────────────────────────────────────────────────────────
  // The user's local currency. Set on registration from geolocation; user
  // can change it later. ALL fiat money flows (deposits, withdrawals,
  // bet stakes, payouts) happen in this currency.
  currency: FiatCurrency;
  countryCode?: string;
  /** Primary fiat (REAL) balance, denominated in `currency`. Withdrawable. */
  balance: number;
  /** Bonus balance — NOT withdrawable until rollover requirement is cleared.
   *  Used for betting first (before real balance) when present. */
  bonusBalance: number;
  /** Outstanding wagering requirement — must be reduced to 0 before the
   *  user can withdraw real balance gained while bonus funds were active. */
  bonusRollover: number;
  /** Per-coin crypto subaccounts. Only crypto deposits credit these. */
  cryptoBalances: CryptoBalances;

  // ─── Referral / promoter ──────────────────────────────────────────────
  /** Each user gets a personal referral code at signup. Promoters share
   *  this code; signups using it get linked to the inviter via `referredBy`. */
  referralCode: string;
  referredBy?: Types.ObjectId;
  /** Promoter program status. Default 'none' — user must apply. */
  promoterStatus: 'none' | 'pending' | 'approved' | 'banned';

  /** Anti-abuse signals captured at signup — see services/promo.ts.
   *  These are matched against the referrer and other referees to detect
   *  self-referral via incognito tabs, shared hotspot families, etc. */
  signupDeviceSignature?: string;
  signupIp?: string;
  /** When attribution was blocked or flagged for review. Null = clean. */
  referralAbuseFlag?: 'self_device' | 'self_ip' | 'duplicate_device' | 'duplicate_ip' | null;

  /** Aggregate risk score (0–100) and band, maintained by the risk engine. */
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  riskUpdatedAt?: Date;

  /** When the CPA bounty for this referred user was credited to its promoter. */
  referralRewardedAt?: Date;

  /** Bonus funds expire at this time if rollover isn't cleared first. */
  bonusExpiresAt?: Date;
  /** Max withdrawal (USD) permitted from the active bonus's winnings. 0/undef = uncapped. */
  bonusMaxWithdrawUsd?: number;

  /** Registered Expo push tokens for this user's devices. */
  pushTokens?: string[];

  /** Promo code captured at signup that needs the user's first deposit to
   *  activate (e.g. a `kind: 'deposit'` campaign giving X% of the first
   *  top-up). Cleared by the deposit webhook once the bonus is awarded. */
  pendingDepositPromo?: string | null;

  // Lifetime stats — in the user's primary currency.
  totalWagered: number;
  totalWon: number;

  vipLevel: number;
  vipXp: number;

  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;

  comparePassword(candidate: string): Promise<boolean>;
  publicProfile(): UserPublicProfile;
}

export interface UserPublicProfile {
  id: string;
  email: string;
  username: string;
  initials: string;
  emailVerified: boolean;
  currency: FiatCurrency;
  countryCode?: string;
  balance: number;
  bonusBalance: number;
  bonusRollover: number;
  cryptoBalances: CryptoBalances;
  totalWagered: number;
  totalWon: number;
  /** VIP tier 0..5 (0 = Unranked). Derived from totalWagered (USD-equivalent). */
  vipLevel: number;
  /** Display name for the tier — "Bronze", "Silver", … "Diamond" or "Unranked". */
  vipName: string;
  /** Cashback % (0..1) for the current tier. */
  vipCashbackPct: number;
  vipColor: string;
  /** Lifetime wagered in USD-equivalent. */
  vipWageredUsd: number;
  /** USD needed to reach the next tier (null at Diamond). */
  vipNextThresholdUsd: number | null;
  /** 0..100, share of the current tier band already wagered. */
  vipProgressPct: number;
  vipXp: number;
  referralCode: string;
  promoterStatus: 'none' | 'pending' | 'approved' | 'banned';
  isAdmin: boolean;
}

const userSchema = new Schema<IUser>({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  username:     { type: String, required: true, unique: true, trim: true, index: true },
  passwordHash: { type: String, select: false },
  googleId:     { type: String, sparse: true, unique: true },
  appleId:      { type: String, sparse: true, unique: true },

  emailVerified:              { type: Boolean, default: false },
  emailVerificationToken:     { type: String, select: false },
  emailVerificationExpiresAt: { type: Date,   select: false },
  passwordResetToken:         { type: String, select: false },
  passwordResetExpiresAt:     { type: Date,   select: false },

  currency:    { type: String, default: 'USD' },
  countryCode: { type: String },
  balance:       { type: Number, default: 0, min: 0 },
  bonusBalance:  { type: Number, default: 0, min: 0 },
  bonusRollover: { type: Number, default: 0, min: 0 },
  // Mongoose doesn't have great typing for Map<string,number>; using a plain
  // sub-object keeps it simple and lets us use $inc with bracket notation.
  cryptoBalances: { type: Schema.Types.Mixed, default: () => ({}) },

  referralCode:  { type: String, required: true, unique: true, index: true },
  referredBy:    { type: Schema.Types.ObjectId, ref: 'User', index: true, default: null },
  promoterStatus: { type: String, enum: ['none', 'pending', 'approved', 'banned'], default: 'none', index: true },

  signupDeviceSignature: { type: String, index: true, sparse: true },
  signupIp:              { type: String, index: true, sparse: true },
  referralAbuseFlag:     { type: String, enum: ['self_device', 'self_ip', 'duplicate_device', 'duplicate_ip', null], default: null, sparse: true },
  riskScore:     { type: Number, default: 0, min: 0, max: 100, index: true },
  riskLevel:     { type: String, enum: ['low', 'medium', 'high'], default: 'low', index: true },
  riskUpdatedAt: { type: Date },
  referralRewardedAt: { type: Date },
  bonusExpiresAt:      { type: Date, index: true },
  bonusMaxWithdrawUsd: { type: Number, min: 0 },
  pushTokens:          { type: [String], default: [] },
  pendingDepositPromo:   { type: String, default: null, sparse: true },

  totalWagered: { type: Number, default: 0, min: 0 },
  totalWon:     { type: Number, default: 0, min: 0 },

  vipLevel: { type: Number, default: 1 },
  vipXp:    { type: Number, default: 0 },

  lastLoginAt: { type: Date },
}, { timestamps: true });

// Auto-fill the referral code on first save if the caller didn't supply one.
// Retries on collision; gives up after a few tries (the alphabet has 32^8 =
// ~1.1 trillion permutations, so collisions in practice are essentially nil).
userSchema.pre('validate', async function (next) {
  if (this.referralCode) return next();
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateReferralCode(this.email);
    const exists = await model<IUser>('User').exists({ referralCode: candidate });
    if (!exists) {
      this.referralCode = candidate;
      return next();
    }
  }
  next(new Error('referral_code_minting_failed'));
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.publicProfile = function (): UserPublicProfile {
  // Lazy-import to avoid a circular dep between User → vip → houseLedger → currencies.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vipMod = require('../services/vip') as typeof import('../services/vip');
  const { tier, wageredUsd, nextThresholdUsd, progressPct } = vipMod.tierForUser({
    totalWagered: this.totalWagered ?? 0,
    currency: this.currency,
  });
  return {
    id:              this._id.toString(),
    email:           this.email,
    username:        this.username,
    initials:        deriveInitials(this.username),
    emailVerified:   this.emailVerified,
    currency:        this.currency,
    countryCode:     this.countryCode,
    balance:         this.balance,
    bonusBalance:    this.bonusBalance ?? 0,
    bonusRollover:   this.bonusRollover ?? 0,
    cryptoBalances:  this.cryptoBalances ?? {},
    totalWagered:    this.totalWagered,
    totalWon:        this.totalWon,
    vipLevel:        tier.level,
    vipName:         tier.name,
    vipCashbackPct:  tier.cashbackPct,
    vipColor:        tier.color,
    vipWageredUsd:   wageredUsd,
    vipNextThresholdUsd: nextThresholdUsd,
    vipProgressPct:  progressPct,
    vipXp:           this.vipXp,
    referralCode:    this.referralCode,
    promoterStatus:  this.promoterStatus,
    isAdmin:         isAdminEmail(this.email),
  };
};

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateReferralCode(seed?: string): string {
  // 8-char alphanumeric, prefixed with a hash of the user's email/id for
  // mild deterministic flavour but still random enough to avoid collisions.
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  void seed;
  return out;
}

function deriveInitials(username: string): string {
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 12);
}

export const User = model<IUser>('User', userSchema);
