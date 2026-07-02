import { Router, Request, Response } from 'express';
// import { recordGameResult, getGameLeaderboard, getUserGameStats } from '../models/GameResult';
// import { db } from '../index';
// import { authenticate } from '../middleware/auth';

const router = Router();

// Record a game result (called when game settles)
// TODO: This route needs to be properly integrated with Mongoose models and requireAuth middleware
/*
router.post('/result', authenticate, async (req: Request, res: Response) => {
  try {
    const { gameId, gameName, stake, payout, multiplier, won } = req.body;
    const userId = (req as any).userId;
    const username = (req as any).username;

    if (!gameId || typeof stake !== 'number' || typeof payout !== 'number') {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const result = await recordGameResult(
      db,
      userId,
      username,
      gameId,
      gameName,
      stake,
      payout,
      multiplier,
      won
    );

    res.json({ ok: true, result });
  } catch (error: any) {
    console.error('Record result error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard for a game
router.get('/game/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    const leaderboard = await getGameLeaderboard(db, gameId, limit);
    res.json(leaderboard);
  } catch (error: any) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's stats for a game
router.get('/user/:gameId', authenticate, async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as any).userId;

    const stats = await getUserGameStats(db, userId, gameId);
    res.json(stats);
  } catch (error: any) {
    console.error('User stats error:', error);
    res.status(500).json({ error: error.message });
  }
});
*/

export default router;
