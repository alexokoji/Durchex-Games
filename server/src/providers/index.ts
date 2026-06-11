import { env } from '../config/env';
import type { SportsFeedProvider } from './sportsFeed';
import { theOddsApiProvider } from './theOddsApi';
import { sandboxProvider } from './sandboxFeed';

export * from './sportsFeed';

/**
 * Returns the live odds provider when ODDS_API_KEY is set, otherwise the
 * deterministic sandbox feed so the Live Sports section works with no vendor.
 */
export function getSportsFeed(): SportsFeedProvider {
  return env.liveSports.enabled ? theOddsApiProvider : sandboxProvider;
}
