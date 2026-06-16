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

  // Live Sports Betting feed. When no ODDS_API_KEY is set the server falls
  // back to a deterministic SANDBOX feed so the section is fully functional
  // in dev/demo without a paid provider.
  liveSports: {
    oddsApiKey:  process.env.ODDS_API_KEY ?? '',
    oddsApiBase: process.env.ODDS_API_BASE ?? 'https://api.the-odds-api.com/v4',
    // Only valid Odds-API regions are accepted: us, us2, uk, eu, au. We
    // normalise the env value and drop anything invalid so a typo can't 422
    // every request. Empty → sensible default.
    regions: (() => {
      const VALID = new Set(['us', 'us2', 'uk', 'eu', 'au']);
      const cleaned = (process.env.ODDS_API_REGIONS ?? 'us,uk,eu')
        .split(',').map(r => r.trim().toLowerCase()).filter(r => VALID.has(r));
      return cleaned.length ? cleaned.join(',') : 'us,uk,eu';
    })(),
    // Curated competitions to ingest, across multiple sports. Each is a
    // separate Odds-API key; the app groups them as SPORT → COMPETITION. The
    // provider further filters to whichever are currently in-season.
    // Override with ODDS_SPORTS as a comma-separated list of Odds-API keys.
    // NOTE: more competitions = more API credits per poll.
    sports: (process.env.ODDS_SPORTS ?? [
      // ⚽ Soccer
      'soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a',
      'soccer_germany_bundesliga', 'soccer_france_ligue_one',
      'soccer_netherlands_eredivisie', 'soccer_portugal_primeira_liga',
      'soccer_turkey_super_league', 'soccer_efl_champ', 'soccer_england_efl_cup',
      'soccer_uefa_champs_league', 'soccer_uefa_europa_league',
      'soccer_uefa_european_championship', 'soccer_fifa_world_cup',
      'soccer_usa_mls', 'soccer_brazil_campeonato', 'soccer_mexico_ligamx',
      'soccer_conmebol_copa_libertadores',
      // 🏀 Basketball
      'basketball_nba', 'basketball_euroleague', 'basketball_ncaab',
      'basketball_wnba',
      // 🏈 American Football
      'americanfootball_nfl', 'americanfootball_ncaaf',
      // 🏒 Ice Hockey
      'icehockey_nhl',
      // ⚾ Baseball
      'baseball_mlb',
      // 🎾 Tennis (ATP/WTA majors — Odds-API exposes the active tour event)
      'tennis_atp_us_open', 'tennis_wta_us_open',
      'tennis_atp_wimbledon', 'tennis_wta_wimbledon',
      'tennis_atp_french_open', 'tennis_wta_french_open',
      'tennis_atp_aus_open_singles', 'tennis_wta_aus_open_singles',
      // 🥊 MMA / Boxing
      'mma_mixed_martial_arts', 'boxing_boxing',
      // 🏉 Rugby League
      'rugbyleague_nrl',
      // 🏏 Cricket
      'cricket_international_t20', 'cricket_test_match',
    ].join(',')).split(',').map(s => s.trim()).filter(Boolean),
    pollSeconds: num('ODDS_POLL_SECONDS', 120),
    // Markets to request. The three core markets (h2h, totals, spreads) work on
    // every plan → 1X2, Over/Under, Handicap. The full settleable set (needs a
    // paid Odds-API plan that exposes additional markets) is:
    //   h2h,h2h_3_way,totals,spreads,alternate_totals,alternate_spreads,double_chance,btts,draw_no_bet
    // alternate_* lines are merged into totals/spreads for the line dropdowns.
    // NOTE: each extra market multiplies credit cost (markets × regions per call).
    markets: process.env.ODDS_MARKETS ?? 'h2h,totals,spreads',
    /** true → live provider active; false → section stays empty. */
    enabled:     !!process.env.ODDS_API_KEY,
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
