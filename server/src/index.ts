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

import { attachChat } from './sockets/chat';
import { setIoInstance } from './sockets/notifier';
import { notFoundHandler, errorHandler } from './middleware/error';

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

  // Light global throttle — bot floods get bounced.
  app.use('/api/', rateLimit({
    windowMs: 60_000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Stricter throttle on auth specifically.
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password'], rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
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
  });
}

main().catch(err => {
  console.error('[fatal]', err);
  process.exit(1);
});
