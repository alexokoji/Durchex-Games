import { env } from '../config/env';
import type {
  SportsFeedProvider, FeedSport, FeedEvent, FeedResult, FeedMarket,
} from './sportsFeed';

/**
 * The Odds API adapter (https://the-odds-api.com — v4).
 * Set ODDS_API_KEY to enable. Free tier ~500 req/month, so callers should poll
 * conservatively (ODDS_POLL_SECONDS) and cache via the SportEvent collection.
 */

interface RawSport { key: string; group: string; title: string; active: boolean; has_outrights: boolean }
interface RawOutcome { name: string; price: number; point?: number }
interface RawMarket { key: string; outcomes: RawOutcome[] }
interface RawBookmaker { key: string; title: string; markets: RawMarket[] }
interface RawEvent {
  id: string; sport_key: string; sport_title: string; commence_time: string;
  home_team: string; away_team: string; bookmakers: RawBookmaker[];
}
interface RawScore { name: string; score: string }
interface RawResult { id: string; completed: boolean; scores?: RawScore[]; home_team: string; away_team: string }

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ apiKey: env.liveSports.oddsApiKey, ...params });
  const res = await fetch(`${env.liveSports.oddsApiBase}${path}?${qs.toString()}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`odds_api_${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** Collapse all bookmakers into one representative price per outcome (median-ish: best price). */
function consolidate(ev: RawEvent): FeedMarket[] {
  const byKey = new Map<string, Map<string, { price: number; point?: number }>>();
  for (const bm of ev.bookmakers ?? []) {
    for (const m of bm.markets ?? []) {
      const outs = byKey.get(m.key) ?? new Map();
      for (const o of m.outcomes ?? []) {
        const k = `${o.name}|${o.point ?? ''}`;
        const cur = outs.get(k);
        // keep the best (highest) price across books for a fair displayed line
        if (!cur || o.price > cur.price) outs.set(k, { price: o.price, point: o.point });
      }
      byKey.set(m.key, outs);
    }
  }
  const markets: FeedMarket[] = [];
  for (const [key, outs] of byKey) {
    markets.push({
      key,
      outcomes: Array.from(outs.entries()).map(([k, v]) => ({
        name: k.split('|')[0], price: v.price, point: v.point,
      })),
    });
  }
  return markets;
}

export const theOddsApiProvider: SportsFeedProvider = {
  name: 'the-odds-api',
  live: true,

  async listSports(): Promise<FeedSport[]> {
    const raw = await get<RawSport[]>('/sports', {});
    return raw
      .filter(s => !s.has_outrights)
      .map(s => ({ key: s.key, group: s.group, title: s.title, active: s.active }));
  },

  async listEvents(sportKey: string): Promise<FeedEvent[]> {
    const raw = await get<RawEvent[]>(`/sports/${sportKey}/odds`, {
      regions: env.liveSports.regions,
      markets: 'h2h,totals',
      oddsFormat: 'decimal',
    });
    return raw.map(ev => ({
      id: ev.id,
      sportKey: ev.sport_key,
      sportTitle: ev.sport_title,
      commenceTime: ev.commence_time,
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      markets: consolidate(ev),
    }));
  },

  async listResults(sportKey: string): Promise<FeedResult[]> {
    const raw = await get<RawResult[]>(`/sports/${sportKey}/scores`, { daysFrom: '1' });
    return raw.map(r => {
      const home = r.scores?.find(s => s.name === r.home_team);
      const away = r.scores?.find(s => s.name === r.away_team);
      return {
        id: r.id,
        completed: r.completed,
        homeScore: home ? Number(home.score) : undefined,
        awayScore: away ? Number(away.score) : undefined,
      };
    });
  },
};
