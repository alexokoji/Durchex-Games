/**
 * Dice Duel: Roll dice and beat the house.
 *
 * Modes:
 * - 1 die (50% win)   → 1.98x
 * - 2 dice (42% win)  → 2.38x
 * - 3 dice (33% win)  → 3x
 */

import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';

type DiceMode = 1 | 2 | 3;

export class DiceDuelGame implements GamePlugin {
  id = 'diceduel';
  name = 'Dice Duel';
  category = 'arcade' as const;

  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;

    // For MVP: random mode
    const mode: DiceMode = ([1, 2, 3] as DiceMode[])[Math.floor(Math.random() * 3)];

    // Roll house and player dice
    const playerRoll = this.rollDice(mode);
    const houseRoll = this.rollDice(mode);

    const won = playerRoll > houseRoll;
    const odds: Record<DiceMode, number> = { 1: 1.98, 2: 2.38, 3: 3 };
    const multiplier = won ? odds[mode] : 0;
    const payout = stake * multiplier;

    return {
      won,
      multiplier,
      payout,
      message: won
        ? `🎲 ${playerRoll} beats ${houseRoll}! You won ${multiplier.toFixed(2)}x!`
        : `${playerRoll} vs ${houseRoll} — House wins. Better luck next time!`,
      details: {
        mode,
        playerRoll,
        houseRoll,
      },
    };
  }

  private rollDice(numDice: DiceMode): number {
    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * 6) + 1;
    }
    return total;
  }

  validateBet(stake: number): boolean {
    return stake > 0 && stake <= 10000;
  }
}
