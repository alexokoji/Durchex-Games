/**
 * Treasure Hunt: 5x5 grid with treasures and bombs.
 * Player clicks squares: safe = +multiplier, bomb = lose.
 *
 * 12 treasures, 13 bombs (25 total).
 * Multiplier increases per safe click: 1.2x, 1.5x, 2x, 3x, 4x, 5x...
 */

import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';

export class TreasureHuntGame implements GamePlugin {
  id = 'treasurehunt';
  name = 'Treasure Hunt';
  category = 'grid' as const;

  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;

    // MVP: auto-play 5 squares
    const grid = this.generateGrid();
    let multiplier = 1;
    let safeClicks = 0;

    for (let i = 0; i < 5; i++) {
      const square = grid[i];
      if (square === 'bomb') {
        // Hit bomb
        return {
          won: false,
          multiplier: 0,
          payout: 0,
          message: `💣 Hit a bomb after ${safeClicks} safe clicks! Better luck next time.`,
          details: { safeClicks },
        };
      }
      safeClicks++;
      multiplier = 1 + safeClicks * 0.3; // 1.3x, 1.6x, 1.9x, 2.2x, 2.5x
    }

    const payout = stake * multiplier;

    return {
      won: true,
      multiplier,
      payout,
      message: `🎁 ${safeClicks} treasures found! ${multiplier.toFixed(2)}x win!`,
      details: { safeClicks },
    };
  }

  private generateGrid(): string[] {
    const grid = new Array(25).fill('treasure');
    // Place 13 bombs randomly
    for (let i = 0; i < 13; i++) {
      let idx: number;
      do {
        idx = Math.floor(Math.random() * 25);
      } while (grid[idx] === 'bomb');
      grid[idx] = 'bomb';
    }
    return grid;
  }

  validateBet(stake: number): boolean {
    return stake > 0 && stake <= 10000;
  }
}
