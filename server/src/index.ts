import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server as IOServer } from 'socket.io';

import { env } from './config/env';
import { connectDb } from './config/db';
import passport from './config/passport';

import authRouter     from './routes/auth';
import oauthRouter    from './routes/oauth';
import walletRouter   from './routes/wallet';
import betsRouter     from './routes/bets';
import paymentsRouter from './routes/payments';
import chatRouter     from './routes/chat';
import usersRouter    from './routes/users';
import bookingCodesRouter from './routes/bookingCodes';
import adminRouter        from './routes/admin';
import promoRouter        from './routes/promo';
import activityRouter     from './routes/activity';
import liveSportsRouter   from './routes/liveSports';

import { attachChat } from './sockets/chat';
import { setIoInstance } from './sockets/notifier';
import { notFoundHandler, errorHandler } from './middleware/error';
import { startCashbackScheduler } from './services/cashbackJob';
import { startDailySummaryScheduler } from './services/dailySummaryJob';
import { startVirtualSportsScheduler } from './services/virtualSportsScheduler';
import { startLiveSportsScheduler } from './services/liveSports';
import { startRiskScanScheduler } from './services/riskScoring';
import { startBonusExpiryScheduler } from './services/bonusExpiry';

async function main(): Promise<void> {
  await connectDb();

  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginEmbedderPolicy: false }));

  app.use(cors({
    origin: (origin, cb) => {
      // allow same-origin / curl (no Origin header) and any whitelisted origin
      if (!origin) return cb(null, true);
      cb(null, env.corsOrigins.includes(origin));
    },
    credentials: true,
  }));

  // IMPORTANT: the Flutterwave webhook needs the raw body. Mount its parser
  // BEFORE the global json() middleware so the raw bytes survive.
  app.use('/api/payments/flutterwave/webhook', express.raw({ type: '*/*' }));

  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true }));

  // Passport doesn't need session middleware because we use JWT for OAuth
  // exchanges (the strategy initialises req.user only for the duration of
  // the callback handler).
  app.use(passport.initialize());

  // Enhanced rate limiting for bot protection
  // Global throttle — 240 req/min (~4/sec) for legitimate users
  app.use('/api/', rateLimit({
    windowMs: 60_000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip health check
      if (req.path === '/api/health') return true;
      return false;
    },
  }));

  // Stricter: Auth endpoints — account takeover protection
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password'], rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many auth attempts. Try again in 1 minute.',
  }));

  // Strict: Wallet & payment endpoints — prevent fund drainage attacks
  app.use(['/api/wallet/withdraw', '/api/wallet/deposit', '/api/payments'], rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many wallet requests. Try again later.',
  }));

  // Strict: Betting endpoints — prevent bet loop exploits
  app.use(['/api/bets/place', '/api/bets/settle'], rateLimit({
    windowMs: 60_000,
    max: 120, // 2/sec is reasonable for betting
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many bet requests. Try again later.',
  }));

  // Very strict: Admin endpoints — protect against privilege escalation
  app.use('/api/admin', rateLimit({
    windowMs: 60_000,
    max: 50, // 0.8/sec for admin operations
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Admin rate limit exceeded.',
  }));

  app.get('/api/health', (_req, res) => res.json({
    ok: true,
    env: env.nodeEnv,
    flutterwave: env.flutterwave.enabled,
    google: env.google.enabled,
    apple:  env.apple.enabled,
    smtp:   !!env.smtp.host,
  }));

  app.use('/api/auth',     authRouter);
  app.use('/api/auth',     oauthRouter);   // /google, /apple, callbacks
  app.use('/api/users',    usersRouter);
  app.use('/api/wallet',   walletRouter);
  app.use('/api/bets',     betsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/chat',     chatRouter);
  app.use('/api/booking-codes', bookingCodesRouter);
  app.use('/api/admin',    adminRouter);
  app.use('/api/promo',    promoRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/live',     liveSportsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = http.createServer(app);
  const io = new IOServer(server, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
  });
  setIoInstance(io);
  attachChat(io);

  server.listen(env.port, () => {
    console.log(`[server] listening on :${env.port} · public ${env.publicUrl}`);
    console.log(`[server] CORS origins: ${env.corsOrigins.join(', ')}`);
    // Safe diagnostic — confirms ADMIN_EMAILS is live without logging addresses.
    const { adminEmailCount } = require('./config/admin') as typeof import('./config/admin');
    console.log(`[server] admin emails configured: ${adminEmailCount()}`);
  });

  // Recurring background jobs — cheap setInterval based scheduling so we
  // don't need to add a cron dependency. JobState persists last-run so a
  // restart can't double-credit users.
  startCashbackScheduler();
  startDailySummaryScheduler();
  startVirtualSportsScheduler();
  startLiveSportsScheduler();
  startRiskScanScheduler();
  startBonusExpiryScheduler();
}

main().catch(err => {
  console.error('[fatal]', err);
  process.exit(1);
});
