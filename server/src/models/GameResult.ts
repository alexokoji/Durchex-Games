// import { Database } from './index';

export interface GameResult {
  id: string;
  userId: string;
  username: string;
  gameId: string;
  gameName: string;
  stake: number;
  payout: number;
  multiplier: number;
  won: boolean;
  createdAt: number;
}

const TABLE = 'game_results';

// TODO: Integrate with Mongoose models instead of generic Database type
/*
export async function recordGameResult(
  db: Database,
  userId: string,
  username: string,
  gameId: string,
  gameName: string,
  stake: number,
  payout: number,
  multiplier: number,
  won: boolean
): Promise<GameResult> {
  const result: GameResult = {
    id: crypto.randomUUID(),
    userId,
    username,
    gameId,
    gameName,
    stake,
    payout,
    multiplier,
    won,
    createdAt: Date.now(),
  };

  await db.insert(TABLE, result);
  return result;
}

export async function getGameLeaderboard(
  db: Database,
  gameId: string,
  limit = 10
): Promise<Array<{ username: string; wins: number; totalWagered: number; totalPayout: number }>> {
  const results = await db.query<GameResult>(
    TABLE,
    { gameId },
    { limit: 1000, sort: { createdAt: -1 } }
  );

  const grouped = new Map<
    string,
    { wins: number; totalWagered: number; totalPayout: number }
  >();

  for (const result of results) {
    const key = result.username;
    if (!grouped.has(key)) {
      grouped.set(key, { wins: 0, totalWagered: 0, totalPayout: 0 });
    }
    const stats = grouped.get(key)!;
    if (result.won) stats.wins++;
    stats.totalWagered += result.stake;
    stats.totalPayout += result.payout;
  }

  return Array.from(grouped.entries())
    .map(([username, stats]) => ({ username, ...stats }))
    .sort((a, b) => b.wins - a.wins || b.totalPayout - a.totalPayout)
    .slice(0, limit);
}

export async function getUserGameStats(
  db: Database,
  userId: string,
  gameId: string
): Promise<{ wins: number; losses: number; totalWagered: number; totalPayout: number; rank: number }> {
  const userResults = await db.query<GameResult>(TABLE, { userId, gameId });
  const allResults = await db.query<GameResult>(TABLE, { gameId }, { limit: 10000 });

  let wins = 0,
    losses = 0,
    totalWagered = 0,
    totalPayout = 0;
  for (const r of userResults) {
    if (r.won) wins++;
    else losses++;
    totalWagered += r.stake;
    totalPayout += r.payout;
  }

  const uniqueWinners = new Map<string, number>();
  for (const r of allResults) {
    if (r.won) {
      uniqueWinners.set(r.userId, (uniqueWinners.get(r.userId) || 0) + 1);
    }
  }

  const rank = Array.from(uniqueWinners.values())
    .filter(w => w > wins)
    .length + 1;

  return { wins, losses, totalWagered, totalPayout, rank };
}
*/
