import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Team, Market, BetSelection } from './types';
import { useBetSlip, type SettlementOutcome } from './BetSlipContext';
import {
  buildSeasonSchedule,
  buildLeaguePhaseSchedule,
  type ScheduledFixture,
} from './seasonScheduler';
import { teamsByLeague } from './teamDatabase';
import { getLeague } from './leagueDatabase';
import { pushRecentResult } from './recentResults';
import {
  WEEK_SECONDS, dayAnchorMs, daySlotBase, slotStartMs, endOfDaySlot,
  cyclicWeek, matchSeed, buildMatchId, parseMatchId, slotFinished, hashStr,
} from './seasonClock';

/**
 * Generic season + match-week scheduler.
 *
 * Concepts:
 *   - **Week** is the unit of progression. Each league has a fixed total
 *     number of weeks based on its size (e.g. 38 for a 20-team double
 *     round-robin, 34 for an 18-team one, 8 for the UCC league phase).
 *   - **Tick** within a week has three phases: betting → live → settled,
 *     totalling ~10 minutes. After settled, the next week begins.
 *   - **Pre-booking** lets users place bets on any week ahead of its
 *     kickoff. The slip pays out the moment that week's matches settle.
 *
 * Simulation is sport-agnostic: callers supply a `simulate` function that
 * takes (home, away, seed) → a result object with `finalScore`. The hook
 * stores the simulations once per (week, leagueId) so the live UI can stream
 * them deterministically without re-rolling on every render.
 */

export type SeasonPhase = 'betting' | 'live' | 'finished';

const DEFAULT_BETTING_S  = 360;  // 6 min betting
const DEFAULT_LIVE_S     = 180;  // 3 min live
const DEFAULT_FINISHED_S = 60;   // 1 min settled

export interface WeekMatch<TSim> {
  id: string;
  /** Absolute slot index — unique forever, drives the match seed + settlement. */
  slot: number;
  /** Cyclic week number for display (1..total). */
  week: number;
  home: Team;
  away: Team;
  simulation: TSim;
  markets: Market[];
}

export interface SeasonWeek<TSim> {
  /** Absolute slot index (unique key; survives season-cycle repeats). */
  slot: number;
  /** Cyclic week number for display (1..total). */
  week: number;
  matches: WeekMatch<TSim>[];
  /** Absolute kickoff epoch (ms). */
  startsAt: number;
  liveAt: number;
  settledAt: number;
}

export interface UseLeagueSeasonArgs<TSim> {
  leagueId: string;
  /** Function that produces a simulation for a given (home, away, seed). */
  simulate: (home: Team, away: Team, seed: number) => TSim;
  /** Function that builds the markets for a match. */
  buildMarkets: (home: Team, away: Team, sim: TSim) => Market[];
  /** Function that resolves a bet selection against a simulation. */
  resolveSelection: (sel: BetSelection, sim: TSim) => SettlementOutcome['result'];
  /** Function that extracts the (home, away) score from a simulation. */
  scoreOf: (sim: TSim) => { home: number; away: number };
  /** Sport label (used when persisting recent results). */
  sport: 'soccer' | 'basketball' | 'hockey';
  /** How many weeks ahead to expose for pre-booking. When omitted, ALL
   *  remaining weeks of the current season cycle are shown (book ahead for the
   *  whole day). Pass a number to cap it. */
  lookahead?: number;
  /** Optional override for week duration breakdown. */
  bettingSeconds?: number;
  liveSeconds?: number;
  settledSeconds?: number;
}

export interface UseLeagueSeasonResult<TSim> {
  /** 1-indexed current (cyclic) week. */
  currentWeek: number;
  /** Absolute slot index of the current week — stable identity for selection. */
  currentSlot: number;
  /** Total weeks in the season (e.g. 38, 34, 8). */
  totalWeeks: number;
  /** Phase of the *current* week. */
  phase: SeasonPhase;
  /** Seconds remaining until the next phase transition. */
  secondsToNextPhase: number;
  /** Seconds until the next week kicks off (always counts down). */
  secondsToNextWeek: number;
  /** Active week + all remaining weeks of the season cycle (or up to `lookahead`). */
  weeks: SeasonWeek<TSim>[];
}

