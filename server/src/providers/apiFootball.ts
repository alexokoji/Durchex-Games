import { env } from '../config/env';
import type {
  SportsFeedProvider, FeedSport, FeedEvent, FeedResult, FeedMarket, FeedOutcome,
  FeedMatchDetails, FeedLineupTeam, FeedStat, FeedTimelineEvent, FeedH2HMatch, FeedStandingRow,
} from './sportsFeed';

/**
 * API-Football adapter (api-sports.io v3 — https://www.api-football.com).
 *
 * Soccer-focused. Provides fixtures + live scores + pre-match odds on every
 * plan, and in-play odds (`/odds/live`) when API_FOOTBALL_LIVE_ODDS=1 (needs a
 * paid plan to poll often enough to actually tick).
 *
 * Supports both the direct API-Sports host (default, header x-apisports-key)
 * and the RapidAPI gateway (set API_FOOTBALL_HOST=api-football-v1.p.rapidapi.com).
 *
 * The whole platform only ever sees the provider-agnostic Feed* shapes, and we
 * normalise API-Football's bet/value payloads into the same market keys the UI
 * and settlement already understand: h2h, totals, spreads, double_chance, btts,
 * draw_no_bet. Markets API-Football can't give in score-settleable form
 * (corners, cards, half/team props) are dropped.
 */

// ─── Raw payload shapes ──────────────────────────────────────────────────────
interface AFResponse<T> {
  errors: unknown;
  results?: number;
  paging?: { current: number; total: number };
  response: T[];
}
interface AFTeam { id: number; name: string }
interface AFFixtureRow {
  fixture: {
    id: number; date: string; timestamp: number;
    status: { short: string; elapsed: number | null };
    venue?: { name?: string | null };
    referee?: string | null;
  };
  league: { id: number; name: string; country?: string; season?: number };
  teams: { home: AFTeam; away: AFTeam };
  goals: { home: number | null; away: number | null };
}
interface AFPlayerEntry { player: { id: number; name: string; number?: number | null; pos?: string | null; grid?: string | null } }
interface AFLineupRow { team: AFTeam; formation?: string | null; coach?: { id?: number; name?: string } | null; startXI?: AFPlayerEntry[]; substitutes?: AFPlayerEntry[] }
interface AFStatItem { type: string; value: number | string | null }
interface AFStatRow { team: AFTeam; statistics?: AFStatItem[] }
interface AFEventRow { time?: { elapsed?: number | null; extra?: number | null }; team: AFTeam; player?: { id?: number; name?: string } | null; assist?: { id?: number; name?: string } | null; type: string; detail?: string | null }
interface AFStandingItem { rank: number; team: AFTeam; all?: { played?: number; win?: number; draw?: number; lose?: number }; goalsDiff?: number; points?: number; form?: string | null }
interface AFStandingsRow { league: { standings?: AFStandingItem[][] } }
interface AFOddValue { value: string; odd: string; handicap?: string | null }
interface AFBet { id?: number; name: string; values: AFOddValue[] }
interface AFBookmaker { id: number; name: string; bets: AFBet[] }
interface AFOddsRow { fixture: { id: number; date?: string }; bookmakers: AFBookmaker[] }
interface AFLiveRow { fixture: { id: number }; teams?: { home: AFTeam; away: AFTeam }; odds: AFBet[] }
interface AFLeagueRow { league: { id: number; name: string }; country?: { name: string } }

type OurKey = 'h2h' | 'totals' | 'spreads' | 'double_chance' | 'btts' | 'draw_no_bet';

// Fixtures considered finished (settleable / no longer shown as live).
const FINISHED = new Set(['FT', 'AET', 'PEN']);

// Built-in metadata for common leagues so listSports() needs no extra request.
// The synthesised key keeps the country name so the web client's flag mapping
// (which keys off tokens like `england`, `spain`, …) keeps working unchanged.
const LEAGUE_META: Record<string, { country: string; title: string }> = {
  '39':  { country: 'england',     title: 'Premier League' },
  '140': { country: 'spain',       title: 'La Liga' },
  '135': { country: 'italy',       title: 'Serie A' },
  '78':  { country: 'germany',     title: 'Bundesliga' },
  '61':  { country: 'france',      title: 'Ligue 1' },
  '2':   { country: 'europe',      title: 'UEFA Champions League' },
  '3':   { country: 'europe',      title: 'UEFA Europa League' },
  '88':  { country: 'netherlands', title: 'Eredivisie' },
  '94':  { country: 'portugal',    title: 'Primeira Liga' },
  '203': { country: 'turkey',      title: 'Super Lig' },
  '253': { country: 'usa',         title: 'MLS' },
  '71':  { country: 'brazil',      title: 'Brasileirao Serie A' },
  '262': { country: 'mexico',      title: 'Liga MX' },
  '40':  { country: 'england',     title: 'Championship' },
  '45':  { country: 'england',     title: 'FA Cup' },
};

