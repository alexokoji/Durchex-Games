/**
 * Hourly auto-settle: runs every hour to settle all pending bets whose games
 * have finished. This is the "always settle" safety net — catches any bets that
 * slipped through the client-side auto-settler or were placed by users who
 * never returned online.
 *
 * Every pending/live bet is checked:
 * - Virtual sports: if slot is finished, derive & settle with correct outcome
 * - Unrecognizable: void as loss (prevent forever-pending)
 * - Any failure: log it but don't crash the job
 */

import { Bet } from '../models/Bet';
import { settleBetAtomic } from './wallet';
import { notifyWalletUpdate } from '../sockets/notifier';

// Import slot utilities from client code
function getSlotUtils() {
  const {
    slotFinished,
    parseMatchId,
  } = require('../../../src/virtual-sports/core/seasonClock') as {
    slotFinished: (slot: number, now?: number) => boolean;
    parseMatchId: (id: string) => any;
  };
  return { slotFinished, parseMatchId };
}

interface SettleResult {
  settled: number;
  voided: number;
  failed: number;
  total: number;
}

export async function runAutoSettleOnce(): Promise<SettleResult> {
  const now = Date.now();
  const pending = await Bet.find({ status: { $in: ['pending', 'live'] } }).lean();

  if (pending.length === 0) {
    return { settled: 0, voided: 0, failed: 0, total: 0 };
  }

  const { slotFinished, parseMatchId } = getSlotUtils();
  let settled = 0;
  let voided = 0;
  let failed = 0;

  console.log(`[autoSettle] Processing ${pending.length} pending bets`);

  for (const bet of pending) {
    const gameId = bet.gameId as string;
    const parsed = parseMatchId(gameId);
    let won = false;
    let payout = 0;
    let reason = 'Auto-settled (unknown game)';

    if (parsed && parsed.slot != null) {
      // Virtual sports — check if slot is finished
      if (slotFinished(parsed.slot, now)) {
        // Slot finished — derive outcome from selections
        const selections = (bet.selections as any[]) ?? [];
        const allLost = selections.every((s: any) => s.result === 'loss');
        payout = allLost ? 0 : (bet.payout ?? 0);
        won = payout > bet.stake;
        reason = 'Auto-settled (game finished)';
      } else {
        // Slot not finished yet — void as loss
        payout = 0;
        won = false;
        reason = 'Auto-voided (game not yet finished)';
      }
    } else {
      // Can't parse — void to loss
      payout = 0;
      won = false;
      reason = `Auto-voided (unrecognizable game: ${gameId})`;
    }

    const result = await settleBetAtomic({
      userId: bet.userId.toString(),
      betId: bet._id.toString(),
      won,
      payout,
      details: reason,
    }).catch((e: any) => {
      console.error('[autoSettle] Error settling bet:', { betId: bet._id, error: e.message });
      return { error: 'settle_failed' };
    });

    if ('error' in result) {
      failed++;
    } else {
      settled++;
      notifyWalletUpdate(bet.userId.toString(), 'bet_settled');
    }

    if (reason.includes('voided')) voided++;
  }

  console.log(`[autoSettle] Complete: ${settled} settled, ${voided} voided, ${failed} failed (${pending.length} total)`);
  return { settled, voided, failed, total: pending.length };
}

export function startAutoSettleScheduler(): void {
  // Run immediately on startup
  runAutoSettleOnce().catch(e => console.error('[autoSettle] Startup run failed:', e.message));

  // Then run every hour (3600000 ms)
  const intervalMs = 60 * 60 * 1000;
  const handle = setInterval(() => {
    runAutoSettleOnce().catch(e => console.error('[autoSettle] Scheduled run failed:', e.message));
  }, intervalMs);

  console.log(`[autoSettle] Scheduler started (runs every ${intervalMs / 1000 / 60} min)`);
}
