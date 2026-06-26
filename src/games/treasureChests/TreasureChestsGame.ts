import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';
export class TreasureChestsGame implements GamePlugin {
  id = 'treasurechests'; name = 'Treasure Chests'; category = 'grid' as const;
  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;
    const matches = Math.floor(Math.random() * 5);
    const mult = matches > 0 ? 1.5 * matches : 0;
    return { won: mult > 0, multiplier: mult, payout: stake * mult, message: mult > 0 ? `💎 ${matches} chests! ${mult.toFixed(2)}x!` : '❌ No treasure', details: { matches } };
  }
  validateBet(stake: number): boolean { return stake > 0 && stake <= 10000; }
}
