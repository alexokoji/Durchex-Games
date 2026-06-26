import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';

export class LuckyCardsGame implements GamePlugin {
  id = 'luckycards'; name = 'Lucky Cards'; category = 'card' as const;
  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;
    const won = Math.random() > 0.5;
    const mult = won ? 2 + Math.random() * 3 : 0;
    return { won, multiplier: mult, payout: stake * mult, message: won ? `🃏 Lucky hand! ${mult.toFixed(2)}x!` : '❌ No match', details: {} };
  }
  validateBet(stake: number): boolean { return stake > 0 && stake <= 10000; }
}
