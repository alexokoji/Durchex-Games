import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';
export class BombSquadGame implements GamePlugin {
  id = 'bombsquad'; name = 'Bomb Squad'; category = 'grid' as const;
  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;
    const safe = Math.floor(Math.random() * 8);
    const mult = safe > 3 ? 2 + safe * 0.5 : 0;
    return { won: mult > 0, multiplier: mult, payout: stake * mult, message: mult > 0 ? `💣 Defused ${safe}! ${mult.toFixed(2)}x!` : '💥 Explosion!', details: { safe } };
  }
  validateBet(stake: number): boolean { return stake > 0 && stake <= 10000; }
}
