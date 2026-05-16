import { Router, type Request, type Response, raw } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { env } from '../config/env';
import {
  initPayment, verifyTransaction, initTransfer,
  isWebhookSignatureValid,
  ALL_PAYMENT_OPTIONS, type FlwPaymentOption,
} from '../services/flutterwave';
import {
  creditFiatDeposit, debitFiatWithdrawal, debitCryptoWithdrawal, newReference,
} from '../services/wallet';
import { isCrypto, isFiat, FIAT, type CryptoCurrency } from '../config/currencies';
import { notifyUser, notifyWalletUpdate } from '../sockets/notifier';

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errs = validationResult(req);
  if (errs.isEmpty()) return true;
  res.status(400).json({ error: 'validation_error', details: errs.array() });
  return false;
}

function inferMethod(options?: FlwPaymentOption[]): 'card' | 'bank' | 'mobilemoney' | 'ussd' | 'crypto' | 'internal' {
  if (!options || options.length === 0) return 'card';
  const first = options[0];
  if (first === 'crypto') return 'crypto';
  if (first === 'ussd') return 'ussd';
  if (first === 'banktransfer' || first === 'account') return 'bank';
  if (first.startsWith('mobilemoney') || first === 'mpesa') return 'mobilemoney';
  return 'card';
}

// ─── fiat deposit init (Flutterwave Standard checkout) ───────────────────
router.post(
  '/deposit/init',
  requireAuth,
  body('amount').isFloat({ gt: 0 }),
  body('paymentOptions').optional().isArray(),
  body('phone').optional().isString().isLength({ max: 32 }),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    if (!env.flutterwave.enabled) { res.status(503).json({ error: 'flutterwave_not_configured' }); return; }
    const user = req.user!;
    const { amount, paymentOptions, phone } = req.body as {
      amount: number; paymentOptions?: FlwPaymentOption[]; phone?: string;
    };

    if (!isFiat(user.currency) || !FIAT[user.currency].flutterwaveSupported) {
      res.status(400).json({ error: 'currency_not_supported_by_flutterwave', currency: user.currency });
      return;
    }

    const reference = newReference('dep');
    await Transaction.create({
      userId:   user._id,
      kind:     'deposit',
      status:   'pending',
      method:   inferMethod(paymentOptions),
      amount,
      currency: user.currency,
      reference,
    });

    const payment = await initPayment({
      txRef: reference,
      amount,
      currency: user.currency,
      customerEmail: user.email,
      customerName:  user.username,
      customerPhone: phone,
      // Crypto is included by default — Flutterwave handles the conversion
      // and pays us in the user's local fiat currency.
      paymentOptions: paymentOptions ?? ALL_PAYMENT_OPTIONS,
      meta: { userId: user._id.toString(), currency: user.currency },
    });

    res.json({ paymentLink: payment.paymentLink, reference });
  },
);

// NOTE: Crypto deposits flow through the regular /deposit/init endpoint with
// `paymentOptions: ['crypto']`. Flutterwave's hosted checkout handles the
// crypto → fiat conversion and pays us in the user's local currency, so we
// never need to display a wallet address ourselves.

// ─── deposit webhook (Flutterwave → us) ──────────────────────────────────
router.post('/flutterwave/webhook', raw({ type: '*/*' }), async (req: Request, res: Response) => {
  const sig = req.header('verif-hash');
  if (!isWebhookSignatureValid(sig)) {
    res.status(401).end();
    return;
  }
  let body: any;
  try { body = JSON.parse(req.body.toString('utf8')); }
  catch { res.status(400).end(); return; }

  const event = body?.event as string | undefined;
  const data  = body?.data;
  const txRef = data?.tx_ref ?? data?.reference;
  const flwTxId = data?.id ?? data?.transaction_id;
  if (!txRef) { res.status(200).end(); return; }

  const tx = await Transaction.findOne({ reference: txRef });
  if (!tx) { res.status(200).end(); return; }
  if (tx.status === 'completed') { res.status(200).end(); return; }

  let verified: any = null;
  try { if (flwTxId) verified = await verifyTransaction(flwTxId); }
  catch (err) { console.error('[flw] verify failed', err); }
  const fwStatus = verified?.status ?? data?.status;
  const fwAmount = Number(verified?.amount ?? data?.amount);
  const fwCurrency = String(verified?.currency ?? data?.currency ?? tx.currency).toUpperCase();

  if (event?.startsWith('charge.completed') && fwStatus === 'successful') {
    const user = await User.findById(tx.userId);
    if (user) {
      if (fwCurrency !== tx.currency) {
        tx.status = 'failed';
        tx.notes  = `currency_mismatch fw=${fwCurrency} tx=${tx.currency}`;
        await tx.save();
        res.status(200).end();
        return;
      }
      if (Math.abs(fwAmount - tx.amount) / tx.amount > 0.01) {
        tx.status = 'failed';
        tx.notes  = `amount_mismatch fw=${fwAmount} expected=${tx.amount}`;
        await tx.save();
        res.status(200).end();
        return;
      }
      if (!isFiat(tx.currency)) {
        // Unexpected — we'd never init a Flutterwave checkout for crypto.
        res.status(200).end();
        return;
      }
      await creditFiatDeposit({
        user,
        amount: tx.amount,
        currency: tx.currency,
        method: tx.method,
        reference: tx.reference + ':confirmed',
        flwTxId: String(flwTxId ?? ''),
        flwTxRef: tx.reference,
        notes: 'Flutterwave deposit',
      });
      tx.status = 'completed';
      tx.flwTxId = String(flwTxId ?? '');
      tx.completedAt = new Date();
      await tx.save();

      const uid = user._id.toString();
      notifyWalletUpdate(uid, 'deposit_completed');
      notifyUser(uid, {
        kind: 'deposit:completed',
        title: 'Deposit received',
        body: `+${tx.amount} ${tx.currency}`,
        data: { reference: tx.reference, amount: tx.amount, currency: tx.currency },
      });
    }
  } else if (fwStatus === 'failed' || event?.includes('failed')) {
    tx.status = 'failed';
    await tx.save();
    notifyUser(tx.userId.toString(), {
      kind: 'deposit:failed',
      title: 'Deposit failed',
      body: tx.amount + ' ' + tx.currency,
    });
  }

  res.status(200).end();
});

