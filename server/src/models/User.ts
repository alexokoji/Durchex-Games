import { Schema, model, type Document, type Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { type FiatCurrency, type CryptoCurrency } from '../config/currencies';

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
  /** Primary fiat balance, denominated in `currency`. */
  balance: number;
  /** Per-coin crypto subaccounts. Only crypto deposits credit these. */
  cryptoBalances: CryptoBalances;

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
  cryptoBalances: CryptoBalances;
  totalWagered: number;
  totalWon: number;
  vipLevel: number;
  vipXp: number;
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
  balance:     { type: Number, default: 0, min: 0 },
  // Mongoose doesn't have great typing for Map<string,number>; using a plain
  // sub-object keeps it simple and lets us use $inc with bracket notation.
  cryptoBalances: { type: Schema.Types.Mixed, default: () => ({}) },

  totalWagered: { type: Number, default: 0, min: 0 },
  totalWon:     { type: Number, default: 0, min: 0 },

  vipLevel: { type: Number, default: 1 },
  vipXp:    { type: Number, default: 0 },

  lastLoginAt: { type: Date },
}, { timestamps: true });

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.publicProfile = function (): UserPublicProfile {
  return {
    id:              this._id.toString(),
    email:           this.email,
    username:        this.username,
    initials:        deriveInitials(this.username),
    emailVerified:   this.emailVerified,
    currency:        this.currency,
    countryCode:     this.countryCode,
    balance:         this.balance,
    cryptoBalances:  this.cryptoBalances ?? {},
    totalWagered:    this.totalWagered,
    totalWon:        this.totalWon,
    vipLevel:        this.vipLevel,
    vipXp:           this.vipXp,
  };
};

function deriveInitials(username: string): string {
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 12);
}

export const User = model<IUser>('User', userSchema);
