/**
 * Hi-Lo: Predict if the next card is higher or lower than the current card.
 *
 * Game Flow:
 * 1. Draw initial card (face-up)
 * 2. Player predicts: Higher / Lower
 * 3. Draw next card
 * 4. If correct, continue with new card + increase multiplier
 * 5. Player can cash out or play again
 *
 * Multipliers by correct predictions:
 * 1 → 1.8x, 2 → 3.2x, 3 → 5.5x, 5 → 15x, 10 → 150x
 */

import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';
import { GameEngine } from '../shared/GameEngine';

const CARD_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 2-A
const CARD_SUITS = ['♠', '♥', '♦', '♣'];
const MULTIPLIERS: Record<number, number> = {
  1: 1.8,
  2: 3.2,
  3: 5.5,
  5: 15,
  10: 150,
};

interface HiLoState {
  currentCard: Card;
  nextCard?: Card;
  prediction?: 'higher' | 'lower';
  correctCount: number;
  streak: { correctCount: number; multiplier: number }[];
  history: { card: Card; prediction: string; correct: boolean }[];
}

interface Card {
  value: number;
  suit: string;
  label: string;
}

export class HiLoGame implements GamePlugin {
  id = 'hilo';
  name = 'Hi-Lo';
  category = 'card' as const;
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;
    const state: HiLoState = {
      currentCard: this.drawCard(session.sessionId + '_start'),
      correctCount: 0,
      streak: [],
      history: [],
    };

    let multiplier = 1;
    let cashed = false;

    // Simulate a play: draw initial card, then play 3 rounds (user would choose, but for MVP we auto-play)
    for (let round = 0; round < 5; round++) {
      // Draw next card
      const nextCard = this.drawCard(session.sessionId + `_round_${round}`);
      state.nextCard = nextCard;

      // Predict (for MVP: random, later player chooses)
      const prediction = this.engine.random(0, 1, session.sessionId + `_pred_${round}`) > 0.5 ? 'higher' : 'lower';
      state.prediction = prediction;

      // Check result
      const correct = this.checkPrediction(state.currentCard.value, nextCard.value, prediction);
      state.history.push({
        card: nextCard,
        prediction,
        correct,
      });

      if (!correct) {
        // Lost
        multiplier = 1;
        cashed = false;
        break;
      }

      state.correctCount++;
      state.currentCard = nextCard;

      // Update multiplier based on streak
      const streakMult = MULTIPLIERS[state.correctCount] || 150;
      multiplier = streakMult;

      // Auto-cash-out after 3 wins (MVP behavior)
      if (state.correctCount >= 3) {
        cashed = true;
        break;
      }
    }

    const won = multiplier > 1;
    const payout = stake * multiplier;

    return {
      won,
      multiplier,
      payout,
      message: won
        ? `🎉 Won ${state.correctCount} in a row! ${multiplier.toFixed(2)}x`
        : `❌ Wrong prediction. Better luck next time!`,
      details: {
        streak: state.correctCount,
        cashed,
      } as Record<string, unknown>,
    };
  }

  private drawCard(seed: string): Card {
    const valueIdx = this.engine.random(0, CARD_VALUES.length - 1, seed + '_val');
    const suitIdx = this.engine.random(0, CARD_SUITS.length - 1, seed + '_suit');
    const value = CARD_VALUES[valueIdx];
    const suit = CARD_SUITS[suitIdx];
    const label = this.cardLabel(value);
    return { value, suit, label };
  }

  private cardLabel(value: number): string {
    if (value === 11) return 'J';
    if (value === 12) return 'Q';
    if (value === 13) return 'K';
    if (value === 14) return 'A';
    return `${value}`;
  }

  private checkPrediction(current: number, next: number, prediction: 'higher' | 'lower'): boolean {
    if (current === next) return false; // Equal = loss (house rule)
    if (prediction === 'higher') return next > current;
    return next < current;
  }
}
