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
    // Safe diagnostics — no secrets logged.
    const { adminEmailCount } = require('./config/admin') as typeof import('./config/admin');
    console.log(`[server] admin login: ${env.admin.enabled ? `enabled (user '${env.admin.username}')` : 'disabled (set ADMIN_PASSWORD)'} · allowlist emails: ${adminEmailCount()}`);
    // Provision the backing admin user from env so the credential login works.
    if (env.admin.enabled) {
      const { ensureAdminUser } = require('./services/adminAuth') as typeof import('./services/adminAuth');
      void ensureAdminUser().catch(e => console.error('[server] ensureAdminUser failed', (e as Error).message));
    }
  });

  // Keep-alive — Render's free tier spins the service down after ~15 min with
  // no inbound traffic, causing a slow cold start on the next request. We ping
  // our OWN public Render URL on an interval so there's always recent inbound
  // traffic. Must hit the Render service URL (RENDER_EXTERNAL_URL, set by
  // Render automatically) — NOT PUBLIC_URL, which points at the web frontend.
  startKeepAlive();

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

/**
 * Self-ping to keep a free-tier Render service warm. Hits our own public Render
 * URL every 13 min (under the ~15-min idle spin-down window) so there is always
 * recent inbound traffic. Uses RENDER_EXTERNAL_URL (set automatically by Render)
 * or an explicit KEEPALIVE_URL — never PUBLIC_URL, which is the web frontend.
 */
function startKeepAlive(): void {
  const base = process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!env.isProd) return;
  if (!base) {
    console.log('[keepalive] disabled — set RENDER_EXTERNAL_URL or KEEPALIVE_URL to keep the service warm.');
    return;
  }
  const target = `${base.replace(/\/$/, '')}/api/health`;
  const everyMs = 13 * 60 * 1000;
  setInterval(() => {
    fetch(target).catch(e => console.warn('[keepalive] ping failed:', (e as Error).message));
  }, everyMs);
  console.log(`[keepalive] self-ping ${target} every ${everyMs / 60000} min`);
}

main().catch(err => {
  console.error('[fatal]', err);
  process.exit(1);
});
