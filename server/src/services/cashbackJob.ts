import { User } from '../models/User';
import { Bet } from '../models/Bet';
import { PromoCode } from '../models/PromoCode';
import { JobState } from '../models/JobState';
import { redeemPromo } from './promo';
import type { FiatCurrency } from '../config/currencies';
import { isFiat } from '../config/currencies';

const JOB_ID = 'cashback_weekly';
/** Default cashback campaign code. Created by admin via /api/admin/promo-codes. */
const CASHBACK_CODE = (process.env.CASHBACK_CODE ?? 'WEEKLY_CASHBACK').toUpperCase();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TICK_MS = 60 * 60 * 1000;            // re-evaluate every hour

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Returns the set of (userId, netLoss, currency) tuples for users who lost
 * net over the last `windowDays` window. We aggregate by user+currency, then
 * filter to user-currency matches (since promo redemption only credits the
 * user's primary fiat).
 */
async function findEligibleUsers(windowDays: number) {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  type Row = { _id: { userId: string; currency: string }; loss: number };
  const rows = await Bet.aggregate<Row>([
    { $match: {
        settledAt: { $gte: since },
        status: { $in: ['won', 'lost'] },
    } },
    { $group: {
        _id: { userId: '$userId', currency: '$currency' },
        loss: { $sum: { $subtract: ['$stake', '$payout'] } },
    } },
    { $match: { loss: { $gt: 0 } } },
    { $sort: { loss: -1 } },
    { $limit: 5000 }, // soft cap to prevent runaway in case of a bad data shape
  ]);

  // Filter to FIAT currencies only and dedupe to a single best-loss row per user.
  const best = new Map<string, { netLoss: number; currency: FiatCurrency }>();
  for (const r of rows) {
    if (!isFiat(r._id.currency)) continue;
    const uid = String(r._id.userId);
    const prev = best.get(uid);
    if (!prev || prev.netLoss < r.loss) {
      best.set(uid, { netLoss: r.loss, currency: r._id.currency as FiatCurrency });
    }
  }
  return best;
}

/**
 * One-shot run of the weekly cashback job. Idempotent within a 7-day window
 * via the JobState lastRunAt check, and per-user via PromoCode.perUserLimit.
 */
export async function runCashbackOnce(opts: { force?: boolean } = {}): Promise<{
  ran: boolean;
  credited: number;
  skipped: number;
  reason?: string;
}> {
  // Check the lock — don't double-fire if a previous tick is still working.
  if (running) return { ran: false, credited: 0, skipped: 0, reason: 'already_running' };
  running = true;
  try {
    const state = await JobState.findById(JOB_ID);
    const now = new Date();
    if (!opts.force && state && state.lastRunAt && now.getTime() - state.lastRunAt.getTime() < WEEK_MS) {
      return { ran: false, credited: 0, skipped: 0, reason: 'too_soon' };
    }

    const promo = await PromoCode.findOne({ code: CASHBACK_CODE, kind: 'cashback', active: true });
    if (!promo) {
      console.warn(`[cashback] code ${CASHBACK_CODE} not found or inactive — skipping run`);
      await JobState.findByIdAndUpdate(
        JOB_ID,
        { _id: JOB_ID, lastRunAt: now, lastRunCount: 0, lastRunError: 'code_missing', updatedAt: now },
        { upsert: true, setDefaultsOnInsert: true },
      );
      return { ran: false, credited: 0, skipped: 0, reason: 'code_missing' };
    }

    const eligible = await findEligibleUsers(7);
    let credited = 0;
    let skipped  = 0;
    for (const [userId, info] of eligible) {
      const user = await User.findById(userId);
      if (!user) { skipped++; continue; }
      // Skip if user's currency differs from their best-loss currency window.
      if (user.currency !== info.currency) { skipped++; continue; }

      const r = await redeemPromo({
        user, code: CASHBACK_CODE,
        trigger: 'cashback',
        cashbackLossAmount: info.netLoss,
      });
      if ('ok' in r) credited++;
      else skipped++;
    }

    await JobState.findByIdAndUpdate(
      JOB_ID,
      { _id: JOB_ID, lastRunAt: now, lastRunCount: credited, lastRunError: undefined, updatedAt: now },
      { upsert: true, setDefaultsOnInsert: true },
    );

    console.log(`[cashback] run complete — credited=${credited} skipped=${skipped}`);
    return { ran: true, credited, skipped };
  } catch (err) {
    console.error('[cashback] run failed', err);
    await JobState.findByIdAndUpdate(
      JOB_ID,
      { _id: JOB_ID, lastRunAt: new Date(), lastRunError: (err as Error).message ?? 'unknown', updatedAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true },
    );
    return { ran: false, credited: 0, skipped: 0, reason: 'error' };
  } finally {
    running = false;
  }
}

/** Schedules an hourly tick that runs the job whenever it's been ≥ 7d. */
export function startCashbackScheduler(): void {
  if (timer) return;
  // Defer first tick a few seconds so it doesn't fight server startup work.
  const FIRST_TICK = 30_000;
  setTimeout(() => { void runCashbackOnce(); }, FIRST_TICK);
  timer = setInterval(() => { void runCashbackOnce(); }, TICK_MS);
  timer.unref?.();
}

export function stopCashbackScheduler(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
