import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { notifyUser, notifyWalletUpdate } from '../sockets/notifier';

/**
 * Expire bonus funds whose rollover wasn't cleared in time. Zeroes the bonus
 * pot + outstanding rollover, records an adjustment, and notifies the user.
 * Real (withdrawable) balance is never touched.
 */
export async function expireBonuses(): Promise<{ expired: number }> {
  const now = new Date();
  const users = await User.find({ bonusExpiresAt: { $lte: now }, bonusBalance: { $gt: 0 } })
    .select('bonusBalance bonusRollover currency').limit(500);

  let expired = 0;
  for (const u of users) {
    const lost = u.bonusBalance ?? 0;
    u.bonusBalance = 0;
    u.bonusRollover = 0;
    u.bonusExpiresAt = undefined;
    u.bonusMaxWithdrawUsd = undefined;
    await u.save();

    await Transaction.create({
      userId: u._id, kind: 'adjustment', status: 'completed', method: 'internal',
      amount: -lost, currency: u.currency, reference: `bonus-expiry-${u._id}-${Date.now()}`,
      notes: 'bonus expired', completedAt: new Date(),
    });
    notifyWalletUpdate(u._id.toString(), 'bonus_expired');
    notifyUser(u._id.toString(), {
      kind: 'system',
      title: 'Bonus expired',
      body: `Your unused bonus of ${lost.toFixed(2)} ${u.currency} has expired.`,
    });
    expired++;
  }
  return { expired };
}

let started = false;
export function startBonusExpiryScheduler(): void {
  if (started) return;
  started = true;
  const everyMs = 60 * 60 * 1000; // hourly
  setTimeout(() => { void expireBonuses().catch(() => {}); }, 45_000);
  setInterval(() => { void expireBonuses().catch(() => {}); }, everyMs);
  console.log('[bonus] expiry scheduler started · hourly');
}
