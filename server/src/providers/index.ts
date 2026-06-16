import type { SportsFeedProvider } from './sportsFeed';
import { theOddsApiProvider } from './theOddsApi';
import { apiFootballProvider } from './apiFootball';
import { env } from '../config/env';

export * from './sportsFeed';

/**
 * The live odds provider, chosen by LIVE_PROVIDER:
 *   'the-odds-api' (default) → multi-sport, The Odds API
 *   'api-football'           → soccer, API-Football (fixtures + odds + live)
 *
 * There is no demo/sandbox fallback — when the selected provider has no key the
 * scheduler simply doesn't ingest, so the Live Sports section stays empty
 * rather than showing fake fixtures.
 */
export function getSportsFeed(): SportsFeedProvider {
  return env.liveSports.provider === 'api-football' ? apiFootballProvider : theOddsApiProvider;
}
