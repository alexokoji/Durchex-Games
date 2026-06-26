/**
 * Limbo: Choose a multiplier, win if random result ≥ your choice.
 *
 * Lower targets win more often but pay less.
 * Example: Pick 2x → 50% win rate
 *          Pick 10x → rare, high risk
 */

import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';

const MIN_MULTIPLIER = 1.01;
const MAX_MULTIPLIER = 1000;

export class LimboGame implements GamePlugin {
  id = 'limbo';
  name = 'Limbo';
  category = 'multiplier' as const;

  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;

    // For MVP: random target (later player chooses)
    const targetMultiplier = MIN_MULTIPLIER + Math.random() * (MAX_MULTIPLIER - MIN_MULTIPLIER);

    // Generate result: exponential distribution (favors low values)
    const resultMultiplier = Math.pow(Math.random(), -1 / 3); // Heavy bias to low numbers
    const clamped = Math.min(resultMultiplier * 100, MAX_MULTIPLIER);

    const won = clamped >= targetMultiplier;
    const multiplier = won ? targetMultiplier : 0;
    const payout = stake * multiplier;

    return {
      won,
      multiplier,
      payout,
      message: won
        ? `🎯 Limbo at ${targetMultiplier.toFixed(2)}x — you won!`
        : `💔 ${clamped.toFixed(2)}x was too low. Better luck next!`,
      details: {
        targetMultiplier: parseFloat(targetMultiplier.toFixed(2)),
        resultMultiplier: parseFloat(clamped.toFixed(2)),
      },
    };
  }

  validateBet(stake: number): boolean {
    return stake > 0 && stake <= 10000;
  }
}
