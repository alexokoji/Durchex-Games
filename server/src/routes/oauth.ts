import { Router, type Request, type Response, type NextFunction } from 'express';
import passport from '../config/passport';
import { env } from '../config/env';
import { issueTokenPair } from '../services/jwt';

const router = Router();

/**
 * After a successful OAuth strategy resolution, redirect the user back to the
 * frontend with a one-shot fragment carrying the token pair. The frontend
 * reads it on /auth/callback, stores the tokens, and replaces history.
 */
function finishOAuth(req: Request, res: Response) {
  const user = req.user as { _id: { toString(): string } } | undefined;
  if (!user) {
    res.redirect(`${env.clientUrl}/auth/callback#error=oauth_failed`);
    return;
  }
  const { accessToken, refreshToken } = issueTokenPair(user._id.toString());
  const hash = `access=${encodeURIComponent(accessToken)}&refresh=${encodeURIComponent(refreshToken)}`;
  res.redirect(`${env.clientUrl}/auth/callback#${hash}`);
}

// ─── Google ───────────────────────────────────────────────────────────────
router.get('/google', (req, res, next) => {
  if (!env.google.enabled) {
    res.status(503).json({ error: 'google_oauth_not_configured' });
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
  if (!env.google.enabled) {
    res.redirect(`${env.clientUrl}/auth/callback#error=google_oauth_not_configured`);
    return;
  }
  passport.authenticate('google', { session: false, failureRedirect: `${env.clientUrl}/auth/callback#error=google_failed` })(req, res, () => finishOAuth(req, res));
  void next;
});

// ─── Apple ────────────────────────────────────────────────────────────────
router.get('/apple', (req, res, next) => {
  if (!env.apple.enabled) {
    res.status(503).json({ error: 'apple_oauth_not_configured' });
    return;
  }
  passport.authenticate('apple', { scope: ['name', 'email'], session: false })(req, res, next);
});

// Apple posts the response with form_post, so the callback is POST.
router.post('/apple/callback', (req: Request, res: Response, next: NextFunction) => {
  if (!env.apple.enabled) {
    res.redirect(`${env.clientUrl}/auth/callback#error=apple_oauth_not_configured`);
    return;
  }
  passport.authenticate('apple', { session: false, failureRedirect: `${env.clientUrl}/auth/callback#error=apple_failed` })(req, res, () => finishOAuth(req, res));
  void next;
});

export default router;
