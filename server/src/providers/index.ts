import type { SportsFeedProvider } from './sportsFeed';
import { theOddsApiProvider } from './theOddsApi';

export * from './sportsFeed';

/**
 * The live odds provider. There is no demo/sandbox fallback — when no
 * ODDS_API_KEY is configured the scheduler simply doesn't ingest, so the
 * Live Sports section stays empty rather than showing fake fixtures.
 */
export function getSportsFeed(): SportsFeedProvider {
  return theOddsApiProvider;
}
