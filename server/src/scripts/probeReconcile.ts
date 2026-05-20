/**
 * One-shot diagnostic script:
 *
 *   tsx src/scripts/probeReconcile.ts
 *
 * Walks every pending deposit in Mongo and reports what reconcileTransaction
 * WOULD do. Does not actually credit. Use this to validate that the new
 * `verify_by_reference` fallback resolves the historical stuck deposits
 * before letting the admin sweep them.
 *
 * After deploying, an admin can rerun via the UI's "Reconcile all pending"
 * button to actually credit the eligible rows.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction';
import { verifyTransaction, verifyByReference } from '../services/flutterwave';
import { env } from '../config/env';

async function main() {
  if (!env.flutterwave.enabled) {
    console.error('Flutterwave not configured — set FLUTTERWAVE_SECRET_KEY + FLUTTERWAVE_PUBLIC_KEY first.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI!, { serverSelectionTimeoutMS: 10_000 });
  console.log('Mongo connected.');

  const rows = await Transaction.find({ kind: 'deposit', status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  console.log(`Found ${rows.length} pending deposits.\n`);

  const summary = {
    scanned: rows.length,
    wouldCredit: 0,
    wouldSkipNotSuccessful: 0,
    wouldSkipCurrencyMismatch: 0,
    wouldSkipAmountMismatch: 0,
    wouldSkipNotFiat: 0,
    verifyFailed: 0,
  };

  for (const tx of rows) {
    const ageMin = Math.round((Date.now() - new Date(tx.createdAt).getTime()) / 60_000);
    let verified: any = null;
    let probeMode = '';
    try {
      if (tx.flwTxId) {
        probeMode = 'by_id';
        verified = await verifyTransaction(tx.flwTxId);
      } else {
        probeMode = 'by_ref';
        verified = await verifyByReference(tx.reference);
      }
    } catch (err) {
      summary.verifyFailed++;
      console.log(`[verify-fail] ref=${tx.reference} ${tx.amount} ${tx.currency} age=${ageMin}m mode=${probeMode} err=${(err as Error).message}`);
      continue;
    }
    const fwStatus = String(verified?.status ?? 'unknown');
    const fwAmount = Number(verified?.amount ?? 0);
    const fwCurrency = String(verified?.currency ?? '').toUpperCase();
    const fwId = verified?.id;
    if (fwStatus !== 'successful') {
      summary.wouldSkipNotSuccessful++;
      console.log(`[skip:status]    ref=${tx.reference} ${tx.amount} ${tx.currency} age=${ageMin}m fw=${fwStatus}`);
      continue;
    }
    if (fwCurrency !== tx.currency) {
      summary.wouldSkipCurrencyMismatch++;
      console.log(`[skip:currency]  ref=${tx.reference} expected=${tx.currency} got=${fwCurrency}`);
      continue;
    }
    if (Math.abs(fwAmount - tx.amount) / Math.max(1, tx.amount) > 0.01) {
      summary.wouldSkipAmountMismatch++;
      console.log(`[skip:amount]    ref=${tx.reference} expected=${tx.amount} got=${fwAmount}`);
      continue;
    }
    summary.wouldCredit++;
    console.log(`[would-credit]   ref=${tx.reference} ${tx.amount} ${tx.currency} age=${ageMin}m fwId=${fwId} user=${tx.userId}`);
  }

  console.log('\nSummary:', summary);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
