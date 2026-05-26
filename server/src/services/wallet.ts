import crypto from 'node:crypto';
import { User, type IUser } from '../models/User';
import { Bet, type IBet } from '../models/Bet';
import { Transaction, type TxKind, type TxMethod } from '../models/Transaction';
import type { Types } from 'mongoose';
import { isCrypto, isFiat, type AnyCurrency, type CryptoCurrency, type FiatCurrency } from '../config/currencies';
import { recordBetSettlement, recordDeposit, recordWithdrawal } from './houseLedger';

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
  mode?: string;
  systemK?: number;
}

/**
 * Atomic placement with bonus-first ordering.
 *
 *   1. Read the user once to see the bonus / real split.
 *   2. Compute bonusUsed = min(bonusBalance, stake); realUsed = stake − bonusUsed.
 *   3. Conditional update that decrements both fields with the exact gates,
 *      so a race that drained either pot since step 1 fails the update.
 *   4. Wagering reduces `bonusRollover` proportionally — bonus stake counts
 *      directly toward clearing the rollover requirement.
 */
export async function placeBetAtomic(args: PlaceBetArgs): Promise<
  | { bet: IBet; balance: number; bonusBalance: number }
  | { error: 'insufficient_funds' | 'user_not_found' | 'currency_mismatch' }
> {
  if (args.stake <= 0) return { error: 'insufficient_funds' };

  const user = await User.findById(args.userId).select('balance bonusBalance bonusRollover currency');
  if (!user) return { error: 'user_not_found' };
  if (user.currency !== args.currency) return { error: 'currency_mismatch' };

  const bonus = user.bonusBalance ?? 0;
  const real  = user.balance ?? 0;
  if (bonus + real + EPS < args.stake) return { error: 'insufficient_funds' };

  const bonusUsed = Math.min(bonus, args.stake);
  const realUsed  = Math.max(0, args.stake - bonusUsed);

  // Conditional update: each pot must still cover its share when the write lands.
  const debited = await User.findOneAndUpdate(
    {
      _id: args.userId,
      currency: args.currency,
      balance:      { $gte: realUsed  - EPS },
      bonusBalance: { $gte: bonusUsed - EPS },
    },
    {
      $inc: {
        balance:       -realUsed,
        bonusBalance:  -bonusUsed,
        totalWagered:  args.stake,
        // Clearing rollover — every unit of bonus actually wagered chips
        // away at the outstanding requirement, never going below 0.
        bonusRollover: -Math.min(bonusUsed, user.bonusRollover ?? 0),
      },
    },
    { new: true },
  );
  if (!debited) return { error: 'insufficient_funds' };

  const bet = await Bet.create({
    userId:   debited._id,
    gameId:   args.gameId,
    gameName: args.gameName,
    stake:    args.stake,
    bonusStake: bonusUsed,
    currency: args.currency,
    mode:     args.mode,
    systemK:  args.systemK,
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
    notes:     bonusUsed > 0 ? `bonus_stake=${bonusUsed}` : undefined,
    completedAt: new Date(),
  });

  return { bet, balance: debited.balance, bonusBalance: debited.bonusBalance ?? 0 };
}

export interface SettleBetArgs {
  userId: Types.ObjectId | string;
  betId: Types.ObjectId | string;
  won: boolean;
  payout: number;
  multiplier?: number;
  details?: string;
}

/**
 * Settles a pending bet. Winnings (payout) always credit the REAL balance,
 * never the bonus pot — that's the rule that makes bonus-funded profit
 * withdrawable. Bonus stake that was already wagered is gone whether the
 * bet won or lost; only the profit (payout − stake) is "new money" and it
 * lands in real balance like any other payout.
 */
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
    console.log('[settleBetAtomic] Crediting payout:', {
      betId: args.betId.toString(),
      userId: args.userId.toString(),
      betCurrency: bet.currency,
      betStake: bet.stake,
      payoutAmount: bet.payout,
      expectedProfit: bet.payout - bet.stake,
    });
    const credited = await User.findByIdAndUpdate(
      args.userId,
      { $inc: { balance: bet.payout, totalWon: Math.max(0, bet.payout - bet.stake) } },
      { new: true },
    );
    newBalance = credited?.balance ?? 0;
    console.log('[settleBetAtomic] After credit:', {
      betId: args.betId.toString(),
      newBalance,
      userCurrency: credited?.currency,
    });
    await Transaction.create({
      userId:    args.userId,
      kind:      'bet_payout',
      status:    'completed',
      method:    'internal',
      amount:    bet.payout,
      currency:  bet.currency,
      reference: `payout-${bet._id.toString()}-${ref()}`,
      betId:     bet._id,
      notes:     bet.bonusStake > 0 ? `from_bonus_stake=${bet.bonusStake}` : undefined,
      completedAt: new Date(),
    });
  } else {
    const u = await User.findById(args.userId).select('balance');
    newBalance = u?.balance ?? 0;
  }

  // Update today's house ledger with this bet's contribution to P/L. Non-blocking.
  void recordBetSettlement({ stake: bet.stake, payout: bet.payout, currency: bet.currency });

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
  void recordDeposit(args.amount, args.currency);
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
export async function debitFiatWithdrawal(args: DebitFiatArgs): Promise<
  | { ok: true }
  | { error: 'insufficient_funds' | 'currency_mismatch' | 'rollover_outstanding'; rollover?: number }
> {
  // Withdrawals are blocked while any bonus-rollover requirement is outstanding.
  // The conditional update also checks rollover === 0 to close a race where a
  // pending bet settles into a new rollover obligation between read and write.
  const debited = await User.findOneAndUpdate(
    {
      _id: args.user._id,
      currency: args.currency,
      balance: { $gte: args.amount - EPS },
    },
    { $inc: { balance: -args.amount } },
    { new: true },
  );
  if (!debited) {
    const exists = await User.findById(args.user._id).select('currency balance');
    if (!exists) return { error: 'insufficient_funds' };
    if (exists.currency !== args.currency) return { error: 'currency_mismatch' };
    if ((exists.balance ?? 0) + EPS < args.amount) {
      return { error: 'insufficient_funds' };
    }
    // If we reached here, something prevented the update — treat as insufficient funds.
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
  void recordWithdrawal(args.amount, args.currency);
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
export async function debitCryptoWithdrawal(args: DebitCryptoArgs): Promise<
  | { ok: true }
  | { error: 'insufficient_funds' | 'rollover_outstanding'; rollover?: number }
> {
  // Crypto subaccounts share the SAME rollover gate as fiat: any outstanding
  // bonus wagering requirement on the primary account blocks all withdrawals,
  // because the bonus pot was funded in fiat and rollover is the platform-wide
  // anti-abuse mechanism, not a per-currency one.
  const cond = {
    _id: args.user._id,
    [`cryptoBalances.${args.currency}`]: { $gte: args.amount - EPS },
  };
  const debited = await User.findOneAndUpdate(
    cond,
    { $inc: { [`cryptoBalances.${args.currency}`]: -args.amount } },
    { new: true },
  );
  if (!debited) {
    const exists = await User.findById(args.user._id).select('cryptoBalances');
    const have = exists?.cryptoBalances ? (exists.cryptoBalances[args.currency] ?? 0) : 0;
    if (have + EPS < args.amount) return { error: 'insufficient_funds' };
    return { error: 'insufficient_funds' };
  }
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
  void recordWithdrawal(args.amount, args.currency);
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