export function useLeagueSeason<TSim>(args: UseLeagueSeasonArgs<TSim>): UseLeagueSeasonResult<TSim> {
  const {
    leagueId, simulate, buildMarkets, resolveSelection, scoreOf, sport,
    lookahead,
    bettingSeconds  = DEFAULT_BETTING_S,
    liveSeconds     = DEFAULT_LIVE_S,
    settledSeconds  = DEFAULT_FINISHED_S,
  } = args;
  const slip = useBetSlip();
  const settledWeeks = useRef(new Set<string>());

  // ─── Build the season fixture list once per league ─────────────────────
  const teams = useMemo(() => teamsByLeague(leagueId), [leagueId]);
  const leagueMeta = useMemo(() => getLeague(leagueId), [leagueId]);
  const seasonSeed = useMemo(() => {
    // Anchor to UTC date so the same calendar day always rebuilds the same
    // season — gives the user predictable "today's fixtures" yet rotates
    // when the date changes.
    const d = new Date();
    const dayKey = `${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}`;
    let h = 5381;
    for (const c of (leagueId + dayKey)) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    return h >>> 0;
  }, [leagueId]);

  const fixtures: ScheduledFixture[] = useMemo(() => {
    if (teams.length < 2) return [];
    const ids = teams.map(t => t.id);
    // Continental cups get the league-phase generator; everything else gets
    // a full double round-robin.
    if (leagueMeta?.tier === 'continental') {
      return buildLeaguePhaseSchedule(ids, seasonSeed, 8);
    }
    return buildSeasonSchedule(ids, seasonSeed);
  }, [teams, leagueMeta, seasonSeed]);

  const total = useMemo(() => {
    let m = 0;
    for (const f of fixtures) if (f.week > m) m = f.week;
    return m;
  }, [fixtures]);

  // ─── Phase clock ────────────────────────────────────────────────────────
  // The season uses today's UTC midnight as anchor so two viewers at the same
  // moment see the same week + phase even without a shared backend.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Display clock is anchored to UTC midnight (the day "starts" on week 1), but
  // each week also maps to an ABSOLUTE slot so identity/seed/settlement never
  // depend on the viewing day.
  const anchor = useMemo(() => dayAnchorMs(now), [Math.floor((now + 3_600_000) / 86_400_000)]);
  const dayBase = useMemo(() => daySlotBase(now), [anchor]);
  const elapsedSec = Math.max(0, Math.floor((now - anchor) / 1000));   // 0..86399
  const weekIdxFromMidnight = Math.floor(elapsedSec / WEEK_SECONDS);   // 0..143
  const secondsIntoWeek = elapsedSec % WEEK_SECONDS;
  const currentWeek = cyclicWeek(weekIdxFromMidnight, total);          // 1..total (display)
  const currentSlot = dayBase + weekIdxFromMidnight;                   // absolute

  const phase: SeasonPhase =
    secondsIntoWeek < bettingSeconds ? 'betting'
    : secondsIntoWeek < bettingSeconds + liveSeconds ? 'live'
    : 'finished';

  const secondsToNextPhase =
    phase === 'betting'  ? bettingSeconds - secondsIntoWeek
    : phase === 'live'   ? (bettingSeconds + liveSeconds) - secondsIntoWeek
    : (bettingSeconds + liveSeconds + settledSeconds) - secondsIntoWeek;
  const secondsToNextWeek = WEEK_SECONDS - secondsIntoWeek;

  // ─── Build simulations for the active + upcoming weeks ─────────────────
  const teamsById = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of teams) m.set(t.id, t);
    return m;
  }, [teams]);

  const endSlot = useMemo(() => endOfDaySlot(now), [anchor]);

  const weeks: SeasonWeek<TSim>[] = useMemo(() => {
    if (total === 0) return [];
    const out: SeasonWeek<TSim>[] = [];
    // Build from the current slot to the end of the UTC day so users can book
    // every remaining match today. Each slot is absolute & unique, so even when
    // the season cycle repeats within the day the match IDs never collide and
    // settlement stays unambiguous. `lookahead` (if given) caps the span.
    const cap = lookahead != null ? currentSlot + lookahead : endSlot;
    const lastSlot = Math.min(endSlot, cap);
    for (let slot = currentSlot; slot <= lastSlot; slot++) {
      const week = cyclicWeek(slot - dayBase, total);  // display week (cyclic)
      const matchesThisWeek = fixtures.filter(f => f.week === week);
      const startsAt  = slotStartMs(slot);
      const liveAt    = startsAt + bettingSeconds * 1000;
      const settledAt = liveAt   + liveSeconds * 1000;
      const built: WeekMatch<TSim>[] = matchesThisWeek
        .map(f => {
          const home = teamsById.get(f.homeId);
          const away = teamsById.get(f.awayId);
          if (!home || !away) return null;
          // Absolute per-match seed — reproducible forever, independent of day.
          const seed = matchSeed(leagueId, slot, home.id, away.id);
          const simulation = simulate(home, away, seed);
          const markets = buildMarkets(home, away, simulation);
          return {
            id: buildMatchId(leagueId, slot, home.id, away.id),
            slot, week, home, away, simulation, markets,
          };
        })
        .filter((m): m is WeekMatch<TSim> => m != null);
      out.push({ slot, week, matches: built, startsAt, liveAt, settledAt });
    }
    return out;
  }, [
    total, currentSlot, dayBase, endSlot, lookahead, fixtures,
    bettingSeconds, liveSeconds, teamsById, leagueId, simulate, buildMarkets,
  ]);

  // ─── Settlement ──────────────────────────────────────────────────────────
  // One slot-based settler handles everything: a bet settles the moment its
  // slot has finished (betting+live elapsed), computed from the ABSOLUTE slot
  // in its match ID and replayed with the absolute seed. This is correct no
  // matter how far ahead the bet was booked, or how much later the user
  // returns (even days) — the slot/seed never depend on the viewing day.
  // Legacy `-w` tickets fall back to the old wrap-based path.
  const settle = useCallback(() => {
    if (total === 0) return;
    const allPending: BetSelection[] = slip.openTickets.flatMap(t => t.selections);

    if (allPending.length > 0) {
      const outcomes: SettlementOutcome[] = [];
      for (const sel of allPending) {
        const parsed = parseMatchId(sel.matchId);
        if (!parsed || parsed.leagueId !== leagueId) continue;
        const dedup = `settle-${sel.id}`;
        if (settledWeeks.current.has(dedup)) continue;

        const home = teamsById.get(parsed.homeId);
        const away = teamsById.get(parsed.awayId);
        if (!home || !away) continue;

        let seed: number;
        if (parsed.slot != null) {
          if (!slotFinished(parsed.slot, now)) continue;     // hasn't played yet
          seed = matchSeed(leagueId, parsed.slot, home.id, away.id);
        } else {
          // Legacy cyclic-week ticket — settle only strictly-past weeks.
          const wk = parsed.week!;
          if (wk < 1 || wk > total) continue;
          let off = wk - currentWeek;
          if (off < -(total / 2)) off += total;
          else if (off > total / 2) off -= total;
          if (off >= 0) continue;
          seed = (seasonSeed ^ (wk * 7919) ^ hashStr(home.id + away.id)) >>> 0;
        }

        const simulation = simulate(home, away, seed);
        settledWeeks.current.add(dedup);
        outcomes.push({
          selectionId: sel.id,
          result: resolveSelection(sel, simulation),
          finalScore: scoreOf(simulation),
        });
      }
      if (outcomes.length > 0) slip.settleOutcomes(outcomes);
    }

    // ── Recent-results feed for the current slot (display only) ──────────
    if (phase === 'finished') {
      const key = `recent-${leagueId}-s${currentSlot}`;
      if (!settledWeeks.current.has(key)) {
        settledWeeks.current.add(key);
        const leagueName = leagueMeta?.shortName ?? leagueId.toUpperCase();
        for (const f of fixtures.filter(fx => fx.week === currentWeek)) {
          const home = teamsById.get(f.homeId);
          const away = teamsById.get(f.awayId);
          if (!home || !away) continue;
          const sim = simulate(home, away, matchSeed(leagueId, currentSlot, home.id, away.id));
          const { home: hs, away: as } = scoreOf(sim);
          pushRecentResult({
            sport, leagueId, leagueName,
            home: { id: home.id, name: home.shortName, abbr: home.abbr, score: hs },
            away: { id: away.id, name: away.shortName, abbr: away.abbr, score: as },
            finishedAt: Date.now(),
            source: 'live',
          });
        }
      }
    }
  }, [
    total, slip, leagueId, teamsById, now, currentWeek, currentSlot, phase,
    fixtures, seasonSeed, simulate, resolveSelection, scoreOf, sport, leagueMeta,
  ]);

  useEffect(() => {
    settle();
  }, [settle]);

  return {
    currentWeek,
    currentSlot,
    totalWeeks: total,
    phase,
    secondsToNextPhase,
    secondsToNextWeek,
    weeks,
  };
}
