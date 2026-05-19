import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { verifyTransaction } from './flutterwave';
import { creditFiatDeposit } from './wallet';
import { redeemPromo } from './promo';
import { notifyUser, notifyWalletUpdate } from '../sockets/notifier';
import { isFiat } from '../config/currencies';

export type ReconcileOutcome =
  | { ok: true;  status: 'credited' }
  | { ok: true;  status: 'already_credited' }
  | { ok: false; status: 'not_found' }
  | { ok: false; status: 'user_not_found' }
  | { ok: false; status: 'not_successful'; flwStatus?: string }
  | { ok: false; status: 'currency_mismatch'; expected: string; got: string }
  | { ok: false; status: 'amount_mismatch'; expected: number; got: number }
  | { ok: false; status: 'not_fiat' }
  | { ok: false; status: 'verify_failed'; message: string };

export interface ReconcileInput {
  /** Our internal reference (tx_ref). Either this or `flwTxId` is required. */
  txRef?: string;
  /** Flutterwave's numeric transaction id. */
  flwTxId?: string | number;
  /**
   * If true, skip Flutterwave verification and trust the local transaction
   * as-is. Use for hand-credit cases where you have proof of payment but
   * Flutterwave's API is unavailable. Off by default.
   */
  trustLocal?: boolean;
}

/**
 * Verify a Flutterwave transaction and credit the user's wallet if it's
 * legitimately successful and not already credited. Idempotent: safe to call
 * multiple times — subsequent calls return `already_credited`.
 *
 * Used by both the live webhook and the admin reconcile tooling so deposits
 * that missed the webhook (server downtime, signature failure, bad redirect
 * URL, etc.) can be recovered without double-crediting.
 */
export async function reconcileTransaction(input: ReconcileInput): Promise<ReconcileOutcome> {
  // ─── 1. Find the local transaction ────────────────────────────────────
  // We search by tx_ref first (the canonical lookup), then by flwTxId. The
  // webhook stores flwTxId on the transaction after the first successful
  // verification so subsequent webhook deliveries can still find it.
  const filter: Record<string, unknown> = {};
  if (input.txRef)   filter.reference = input.txRef;
  if (input.flwTxId) filter.flwTxId   = String(input.flwTxId);
  if (Object.keys(filter).length === 0) {
    return { ok: false, status: 'not_found' };
  }
  const tx = await Transaction.findOne({
    $or: [
      ...(input.txRef   ? [{ reference: input.txRef }] : []),
      ...(input.flwTxId ? [{ flwTxId: String(input.flwTxId) }] : []),
    ],
  });
  if (!tx) return { ok: false, status: 'not_found' };

  // Already-credited deposits are a happy no-op for callers — re-running the
  // reconcile tool over a stable list shouldn't double-credit.
  if (tx.status === 'completed') {
    return { ok: true, status: 'already_credited' };
  }

  if (!isFiat(tx.currency)) return { ok: false, status: 'not_fiat' };

  const user = await User.findById(tx.userId);
  if (!user) return { ok: false, status: 'user_not_found' };

  // ─── 2. Verify against Flutterwave (unless explicitly trusting local) ─
  let fwStatus: string | undefined;
  let fwAmount: number = tx.amount;
  let fwCurrency: string = tx.currency;
  let flwTxId: string | number | undefined = input.flwTxId ?? tx.flwTxId;

  if (!input.trustLocal) {
    if (!flwTxId) {
      return { ok: false, status: 'verify_failed', message: 'no_flw_tx_id_available' };
    }
    try {
      const verified = await verifyTransaction(flwTxId);
      fwStatus = verified?.status;
      fwAmount = Number(verified?.amount ?? tx.amount);
      fwCurrency = String(verified?.currency ?? tx.currency).toUpperCase();
      flwTxId = verified?.id ?? flwTxId;
    } catch (err) {
      return { ok: false, status: 'verify_failed', message: (err as Error).message ?? 'unknown' };
    }
    if (fwStatus !== 'successful') {
      return { ok: false, status: 'not_successful', flwStatus: fwStatus };
    }
    if (fwCurrency !== tx.currency) {
      return { ok: false, status: 'currency_mismatch', expected: tx.currency, got: fwCurrency };
    }
    if (Math.abs(fwAmount - tx.amount) / Math.max(1, tx.amount) > 0.01) {
      return { ok: false, status: 'amount_mismatch', expected: tx.amount, got: fwAmount };
    }
  }

  // ─── 3. Credit + mark completed ───────────────────────────────────────
  await creditFiatDeposit({
    user,
    amount: tx.amount,
    currency: tx.currency,
    method: tx.method,
    // Suffix `:reconciled` so the recovery credit is distinguishable from a
    // normal webhook credit when scanning the transactions log.
    reference: tx.reference + (input.trustLocal ? ':manual' : ':reconciled'),
    flwTxId: flwTxId ? String(flwTxId) : undefined,
    flwTxRef: tx.reference,
    notes: input.trustLocal
      ? 'Manually credited by admin (Flutterwave verification skipped)'
      : 'Recovered via admin reconcile',
  });
  tx.status = 'completed';
  if (flwTxId) tx.flwTxId = String(flwTxId);
  tx.completedAt = new Date();
  if (input.trustLocal) tx.notes = (tx.notes ? tx.notes + ' · ' : '') + 'manually credited';
  await tx.save();

  // Drain any pending deposit-match promo (same logic as the webhook).
  if (user.pendingDepositPromo) {
    const promoCode = user.pendingDepositPromo;
    try {
      await redeemPromo({
        user, code: promoCode, trigger: 'deposit',
        depositAmount: tx.amount, depositReference: tx.reference,
      });
    } catch (err) { console.error('[reconcile] promo redeem failed', err); }
    await User.updateOne({ _id: user._id }, { pendingDepositPromo: null });
  }

  // Live-notify the player.
  const uid = user._id.toString();
  notifyWalletUpdate(uid, 'deposit_completed');
  notifyUser(uid, {
    kind: 'deposit:completed',
    title: 'Deposit received',
    body: `+${tx.amount} ${tx.currency}`,
    data: { reference: tx.reference, amount: tx.amount, currency: tx.currency },
  });

  return { ok: true, status: 'credited' };
}
