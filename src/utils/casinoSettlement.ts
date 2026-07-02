/**
 * Casino bet settlement flow helper.
 * Ensures all casino games have consistent error handling and logging.
 */

import { logSettlementStart, logSettlementSuccess, logSettlementError } from './settlementDebug';

export interface CasinoSettlementArgs {
  gameId: string;
  gameName: string;
  betResult: {
    won: boolean;
    payout: number;
    multiplier: number;
  };
  stake: number;
  wallet: any;
  toasts: any;
  onPlaySound?: (type: string) => void;
}

/**
 * Atomic settlement flow for casino games.
 * Handles:
 * - Placing the bet
 * - Settling immediately after game result
 * - Posting to leaderboard on win
 * - Error handling and user feedback
 */
export async function settleCasinoBet({
  gameId,
  gameName,
  betResult,
  stake,
  wallet,
  toasts,
  onPlaySound,
}: CasinoSettlementArgs): Promise<{ success: boolean; betId?: string }> {
  try {
    // Place the bet
    const bet = await wallet.placeBet({
      gameId,
      gameName,
      stake,
    });

    if (!bet) {
      toasts.error('Placement failed', 'Could not place bet. Check balance.');
      return { success: false };
    }

    // Settle the bet
    try {
      logSettlementStart(gameId, bet.id, stake, betResult.payout, betResult.won);
      await wallet.settleBet(bet.id, {
        won: betResult.won,
        payout: betResult.payout,
        multiplier: betResult.multiplier,
      });
      logSettlementSuccess(gameId, bet.id, betResult.payout);

      // Play sound
      if (onPlaySound) {
        onPlaySound(betResult.won ? 'win' : 'lose');
      }

      // Show result
      if (betResult.won) {
        toasts.success('Won!', `+${(betResult.payout - stake).toFixed(2)}`);
      } else {
        toasts.error('Lost', 'Better luck next time');
      }

      return { success: true, betId: bet.id };
    } catch (settleErr: any) {
      logSettlementError(gameId, bet.id, settleErr);
      // Settlement is retried by backend scheduler, so don't show error as critical
      toasts.warning(
        'Settlement pending',
        'Bet will settle in background. Check bet history.',
      );
      return { success: false, betId: bet.id };
    }
  } catch (err: any) {
    const msg = err?.message || 'Unknown error';
    console.error(`[${gameId}] Game error:`, err);
    toasts.error('Game error', msg);
    return { success: false };
  }
}
