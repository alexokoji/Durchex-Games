import type { GamePlugin, GameSession, GameResult } from '../shared/GameEngine';

export class DragonTowerGame implements GamePlugin {
  id = 'dragontower';
  name = 'Dragon Tower';
  category = 'arcade' as const;

  async play(session: GameSession): Promise<GameResult> {
    const { stake } = session;
    const floors = [5, 10, 20, 30, 50, 100];
    let levelReached = 0;
    let multiplier = 1;

    for (let i = 0; i < 6; i++) {
      if (Math.random() > 0.5) {
        levelReached = i + 1;
        multiplier = floors[i] / 10;
      } else {
        break;
      }
    }

    const won = levelReached >= 2;
    const payout = stake * multiplier;

    return {
      won,
      multiplier,
      payout,
      message: won ? `🐉 Reached level ${levelReached}! ${multiplier.toFixed(2)}x!` : '💣 Dragon caught you!',
      details: { level: levelReached },
    };
  }

  validateBet(stake: number): boolean {
    return stake > 0 && stake <= 10000;
  }
}
