/**
 * Coin Flip: Predict Heads or Tails.
 *
 * Note: This game logic is simple (pure random). The 3D animation is handled
 * by the React component (CoinFlipGame.tsx) using CSS transforms.
 *
 * 3D Coin Animation:
 * - Realistic physics flip with slow-motion landing
 * - Rotates on Y-axis during flip
 * - Settles to Heads or Tails face
 *
 * Game Variations (for future):
 * - Double-or-nothing mode
 * - Best-of-3 / Best-of-5
 */

import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';

const COIN_FACES = ['heads', 'tails'] as const;
type CoinFace = typeof COIN_FACES[number];

interface CoinFlipState {
  userPrediction: CoinFace;
  result: CoinFace;
  flipDuration: number; // ms
  totalSpins: number; // full rotations during flip
  correct: boolean;
}

export class CoinFlipGame implements GamePlugin {
  id = 'coinflip';
  name = 'Coin Flip';
  category = 'arcade' as const;

  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;

    // Determine user prediction (MVP: random, later from player input)
    const userPrediction: CoinFace = Math.random() > 0.5 ? 'heads' : 'tails';

    // Determine actual result (random)
    const resultIdx = Math.floor(Math.random() * 2);
    const result: CoinFace = COIN_FACES[resultIdx];

    const correct = userPrediction === result;
    const multiplier = correct ? 2 : 0;
    const payout = stake * multiplier;

    // Flip parameters for animation
    const state: CoinFlipState = {
      userPrediction,
      result,
      flipDuration: 2000, // 2 second flip
      totalSpins: 8 + Math.floor(Math.random() * 4), // 8-11 rotations
      correct,
    };

    return {
      won: correct,
      multiplier,
      payout,
      message: correct
        ? `🪙 ${result.toUpperCase()}! You won ${multiplier}x!`
        : `😞 It landed on ${result}. Try again!`,
      details: {
        userPrediction,
        result,
        flipDuration: state.flipDuration,
        totalSpins: state.totalSpins,
        correct: state.correct,
      },
    };
  }

  validateBet(stake: number): boolean {
    // Coin flip: simple validation, min/max checks only
    return stake > 0 && stake <= 10000;
  }
}

