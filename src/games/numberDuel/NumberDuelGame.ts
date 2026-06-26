import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';
export class NumberDuelGame implements GamePlugin {
  id = 'numberduel'; name = 'Number Duel'; category = 'arcade' as const;
  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;
    const your = Math.floor(Math.random() * 100);
    const house = Math.floor(Math.random() * 100);
    const won = your > house;
    const mult = won ? 1.98 : 0;
    return { won, multiplier: mult, payout: stake * mult, message: won ? `🎯 ${your} > ${house}! ${mult}x!` : `❌ ${your} vs ${house}`, details: { your, house } };
  }
  validateBet(stake: number): boolean { return stake > 0 && stake <= 10000; }
}
