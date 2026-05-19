import { HouseLedger, ledgerKeyFor } from '../models/HouseLedger';
import { FIAT, CRYPTO_USD, isFiat, isCrypto, type AnyCurrency } from '../config/currencies';

/**
 * Convert any supported currency amount to USD-equivalent using the static
 * reference rates in config/currencies. Negative amounts (deposits coming
 * back to us) and crypto are both handled.
 */
export function toUsd(amount: number, currency: AnyCurrency): number {
  if (!Number.isFinite(amount)) return 0;
  if (currency === 'USD') return amount;
  if (isFiat(currency)) return amount * FIAT[currency].usdPerUnit;
  if (isCrypto(currency)) return amount * CRYPTO_USD[currency];
  return amount;
}

interface BetSettlementDelta {
  stake: number;
  payout: number;
  currency: AnyCurrency;
}

/**
 * Increment today's ledger row with a single bet's contribution to house P/L.
 * Called from `settleBetAtomic` after the wallet has been credited. Errors
 * are swallowed so a ledger blip never blocks settlement.
 */
export async function recordBetSettlement(delta: BetSettlementDelta): Promise<void> {
  try {
    const stakeUsd  = toUsd(delta.stake,  delta.currency);
    const payoutUsd = toUsd(delta.payout, delta.currency);
    const profitUsd = stakeUsd - payoutUsd;
    await HouseLedger.findByIdAndUpdate(
      ledgerKeyFor(),
      {
        $setOnInsert: { _id: ledgerKeyFor() },
        $inc: {
          betsCount: 1,
          totalStakeUsd:  stakeUsd,
          totalPayoutUsd: payoutUsd,
          houseProfitUsd: profitUsd,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    console.error('[ledger] recordBetSettlement failed', err);
  }
}

export async function recordDeposit(amount: number, currency: AnyCurrency): Promise<void> {
  try {
    await HouseLedger.findByIdAndUpdate(
      ledgerKeyFor(),
      {
        $setOnInsert: { _id: ledgerKeyFor() },
        $inc: { depositVolumeUsd: toUsd(amount, currency) },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    console.error('[ledger] recordDeposit failed', err);
  }
}

export async function recordWithdrawal(amount: number, currency: AnyCurrency): Promise<void> {
  try {
    await HouseLedger.findByIdAndUpdate(
      ledgerKeyFor(),
      {
        $setOnInsert: { _id: ledgerKeyFor() },
        $inc: { withdrawVolumeUsd: toUsd(Math.abs(amount), currency) },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    console.error('[ledger] recordWithdrawal failed', err);
  }
}

export async function recordBonus(amount: number, currency: AnyCurrency): Promise<void> {
  try {
    await HouseLedger.findByIdAndUpdate(
      ledgerKeyFor(),
      {
        $setOnInsert: { _id: ledgerKeyFor() },
        $inc: { bonusCreditedUsd: toUsd(amount, currency) },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    console.error('[ledger] recordBonus failed', err);
  }
}

/**
 * Compute aggregate stats over a window of days. Used by both the admin
 * dashboard and the daily summary email.
 */
export async function aggregateRange(fromKey: string, toKey: string): Promise<{
  betsCount: number;
  totalStakeUsd: number;
  totalPayoutUsd: number;
  houseProfitUsd: number;
  depositVolumeUsd: number;
  withdrawVolumeUsd: number;
  bonusCreditedUsd: number;
  days: number;
}> {
  const rows = await HouseLedger.find({ _id: { $gte: fromKey, $lte: toKey } }).lean();
  const out = {
    betsCount: 0, totalStakeUsd: 0, totalPayoutUsd: 0, houseProfitUsd: 0,
    depositVolumeUsd: 0, withdrawVolumeUsd: 0, bonusCreditedUsd: 0,
    days: rows.length,
  };
  for (const r of rows) {
    out.betsCount         += r.betsCount         || 0;
    out.totalStakeUsd     += r.totalStakeUsd     || 0;
    out.totalPayoutUsd    += r.totalPayoutUsd    || 0;
    out.houseProfitUsd    += r.houseProfitUsd    || 0;
    out.depositVolumeUsd  += r.depositVolumeUsd  || 0;
    out.withdrawVolumeUsd += r.withdrawVolumeUsd || 0;
    out.bonusCreditedUsd  += r.bonusCreditedUsd  || 0;
  }
  return out;
}
