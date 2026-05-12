import 'dotenv/config';
import path from 'node:path';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return fallback ?? '';
  }
  return v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

function list(name: string): string[] {
  const v = process.env[name];
  if (!v) return [];
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

export const env = {
  nodeEnv:    process.env.NODE_ENV ?? 'development',
  isProd:     process.env.NODE_ENV === 'production',
  port:       num('PORT', 4000),
  publicUrl:  required('PUBLIC_URL', 'http://localhost:4000'),
  clientUrl:  required('CLIENT_URL', 'http://localhost:5173'),
  corsOrigins: list('CORS_ORIGINS').length > 0 ? list('CORS_ORIGINS') : ['http://localhost:5173'],

  mongoUri:   required('MONGO_URI', 'mongodb://localhost:27017/duchexigames'),

  jwtSecret:  required('JWT_SECRET', 'dev-only-replace-in-prod'),
  jwtAccessTtl:  process.env.JWT_ACCESS_TTL  ?? '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',

  smtp: {
    host:   process.env.SMTP_HOST ?? '',
    port:   num('SMTP_PORT', 465),
    secure: bool('SMTP_SECURE', true),
    user:   process.env.SMTP_USER ?? '',
    pass:   process.env.SMTP_PASS ?? '',
    from:   process.env.EMAIL_FROM ?? 'DUCHEXiGAMES <no-reply@duchexigames.com>',
  },

  google: {
    clientId:     process.env.GOOGLE_CLIENT_ID     ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:  process.env.GOOGLE_CALLBACK_URL  ?? '',
    enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  },

  apple: {
    clientId:       process.env.APPLE_CLIENT_ID ?? '',
    teamId:         process.env.APPLE_TEAM_ID   ?? '',
    keyId:          process.env.APPLE_KEY_ID    ?? '',
    privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH
      ? path.resolve(process.env.APPLE_PRIVATE_KEY_PATH)
      : '',
    callbackUrl:    process.env.APPLE_CALLBACK_URL ?? '',
    enabled: !!(
      process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY_PATH
    ),
  },

  flutterwave: {
    publicKey:    process.env.FLUTTERWAVE_PUBLIC_KEY ?? '',
    secretKey:    process.env.FLUTTERWAVE_SECRET_KEY ?? '',
    webhookHash:  process.env.FLUTTERWAVE_WEBHOOK_HASH ?? '',
    redirectUrl:  process.env.FLUTTERWAVE_REDIRECT_URL ?? '',
    enabled: !!(process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_PUBLIC_KEY),
  },

  economy: {
    welcomeBonusBtc: num('WELCOME_BONUS_BTC', 0),
    depositMinBtc:   num('DEPOSIT_MIN_BTC', 0.0001),
    depositMaxBtc:   num('DEPOSIT_MAX_BTC', 10),
    withdrawMinBtc:  num('WITHDRAW_MIN_BTC', 0.0005),
    withdrawMaxBtc:  num('WITHDRAW_MAX_BTC', 5),
  },
};

export type Env = typeof env;
