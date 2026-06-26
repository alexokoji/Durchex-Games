/**
 * Color Prediction: Pick Red, Green, Blue, or Yellow.
 * Each color has different odds based on probability.
 *
 * Probabilities:
 * Red: 47.5% → 2.1x
 * Blue: 47.5% → 2.1x
 * Green: 3% → 33x
 * Yellow: 2% → 50x
 */

import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';

type ColorChoice = 'red' | 'blue' | 'green' | 'yellow';

const COLORS: ColorChoice[] = ['red', 'blue', 'green', 'yellow'];
const ODDS: Record<ColorChoice, number> = {
  red: 2.1,
  blue: 2.1,
  green: 33,
  yellow: 50,
};

// Weighted by odds (higher odds = lower probability)
const PROBABILITIES: Record<ColorChoice, number> = {
  red: 0.475,
  blue: 0.475,
  green: 0.03,
  yellow: 0.02,
};

export class ColorPredictionGame implements GamePlugin {
  id = 'colorprediction';
  name = 'Color Prediction';
  category = 'arcade' as const;

  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;

    // For MVP: random prediction (later player chooses)
    const prediction: ColorChoice = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Generate result based on probabilities
    const rand = Math.random();
    let result: ColorChoice = 'red';
    let cumulative = 0;

    for (const color of COLORS) {
      cumulative += PROBABILITIES[color];
      if (rand <= cumulative) {
        result = color;
        break;
      }
    }

    const won = prediction === result;
    const odds = ODDS[result];
    const multiplier = won ? odds : 0;
    const payout = stake * multiplier;

    return {
      won,
      multiplier,
      payout,
      message: won
        ? `🎨 ${result.toUpperCase()}! You won ${odds}x!`
        : `It was ${result.toUpperCase()}. You predicted ${prediction.toUpperCase()}.`,
      details: {
        prediction,
        result,
        odds,
      },
    };
  }

  validateBet(stake: number): boolean {
    return stake > 0 && stake <= 10000;
  }
}
