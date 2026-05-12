import crypto from 'node:crypto';
import { User, type IUser } from '../models/User';
import { Bet, type IBet } from '../models/Bet';
import { Transaction, type TxKind, type TxMethod } from '../models/Transaction';
import type { Types } from 'mongoose';
import { isCrypto, isFiat, type AnyCurrency, type CryptoCurrency, type FiatCurrency } from '../config/currencies';

const EPS = 1e-9;

// ─── Bets ────────────────────────────────────────────────────────────────

export interface PlaceBetArgs {
  userId: Types.ObjectId | string;
  gameId: string;
  gameName: string;
  stake: number;
  currency: FiatCurrency;     // for casino bets we always use the user's fiat
  details?: string;
  selections?: unknown;
}

/**
 * Atomic placement: the conditional findOneAndUpdate ensures balance ≥ stake
 * AND the user's currency matches what the frontend thinks it is. If either
 * check fails, nothing is decremented and we return an error.
 */
export async function placeBetAtomic(args: PlaceBetArgs): Promise<
  | { bet: IBet; balance: number }
  | { error: 'insufficient_funds' | 'user_not_found' | 'currency_mismatch' }
> {
  if (args.stake <= 0) return { error: 'insufficient_funds' };

  const debited = await User.findOneAndUpdate(
    { _id: args.userId, balance: { $gte: args.stake - EPS }, currency: args.currency },
    { $inc: { balance: -args.stake, totalWagered: args.stake } },
    { new: true },
  );
  if (!debited) {
    const exists = await User.findById(args.userId).select('currency');
    if (!exists) return { error: 'user_not_found' };
    if (exists.currency !== args.currency) return { error: 'currency_mismatch' };
    return { error: 'insufficient_funds' };
  }

  const bet = await Bet.create({
    userId:   debited._id,
    gameId:   args.gameId,
    gameName: args.gameName,
    stake:    args.stake,
    currency: args.currency,
    status:   'pending',
    details:  args.details,
    selections: args.selections,
    placedAt: new Date(),
  });

  await Transaction.create({
    userId:    debited._id,
    kind:      'bet_stake',
    status:    'completed',
    method:    'internal',
    amount:    -args.stake,
    currency:  args.currency,
    reference: `stake-${bet._id.toString()}-${ref()}`,
    betId:     bet._id,
    completedAt: new Date(),
  });

  return { bet, balance: debited.balance };
}

export interface SettleBetArgs {
  userId: Types.ObjectId | string;
  betId: Types.ObjectId | string;
  won: boolean;
  payout: number;
  multiplier?: number;
  details?: string;
}

export async function settleBetAtomic(args: SettleBetArgs): Promise<
  | { bet: IBet; balance: number }
  | { error: 'bet_not_found' | 'bet_already_settled' }
> {
  const bet = await Bet.findOne({ _id: args.betId, userId: args.userId });
  if (!bet) return { error: 'bet_not_found' };
  if (bet.status !== 'pending') return { error: 'bet_already_settled' };

  bet.status     = args.won ? 'won' : 'lost';
  bet.payout     = Math.max(0, args.payout);
  bet.multiplier = args.multiplier;
  bet.details    = args.details ?? bet.details;
  bet.settledAt  = new Date();
  await bet.save();

  let newBalance: number;
  if (bet.payout > 0) {
    const credited = await User.findByIdAndUpdate(
      args.userId,
      { $inc: { balance: bet.payout, totalWon: Math.max(0, bet.payout - bet.stake) } },
      { new: true },
    );
    newBalance = credited?.balance ?? 0;
    await Transaction.create({
      userId:    args.userId,
      kind:      'bet_payout',
      status:    'completed',
      method:    'internal',
      amount:    bet.payout,
      currency:  bet.currency,
      reference: `payout-${bet._id.toString()}-${ref()}`,
      betId:     bet._id,
      completedAt: new Date(),
    });
  } else {
    const u = await User.findById(args.userId).select('balance');
    newBalance = u?.balance ?? 0;
  }

  return { bet, balance: newBalance };
}

// ─── Deposits / withdrawals ───────────────────────────────────────────────

