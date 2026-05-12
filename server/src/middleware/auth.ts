import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt';
import { User, type IUser } from '../models/User';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
    userId?: string;
  }
}

/**
 * Extracts a Bearer token, verifies it, and loads the user. Required for
 * any route that touches a wallet, places a bet, or reads private data.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.header('authorization') ?? '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
    if (!token) {
      res.status(401).json({ error: 'missing_token' });
      return;
    }
    const payload = verifyToken(token);
    if (payload.type !== 'access') {
      res.status(401).json({ error: 'invalid_token_type' });
      return;
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'user_not_found' });
      return;
    }
    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid_token' });
  }
}

/** Soft variant — populates req.user if a valid token is present, but lets the request through either way. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.header('authorization') ?? '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
    if (!token) return next();
    const payload = verifyToken(token);
    if (payload.type !== 'access') return next();
    const user = await User.findById(payload.sub);
    if (user) {
      req.user = user;
      req.userId = user._id.toString();
    }
  } catch {
    /* swallow — falls through unauthenticated */
  }
  next();
}
