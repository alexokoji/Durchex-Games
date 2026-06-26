/**
 * Keno: Pick 10 numbers (1–80), 20 drawn. Win based on matches.
 *
 * Payouts by matches:
 * 0-3: lose
 * 4: 1.5x
 * 5: 2x
 * 6: 3x
 * 7: 5x
 * 8: 10x
 * 9: 50x
 * 10: 500x
 */

import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';

const PAYOUTS: Record<number, number> = {
  0: 0, 1: 0, 2: 0, 3: 0,
  4: 1.5, 5: 2, 6: 3, 7: 5, 8: 10, 9: 50, 10: 500,
};

export class KenoGame implements GamePlugin {
  id = 'keno';
  name = 'Keno';
  category = 'arcade' as const;

  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;

    // MVP: auto-pick 10 random numbers
    const picked = this.generateRandomNumbers(10, 1, 80);
    const drawn = this.generateRandomNumbers(20, 1, 80);

    // Count matches
    const matches = picked.filter(n => drawn.includes(n)).length;

    const multiplier = PAYOUTS[matches] || 0;
    const payout = stake * multiplier;
    const won = multiplier > 0;

    return {
      won,
      multiplier,
      payout,
      message: won
        ? `🎯 ${matches}/10 matches! ${multiplier}x win!`
        : `❌ Only ${matches}/10 matches. Need 4+ to win.`,
      details: {
        pickedCount: 10,
        matches,
        drawnCount: 20,
      },
    };
  }

  private generateRandomNumbers(count: number, min: number, max: number): number[] {
    const nums = new Set<number>();
    while (nums.size < count) {
      nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return Array.from(nums).sort((a, b) => a - b);
  }

  validateBet(stake: number): boolean {
    return stake > 0 && stake <= 10000;
  }
}
