import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';
export class LuckyDoorGame implements GamePlugin {
  id = 'luckydoor'; name = 'Lucky Door'; category = 'arcade' as const;
  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;
    const door = Math.floor(Math.random() * 3);
    const won = door === 1;
    const mult = won ? 3 : 0;
    return { won, multiplier: mult, payout: stake * mult, message: won ? `🚪 Right door! 3x!` : '❌ Wrong door', details: { door } };
  }
  validateBet(stake: number): boolean { return stake > 0 && stake <= 10000; }
}