// ─── withdraw ────────────────────────────────────────────────────────────
router.post(
  '/withdraw',
  requireAuth,
  body('amount').isFloat({ gt: 0 }),
  body('method').isIn(['bank', 'mobilemoney', 'crypto']),
  // fiat fields
  body('accountBank').optional().isString(),
  body('accountNumber').optional().isString(),
  body('beneficiaryName').optional().isString(),
  // crypto fields
  body('cryptoCurrency').optional().isIn(['BTC', 'USDT', 'USDC']),
  body('cryptoNetwork').optional().isString(),
  body('cryptoAddress').optional().isString(),
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    if (!env.flutterwave.enabled) { res.status(503).json({ error: 'flutterwave_not_configured' }); return; }
    const user = req.user!;
    const {
      amount, method, accountBank, accountNumber, beneficiaryName,
      cryptoCurrency, cryptoNetwork, cryptoAddress,
    } = req.body;

    const reference = newReference('wd');

    if (method === 'crypto') {
      if (!cryptoCurrency || !isCrypto(cryptoCurrency)) {
        res.status(400).json({ error: 'invalid_crypto_currency' }); return;
      }
      if (!cryptoAddress?.trim()) {
        res.status(400).json({ error: 'crypto_address_required' }); return;
      }
      const debit = await debitCryptoWithdrawal({
        user,
        amount,
        currency: cryptoCurrency as CryptoCurrency,
        network: cryptoNetwork || cryptoCurrency,
        address: cryptoAddress.trim(),
        reference,
        status: 'pending',
      });
      if ('error' in debit) {
        const code = debit.error === 'rollover_outstanding' ? 423 : 402;
        const payload: Record<string, unknown> = { error: debit.error };
        if ('rollover' in debit && debit.rollover != null) payload.rollover = debit.rollover;
        res.status(code).json(payload);
        return;
      }
      // Crypto withdrawals require manual approval — no Flutterwave call here.
      notifyWalletUpdate(user._id.toString(), 'crypto_withdraw_queued');
      notifyUser(user._id.toString(), {
        kind: 'withdraw:queued',
        title: 'Crypto withdrawal queued',
        body: `${amount} ${cryptoCurrency} — review within 4h`,
      });
      res.status(201).json({ reference, status: 'pending' });
      return;
    }

    // Fiat withdrawal — debit user's fiat balance in their currency.
    const debit = await debitFiatWithdrawal({
      user,
      amount,
      currency: user.currency,
      method,
      reference,
      status: 'pending',
    });
    if ('error' in debit) {
      const code = debit.error === 'rollover_outstanding' ? 423 : 402;
      const payload: Record<string, unknown> = { error: debit.error };
      if ('rollover' in debit && debit.rollover != null) payload.rollover = debit.rollover;
      res.status(code).json(payload);
      return;
    }

    if (method === 'bank' || method === 'mobilemoney') {
      try {
        await initTransfer({
          reference,
          amount,
          currency: user.currency,
          accountBank, accountNumber, beneficiaryName,
          meta: { userId: user._id.toString() },
        });
      } catch (err: any) {
        console.error('[flw] transfer init failed', err?.message ?? err);
        await Transaction.updateOne({ reference }, { status: 'failed', notes: err?.message ?? 'transfer_failed' });
        await User.findByIdAndUpdate(user._id, { $inc: { balance: amount } });
        res.status(502).json({ error: 'transfer_init_failed' });
        return;
      }
    }

    notifyWalletUpdate(user._id.toString(), 'withdraw_queued');
    notifyUser(user._id.toString(), {
      kind: 'withdraw:queued',
      title: 'Withdrawal queued',
      body: `${amount} ${user.currency}`,
    });
    res.status(201).json({ reference, status: 'pending' });
  },
);

export default router;
