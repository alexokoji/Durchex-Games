import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';
export class LuckyWheelGame implements GamePlugin {
  id = 'luckywheel'; name = 'Lucky Wheel Plus'; category = 'wheel' as const;
  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;
    const spin = Math.random();
    const mult = spin < 0.5 ? 0 : spin < 0.8 ? 1.5 : spin < 0.95 ? 3 : 10;
    return { won: mult > 0, multiplier: mult, payout: stake * mult, message: mult > 0 ? `🎡 ${mult}x!` : '❌ No win', details: { mult } };
  }
  validateBet(stake: number): boolean { return stake > 0 && stake <= 10000; }
}
