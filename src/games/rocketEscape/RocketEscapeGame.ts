import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';

export class RocketEscapeGame implements GamePlugin {
  id = 'rocketescape';
  name = 'Rocket Escape';
  category = 'multiplier' as const;

  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;
    const multiplier = 1 + Math.random() * 10;
    const won = Math.random() > 0.2;
    return {
      won,
      multiplier: won ? multiplier : 0,
      payout: stake * (won ? multiplier : 0),
      message: won ? `🚀 Escaped at ${multiplier.toFixed(2)}x!` : '💥 Crashed!',
      details: { multiplier },
    };
  }

  validateBet(stake: number): boolean {
    return stake > 0 && stake <= 10000;
  }
}