interface CreditFiatArgs {
  user: IUser;
  amount: number;            // in fiat units of `currency`
  currency: FiatCurrency;
  method: TxMethod;
  reference: string;
  flwTxId?: string;
  flwTxRef?: string;
  notes?: string;
}

export async function creditFiatDeposit(args: CreditFiatArgs): Promise<void> {
  if (args.amount <= 0) return;
  await User.findByIdAndUpdate(args.user._id, { $inc: { balance: args.amount } });
  await Transaction.create({
    userId:   args.user._id,
    kind:     'deposit',
    status:   'completed',
    method:   args.method,
    amount:   args.amount,
    currency: args.currency,
    reference: args.reference,
    flwTxId:  args.flwTxId,
    flwTxRef: args.flwTxRef,
    notes:    args.notes,
    completedAt: new Date(),
  });
}

interface CreditCryptoArgs {
  user: IUser;
  amount: number;
  currency: CryptoCurrency;
  network: string;             // 'BTC', 'USDT-ERC20', 'USDC-TRC20' etc.
  address?: string;
  reference: string;
  notes?: string;
}

export async function creditCryptoDeposit(args: CreditCryptoArgs): Promise<void> {
  if (args.amount <= 0) return;
  await User.findByIdAndUpdate(args.user._id, {
    $inc: { [`cryptoBalances.${args.currency}`]: args.amount },
  });
  await Transaction.create({
    userId:        args.user._id,
    kind:          'deposit',
    status:        'completed',
    method:        'crypto',
    amount:        args.amount,
    currency:      args.currency,
    reference:     args.reference,
    cryptoNetwork: args.network,
    cryptoAddress: args.address,
    notes:         args.notes,
    completedAt:   new Date(),
  });
}

interface DebitFiatArgs {
  user: IUser;
  amount: number;
  currency: FiatCurrency;
  method: TxMethod;
  reference: string;
  status?: 'pending' | 'completed';
}
export async function debitFiatWithdrawal(args: DebitFiatArgs): Promise<{ ok: true } | { error: 'insufficient_funds' | 'currency_mismatch' }> {
  const debited = await User.findOneAndUpdate(
    { _id: args.user._id, balance: { $gte: args.amount - EPS }, currency: args.currency },
    { $inc: { balance: -args.amount } },
    { new: true },
  );
  if (!debited) {
    const exists = await User.findById(args.user._id).select('currency');
    if (exists && exists.currency !== args.currency) return { error: 'currency_mismatch' };
    return { error: 'insufficient_funds' };
  }
  await Transaction.create({
    userId:   args.user._id,
    kind:     'withdraw',
    status:   args.status ?? 'pending',
    method:   args.method,
    amount:   -args.amount,
    currency: args.currency,
    reference: args.reference,
  });
  return { ok: true };
}

interface DebitCryptoArgs {
  user: IUser;
  amount: number;
  currency: CryptoCurrency;
  network: string;
  address: string;
  reference: string;
  status?: 'pending' | 'completed';
}
export async function debitCryptoWithdrawal(args: DebitCryptoArgs): Promise<{ ok: true } | { error: 'insufficient_funds' }> {
  // Conditional update — match by user AND a sub-balance ≥ amount.
  const cond = { _id: args.user._id, [`cryptoBalances.${args.currency}`]: { $gte: args.amount - EPS } };
  const debited = await User.findOneAndUpdate(
    cond,
    { $inc: { [`cryptoBalances.${args.currency}`]: -args.amount } },
    { new: true },
  );
  if (!debited) return { error: 'insufficient_funds' };
  await Transaction.create({
    userId:        args.user._id,
    kind:          'withdraw',
    status:        args.status ?? 'pending',
    method:        'crypto',
    amount:        -args.amount,
    currency:      args.currency,
    reference:     args.reference,
    cryptoNetwork: args.network,
    cryptoAddress: args.address,
  });
  return { ok: true };
}

export function newReference(prefix: TxKind | string): string {
  return `${prefix}-${Date.now()}-${ref()}`;
}

function ref(): string {
  return crypto.randomBytes(4).toString('hex');
}

export function isSupportedCurrency(code: string): boolean {
  return isFiat(code) || isCrypto(code);
}

export function asAnyCurrency(code: string): AnyCurrency | null {
  return isFiat(code) || isCrypto(code) ? (code as AnyCurrency) : null;
}
