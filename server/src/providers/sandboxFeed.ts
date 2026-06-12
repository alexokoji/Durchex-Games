import type {
  SportsFeedProvider, FeedSport, FeedEvent, FeedResult, FeedOutcome,
} from './sportsFeed';

/**
 * Deterministic SOCCER sandbox feed — used when no ODDS_API_KEY is configured
 * so the Live Sports section is fully functional in dev/demo. Every entry is a
 * soccer competition (so the app groups by league). Fixtures roll forward on a
 * fixed cadence; results appear once kickoff + duration has elapsed. Outcomes
 * are seeded so odds/results are reproducible.
 */

const SPORTS: FeedSport[] = [
  { key: 'soccer_epl',                group: 'Soccer', title: 'Premier League',   active: true },
  { key: 'soccer_spain_la_liga',      group: 'Soccer', title: 'La Liga',          active: true },
  { key: 'soccer_italy_serie_a',      group: 'Soccer', title: 'Serie A',          active: true },
  { key: 'soccer_germany_bundesliga', group: 'Soccer', title: 'Bundesliga',       active: true },
  { key: 'soccer_france_ligue_one',   group: 'Soccer', title: 'Ligue 1',          active: true },
  { key: 'soccer_uefa_champs_league', group: 'Soccer', title: 'Champions League', active: true },
];

const TEAMS: Record<string, string[]> = {
  soccer_epl:                ['Arsenal','Chelsea','Liverpool','Man City','Man Utd','Tottenham','Newcastle','Aston Villa','Brighton','West Ham'],
  soccer_spain_la_liga:      ['Real Madrid','Barcelona','Atletico','Sevilla','Valencia','Villarreal','Real Betis','Real Sociedad','Athletic Club','Girona'],
  soccer_italy_serie_a:      ['Juventus','Inter Milan','AC Milan','Napoli','Roma','Lazio','Atalanta','Fiorentina','Bologna','Torino'],
  soccer_germany_bundesliga: ['Bayern','Dortmund','RB Leipzig','Leverkusen','Frankfurt','Wolfsburg','Stuttgart','Union Berlin','Freiburg','Hoffenheim'],
  soccer_france_ligue_one:   ['PSG','Monaco','Marseille','Lyon','Lille','Nice','Lens','Rennes','Reims','Nantes'],
  soccer_uefa_champs_league: ['Real Madrid','Man City','Bayern','PSG','Inter Milan','Barcelona','Arsenal','Dortmund','Liverpool','Atletico'],
};

const EVENT_SPACING_MS  = 30 * 60 * 1000;  // a fixture every 30 min
const EVENT_DURATION_MS = 110 * 60 * 1000; // decided after ~110 min
const SLOTS = 8;                           // events generated per league

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function slotStart(slot: number): number {
  const grid = Math.floor(Date.now() / EVENT_SPACING_MS) * EVENT_SPACING_MS;
  return grid + slot * EVENT_SPACING_MS;
}
function eventId(sportKey: string, slot: number): string {
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
  const draw = 0.26 - Math.abs(hs - 0.5) * 0.25;
  const hp = hs * (1 - draw), ap = (1 - hs) * (1 - draw);
  const margin = 1.06;
  const price = (p: number) => Math.max(1.05, Math.round((1 / p) / margin * 100) / 100);

  const h2h: FeedOutcome[] = [
    { name: home, price: price(hp) },
    { name: 'Draw', price: price(draw) },
    { name: away, price: price(ap) },
  ];

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
        { name: 'Over',  price: price(0.5), point: 2.5 },
        { name: 'Under', price: price(0.5), point: 2.5 },
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
      if (now < start + EVENT_DURATION_MS) continue;
      const r = rng(hash(ev.id + ':result'));
      out.push({ id: ev.id, completed: true, homeScore: Math.floor(r() * 4), awayScore: Math.floor(r() * 4) });
    }
    return out;
  },
};