// ─── HTTP helper ───────────────────────────────────────────────────────────
let _requestsRemaining: number | null = null;
export function apiFootballRequestsRemaining(): number | null { return _requestsRemaining; }

async function af<T>(path: string, params: Record<string, string>): Promise<AFResponse<T>> {
  const cfg = env.liveSports.apiFootball;
  const qs = new URLSearchParams(params);
  const headers: Record<string, string> = cfg.rapidApiHost
    ? { 'x-rapidapi-key': cfg.key, 'x-rapidapi-host': cfg.rapidApiHost }
    : { 'x-apisports-key': cfg.key };

  const res = await fetch(`${cfg.base}${path}?${qs.toString()}`, { headers });
  const rem = res.headers.get('x-ratelimit-requests-remaining'); // daily quota left
  if (rem != null && Number.isFinite(Number(rem))) _requestsRemaining = Number(rem);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`api_football_${res.status}: ${txt.slice(0, 200)}`);
  }
  const body = await res.json() as AFResponse<T>;
  // API-Football returns HTTP 200 with a populated `errors` object on quota /
  // parameter errors — surface those as failures too.
  const errs = body?.errors;
  const hasErr = Array.isArray(errs) ? errs.length > 0 : !!errs && Object.keys(errs as object).length > 0;
  if (hasErr) throw new Error(`api_football_error: ${JSON.stringify(errs).slice(0, 200)}`);
  return body;
}

const isoDay = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

function leagueIdFromKey(sportKey: string): string {
  const parts = sportKey.split('_');
  return parts[parts.length - 1];
}

// ─── Market normalisation ─────────────────────────────────────────────────
function mapMarket(id: number | undefined, name: string): OurKey | null {
  const n = (name ?? '').toLowerCase();
  if (n.includes('double chance')) return 'double_chance';
  if (n.includes('draw no bet')) return 'draw_no_bet';
  if (n.includes('both teams') || n.includes('btts')) return 'btts';
  if (id === 5 || n.includes('over/under') || n.includes('goals over')) {
    // Only full-match goal totals are score-settleable.
    if (/(corner|card|half|team|1st|2nd|player|booking|offside|foul)/.test(n)) return null;
    return 'totals';
  }
  if (n.includes('handicap')) {
    if (/(corner|card|half)/.test(n)) return null;
    return 'spreads';
  }
  if (id === 1 || n === '1x2' || n === 'match winner' || n === 'full time result' ||
      (n.includes('winner') && !n.includes('half') && !n.includes('team'))) return 'h2h';
  return null;
}

function buildOutcome(key: OurKey, v: AFOddValue, home: string, away: string): FeedOutcome | null {
  const price = Number(v.odd);
  if (!Number.isFinite(price) || price <= 1) return null;
  const raw = (v.value ?? '').trim();
  const t = raw.toLowerCase();

  switch (key) {
    case 'h2h':
      if (t === 'home' || t === '1') return { name: home, price };
      if (t === 'away' || t === '2') return { name: away, price };
      if (t === 'draw' || t === 'x') return { name: 'Draw', price };
      return null;

    case 'totals': {
      const m = raw.match(/^(over|under)\s+([\d.]+)$/i);
      if (!m) return null;
      return { name: /over/i.test(m[1]) ? 'Over' : 'Under', price, point: Number(m[2]) };
    }

    case 'double_chance': {
      const c = t.replace(/\s/g, '');
      if (c === '1x' || c === 'home/draw' || c === 'homeordraw') return { name: `${home} or Draw`, price };
      if (c === 'x2' || c === 'draw/away' || c === 'draworaway') return { name: `Draw or ${away}`, price };
      if (c === '12' || c === 'home/away' || c === 'homeoraway') return { name: `${home} or ${away}`, price };
      return null;
    }

    case 'btts':
      if (t === 'yes') return { name: 'Yes', price };
      if (t === 'no') return { name: 'No', price };
      return null;

    case 'draw_no_bet':
      if (t === 'home' || t === '1') return { name: home, price };
      if (t === 'away' || t === '2') return { name: away, price };
      return null;

    case 'spreads': {
      // "Home -1", "Away +1.5", or value "Home"/"Away" + separate handicap.
      const m = raw.match(/^(home|away)\s*([+-]?[\d.]+)?$/i);
      if (!m) return null;
      const point = Number(m[2] ?? v.handicap ?? '');
      if (!Number.isFinite(point)) return null;
      return { name: m[1].toLowerCase() === 'home' ? home : away, price, point };
    }
  }
}

