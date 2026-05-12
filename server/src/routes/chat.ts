import { Router, type Request, type Response } from 'express';
import { ChatMessage } from '../models/ChatMessage';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// REST history — used by the chat panel on first load.
router.get('/history', optionalAuth, async (req: Request, res: Response) => {
  const channel = typeof req.query.channel === 'string' ? req.query.channel : 'global';
  const limit   = Math.min(Number(req.query.limit) || 50, 100);
  const messages = await ChatMessage.find({ channel })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ messages: messages.reverse() });
});

export default router;
