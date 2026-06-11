import type {
  SportsFeedProvider, FeedSport, FeedEvent, FeedResult, FeedOutcome,
} from './sportsFeed';

/**
 * Deterministic sandbox feed — used when no ODDS_API_KEY is configured so the
 * Live Sports section is fully functional in dev/demo. Fixtures roll forward in
 * time on a fixed cadence; results become available once an event's kickoff +
 * duration has elapsed. Outcomes are seeded so odds/results are reproducible.
 */

const SPORTS: FeedSport[] = [
  { key: 'soccer_epl',      group: 'Soccer',     title: 'EPL',           active: true },
  { key: 'soccer_laliga',   group: 'Soccer',     title: 'La Liga',       active: true },
  { key: 'basketball_nba',  group: 'Basketball', title: 'NBA',           active: true },
  { key: 'icehockey_nhl',   group: 'Ice Hockey', title: 'NHL',           active: true },
  { key: 'americanfootball_nfl', group: 'American Football', title: 'NFL', active: true },
];

const TEAMS: Record<string, string[]> = {
  soccer_epl:     ['Arsenal','Chelsea','Liverpool','Man City','Man Utd','Tottenham','Newcastle','Aston Villa'],
  soccer_laliga:  ['Real Madrid','Barcelona','Atletico','Sevilla','Valencia','Villarreal','Real Betis','Sociedad'],
  basketball_nba: ['Lakers','Warriors','Celtics','Bucks','Heat','Nuggets','Suns','76ers'],
  icehockey_nhl:  ['Bruins','Rangers','Lightning','Avalanche','Knights','Maple Leafs','Oilers','Panthers'],
  americanfootball_nfl: ['Chiefs','Eagles','49ers','Bills','Cowboys','Ravens','Bengals','Lions'],
};

const EVENT_SPACING_MS = 30 * 60 * 1000; // a fixture every 30 min
const EVENT_DURATION_MS = 110 * 60 * 1000; // "live"/decided after ~110 min
const SLOTS = 8; // events generated per sport

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Anchor each event to a fixed grid so its id and kickoff are stable. */
function slotStart(slot: number): number {
  const grid = Math.floor(Date.now() / EVENT_SPACING_MS) * EVENT_SPACING_MS;
  return grid + slot * EVENT_SPACING_MS;
}

function eventId(sportKey: string, slot: number): string {
  // Stable within the slot's grid window.
  const grid = Math.floor(slotStart(slot) / EVENT_SPACING_MS);
  return `sbx_${sportKey}_${grid}`;
}

function makeEvent(sport: FeedSport, slot: number): FeedEvent {
  const teams = TEAMS[sport.key] ?? TEAMS.soccer_epl;
  const id = eventId(sport.key, slot);
  const r = rng(hash(id));
  const hi = Math.floor(r() * teams.length);
  let ai = Math.floor(r() * (teams.length - 1)); if (ai >= hi) ai++;
  const home = teams[hi], away = teams[ai];

  // Seeded strengths → fair probabilities → decimal odds with ~6% margin.
  const hs = 0.35 + r() * 0.3;
  const isSoccer = sport.group === 'Soccer' || sport.group === 'Ice Hockey';
  const draw = isSoccer ? 0.26 - Math.abs(hs - 0.5) * 0.25 : 0;
  const hp = hs * (1 - draw), ap = (1 - hs) * (1 - draw);
  const margin = 1.06;
  const price = (p: number) => Math.max(1.05, Math.round((1 / p) / margin * 100) / 100);

  const h2h: FeedOutcome[] = [{ name: home, price: price(hp) }];
  if (draw > 0) h2h.push({ name: 'Draw', price: price(draw) });
  h2h.push({ name: away, price: price(ap) });

  const totalLine = sport.group === 'Basketball' ? 220.5 : sport.group === 'American Football' ? 45.5 : 2.5;

  return {
    id,
    sportKey: sport.key,
    sportTitle: sport.title,
    commenceTime: new Date(slotStart(slot)).toISOString(),
    homeTeam: home,
    awayTeam: away,
    markets: [
      { key: 'h2h', outcomes: h2h },
      { key: 'totals', outcomes: [
        { name: 'Over',  price: price(0.5), point: totalLine },
        { name: 'Under', price: price(0.5), point: totalLine },
      ] },
    ],
  };
}

export const sandboxProvider: SportsFeedProvider = {
  name: 'sandbox',
  live: false,

  async listSports(): Promise<FeedSport[]> {
    return SPORTS;
  },

  async listEvents(sportKey: string): Promise<FeedEvent[]> {
    const sport = SPORTS.find(s => s.key === sportKey);
    if (!sport) return [];
    const out: FeedEvent[] = [];
    for (let slot = 0; slot < SLOTS; slot++) out.push(makeEvent(sport, slot));
    return out;
  },

  async listResults(sportKey: string): Promise<FeedResult[]> {
    const sport = SPORTS.find(s => s.key === sportKey);
    if (!sport) return [];
    const now = Date.now();
    const out: FeedResult[] = [];
    for (let slot = 0; slot < SLOTS; slot++) {
      const ev = makeEvent(sport, slot);
      const start = new Date(ev.commenceTime).getTime();
      const completed = now >= start + EVENT_DURATION_MS;
      if (!completed) continue;
      const r = rng(hash(ev.id + ':result'));
      out.push({
        id: ev.id,
        completed: true,
        homeScore: Math.floor(r() * 4),
        awayScore: Math.floor(r() * 4),
      });
    }
    return out;
  },
};