/** Collapse one-or-more odds sets (bookmakers) into the best price per outcome. */
function normalizeGroups(sets: AFBet[][], home: string, away: string): FeedMarket[] {
  const byKey = new Map<string, Map<string, FeedOutcome>>();
  for (const set of sets) {
    for (const bet of set ?? []) {
      const key = mapMarket(bet.id, bet.name);
      if (!key) continue;
      const outs = byKey.get(key) ?? new Map<string, FeedOutcome>();
      for (const v of bet.values ?? []) {
        const built = buildOutcome(key, v, home, away);
        if (!built) continue;
        const ok = `${built.name}|${built.point ?? ''}`;
        const cur = outs.get(ok);
        if (!cur || built.price > cur.price) outs.set(ok, built); // best price across books
      }
      if (outs.size) byKey.set(key, outs);
    }
  }
  return Array.from(byKey.entries()).map(([key, outs]) => ({
    key, outcomes: Array.from(outs.values()),
  }));
}

// ─── Provider ──────────────────────────────────────────────────────────────
export const apiFootballProvider: SportsFeedProvider = {
  name: 'api-football',
  live: true,
  requestsRemaining: () => _requestsRemaining,

  async listSports(): Promise<FeedSport[]> {
    const cfg = env.liveSports.apiFootball;
    const out: FeedSport[] = [];
    for (const id of cfg.leagues) {
      const meta = LEAGUE_META[id];
      if (meta) {
        out.push({ key: `soccer_${meta.country}_${id}`, group: 'Soccer', title: meta.title, active: true });
        continue;
      }
      // Unknown id → one lookup for its name/country (cached implicitly via DB upserts).
      try {
        const r = await af<AFLeagueRow>('/leagues', { id });
        const L = r.response[0];
        const country = (L?.country?.name ?? 'world').toLowerCase().replace(/[^a-z0-9]+/g, '_');
        out.push({ key: `soccer_${country}_${id}`, group: 'Soccer', title: L?.league?.name ?? `League ${id}`, active: true });
      } catch {
        out.push({ key: `soccer_world_${id}`, group: 'Soccer', title: `League ${id}`, active: true });
      }
    }
    return out;
  },

  async listEvents(sportKey: string): Promise<FeedEvent[]> {
    const cfg = env.liveSports.apiFootball;
    const league = leagueIdFromKey(sportKey);
    const season = String(cfg.season);

    // 1) Upcoming + in-play fixtures in the window (drop finished/cancelled).
    const fx = await af<AFFixtureRow>('/fixtures', {
      league, season, from: isoDay(-1), to: isoDay(cfg.daysAhead), timezone: 'UTC',
    });
    const fixtures = fx.response.filter(f => !FINISHED.has(f.fixture.status.short)
      && !['CANC', 'PST', 'ABD', 'AWD', 'WO'].includes(f.fixture.status.short));
    if (!fixtures.length) return [];
    const wanted = new Set(fixtures.map(f => String(f.fixture.id)));

    // 2) Pre-match odds for the league/season (paginated, capped).
    const oddsByFixture = new Map<string, AFBet[][]>();
    let page = 1;
    let totalPages = 1;
    do {
      let od: AFResponse<AFOddsRow>;
      try { od = await af<AFOddsRow>('/odds', { league, season, page: String(page) }); }
      catch { break; }
      totalPages = od.paging?.total ?? 1;
      for (const row of od.response) {
        const fid = String(row.fixture.id);
        if (!wanted.has(fid)) continue;
        const groups: AFBet[] = [];
        for (const bm of row.bookmakers ?? []) for (const b of bm.bets ?? []) groups.push(b);
        const arr = oddsByFixture.get(fid) ?? [];
        arr.push(groups);
        oddsByFixture.set(fid, arr);
      }
      page++;
    } while (page <= totalPages && page <= cfg.maxOddsPages);

    // 3) Optional in-play odds overlay for currently-live fixtures.
    const liveByFixture = new Map<string, AFBet[]>();
    if (cfg.liveOdds) {
      try {
        const lv = await af<AFLiveRow>('/odds/live', { league });
        for (const row of lv.response) {
          const fid = String(row.fixture.id);
          if (wanted.has(fid)) liveByFixture.set(fid, row.odds ?? []);
        }
      } catch { /* live odds optional */ }
    }

    return fixtures.map(f => {
      const fid = String(f.fixture.id);
      const home = f.teams.home.name;
      const away = f.teams.away.name;
      const live = liveByFixture.get(fid);
      const markets = live && live.length
        ? normalizeGroups([live], home, away)
        : normalizeGroups(oddsByFixture.get(fid) ?? [], home, away);
      return {
        id: fid,
        sportKey,
        sportTitle: f.league.name,
        commenceTime: f.fixture.date,
        homeTeam: home,
        awayTeam: away,
        markets,
      };
    });
  },

  async listResults(sportKey: string): Promise<FeedResult[]> {
    const cfg = env.liveSports.apiFootball;
    const league = leagueIdFromKey(sportKey);
    const r = await af<AFFixtureRow>('/fixtures', {
      league, season: String(cfg.season), from: isoDay(-2), to: isoDay(0), timezone: 'UTC',
    });
    return r.response
      .filter(f => FINISHED.has(f.fixture.status.short))
      .map(f => ({
        id: String(f.fixture.id),
        completed: true,
        homeScore: f.goals?.home ?? undefined,
        awayScore: f.goals?.away ?? undefined,
      }));
  },

  async matchDetails(eventId: string): Promise<FeedMatchDetails | null> {
    const cfg = env.liveSports.apiFootball;
    let fx: AFResponse<AFFixtureRow>;
    try { fx = await af<AFFixtureRow>('/fixtures', { id: eventId }); }
    catch { return null; }
    const f = fx.response[0];
    if (!f) return null;

    const homeId = f.teams.home.id;
    const awayId = f.teams.away.id;
    const leagueId = String(f.league.id);
    const season = String(f.league.season ?? cfg.season);
    const sideOf = (teamId: number): 'home' | 'away' => (teamId === homeId ? 'home' : 'away');

    const [lu, st, ev, h2h, stand] = await Promise.allSettled([
      af<AFLineupRow>('/fixtures/lineups', { fixture: eventId }),
      af<AFStatRow>('/fixtures/statistics', { fixture: eventId }),
      af<AFEventRow>('/fixtures/events', { fixture: eventId }),
      af<AFFixtureRow>('/fixtures/headtohead', { h2h: `${homeId}-${awayId}`, last: '6' }),
      af<AFStandingsRow>('/standings', { league: leagueId, season }),
    ]);

    const details: FeedMatchDetails = {
      status: { short: f.fixture.status.short, elapsed: f.fixture.status.elapsed },
      score: { home: f.goals?.home ?? null, away: f.goals?.away ?? null },
      venue: f.fixture.venue?.name ?? undefined,
      referee: f.fixture.referee ?? undefined,
    };

    if (lu.status === 'fulfilled') {
      const teams: FeedLineupTeam[] = lu.value.response.map(row => ({
        side: sideOf(row.team.id),
        team: row.team.name,
        formation: row.formation ?? undefined,
        coach: row.coach?.name ?? undefined,
        startXI: (row.startXI ?? []).map(p => ({ number: p.player.number ?? undefined, name: p.player.name, pos: p.player.pos ?? undefined })),
        subs: (row.substitutes ?? []).map(p => ({ number: p.player.number ?? undefined, name: p.player.name, pos: p.player.pos ?? undefined })),
      }));
      if (teams.length) details.lineups = teams;
    }

    if (st.status === 'fulfilled' && st.value.response.length) {
      const byType = new Map<string, FeedStat>();
      for (const row of st.value.response) {
        const side = sideOf(row.team.id);
        for (const s of row.statistics ?? []) {
          const cur = byType.get(s.type) ?? { type: s.type, home: null, away: null };
          cur[side] = s.value;
          byType.set(s.type, cur);
        }
      }
      if (byType.size) details.statistics = Array.from(byType.values());
    }

    if (ev.status === 'fulfilled' && ev.value.response.length) {
      details.timeline = ev.value.response
        .map((e): FeedTimelineEvent => ({
          minute: (e.time?.elapsed ?? 0) + (e.time?.extra ?? 0),
          side: sideOf(e.team.id),
          type: e.type,
          detail: e.detail ?? undefined,
          player: e.player?.name ?? undefined,
          assist: e.assist?.name ?? undefined,
        }))
        .sort((a, b) => a.minute - b.minute);
    }

    if (h2h.status === 'fulfilled' && h2h.value.response.length) {
      details.h2h = h2h.value.response
        .filter(m => FINISHED.has(m.fixture.status.short))
        .slice(0, 6)
        .map((m): FeedH2HMatch => ({
          date: m.fixture.date,
          home: m.teams.home.name,
          away: m.teams.away.name,
          homeScore: m.goals?.home ?? null,
          awayScore: m.goals?.away ?? null,
          competition: m.league?.name,
        }));
    }

    if (stand.status === 'fulfilled' && stand.value.response.length) {
      const grp = stand.value.response[0]?.league?.standings?.[0] ?? [];
      if (grp.length) {
        details.standings = grp.map((r): FeedStandingRow => ({
          rank: r.rank,
          team: r.team.name,
          played: r.all?.played ?? 0,
          win: r.all?.win ?? 0,
          draw: r.all?.draw ?? 0,
          lose: r.all?.lose ?? 0,
          goalsDiff: r.goalsDiff ?? 0,
          points: r.points ?? 0,
          form: r.form ?? undefined,
        }));
      }
    }

    return details;
  },
};
