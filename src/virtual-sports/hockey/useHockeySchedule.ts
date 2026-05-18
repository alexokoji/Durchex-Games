import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { teamsByLeague } from '../core/teamDatabase';
import { buildHockeyMarkets } from './hockeyMarkets';
import { simulateHockeyMatch, resolveHockeySelection, hockeyEventsUpTo, type SimulatedHockey } from './hockeySimulation';
import type { BetSelection, Market, MatchEvent, Team } from '../core/types';
import { useBetSlip, type SettlementOutcome } from '../core/BetSlipContext';
import {
  buildRoundPairings,
  createRecentPairsHistory,
  forbiddenPairsForRound,
  recordRoundPairings,
} from '../core/scheduleHelpers';
import { pushRecentResult } from '../core/recentResults';
import { getLeague } from '../core/leagueDatabase';

export type HockeyPhase = 'betting' | 'live' | 'finished';

const BETTING_SECONDS = 60;
const LIVE_SECONDS = 120;     // 2-min compressed match
const FINISHED_SECONDS = 25;
const GAME_MINUTES = 60;

export interface HockeyScheduledMatch {
  id: string;
  round: number;
  home: Team;
  away: Team;
  markets: Market[];
  simulation: SimulatedHockey;
  phase: HockeyPhase;
  gameMinute: number;
  visibleEvents: MatchEvent[];
}

export interface UseHockeyScheduleResult {
  round: number;
  phase: HockeyPhase;
  secondsToNextPhase: number;
  matches: HockeyScheduledMatch[];
  nextRoundIn: number;
  liveCount: number;
}

interface Args { leagueId: string; matchesPerRound?: number }

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function useHockeySchedule({ leagueId, matchesPerRound }: Args): UseHockeyScheduleResult {
  const teams = useMemo(() => teamsByLeague(leagueId), [leagueId]);
  const slip = useBetSlip();
  const settledRef = useRef<Set<string>>(new Set());
  const historyRef = useRef(createRecentPairsHistory());

  const buildRound = useCallback((r: number): HockeyScheduledMatch[] => {
    const forbidden = forbiddenPairsForRound(historyRef.current, r);
    const pairs = buildRoundPairings(teams, r, forbidden, matchesPerRound);
    recordRoundPairings(historyRef.current, r, pairs);
    return pairs.map((p, i) => {
      const matchId = `hkm-${leagueId}-r${r}-${i}`;
      const seed = hash(matchId);
      const simulation = simulateHockeyMatch(p.home, p.away, seed);
      const { markets } = buildHockeyMarkets(matchId, p.home, p.away);
      return { id: matchId, round: r, home: p.home, away: p.away, markets, simulation, phase: 'betting' as HockeyPhase, gameMinute: 0, visibleEvents: [] };
    });
  }, [teams, leagueId, matchesPerRound]);

  const [round, setRound] = useState(1);
  const [matches, setMatches] = useState<HockeyScheduledMatch[]>(() => buildRound(1));
  const [phaseClock, setPhaseClock] = useState({ phase: 'betting' as HockeyPhase, secondsInto: 0 });

  useEffect(() => {
    historyRef.current = createRecentPairsHistory();
    setRound(1);
    setMatches(buildRound(1));
    setPhaseClock({ phase: 'betting', secondsInto: 0 });
  }, [buildRound]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setPhaseClock(prev => {
        let { phase, secondsInto } = prev;
        secondsInto++;
        const cap = phase === 'betting' ? BETTING_SECONDS : phase === 'live' ? LIVE_SECONDS : FINISHED_SECONDS;
        if (secondsInto >= cap) {
          if (phase === 'betting') return { phase: 'live', secondsInto: 0 };
          if (phase === 'live')    return { phase: 'finished', secondsInto: 0 };
          setRound(r => { const n = r + 1; setMatches(buildRound(n)); return n; });
          return { phase: 'betting', secondsInto: 0 };
        }
        return { phase, secondsInto };
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [buildRound]);

  useEffect(() => {
    setMatches(prev => prev.map(m => {
      if (phaseClock.phase === 'betting') return { ...m, phase: 'betting', gameMinute: 0, visibleEvents: [] };
      if (phaseClock.phase === 'live') {
        const gameMinute = (Math.min(1, phaseClock.secondsInto / LIVE_SECONDS)) * GAME_MINUTES;
        return { ...m, phase: 'live', gameMinute, visibleEvents: hockeyEventsUpTo(m.simulation.events, gameMinute) };
      }
      return { ...m, phase: 'finished', gameMinute: GAME_MINUTES, visibleEvents: m.simulation.events };
    }));
  }, [phaseClock]);

  useEffect(() => {
    if (phaseClock.phase !== 'finished' || phaseClock.secondsInto !== 0) return;
    const key = `hk-r-${round}-${leagueId}`;
    if (settledRef.current.has(key)) return;
    settledRef.current.add(key);
    const pending: BetSelection[] = slip.openTickets.flatMap(t => t.selections);
    const outcomes: SettlementOutcome[] = [];
    for (const sel of pending) {
      const m = matches.find(x => x.id === sel.matchId);
      if (!m) continue;
      outcomes.push({ selectionId: sel.id, result: resolveHockeySelection(sel, m.simulation) });
    }
    if (outcomes.length > 0) slip.settleOutcomes(outcomes);

    const league = getLeague(leagueId);
    const leagueName = league?.shortName ?? leagueId.toUpperCase();
    for (const m of matches) {
      const { home: hs, away: as } = m.simulation.finalScore;
      pushRecentResult({
        sport: 'hockey',
        leagueId,
        leagueName,
        home: { id: m.home.id, name: m.home.shortName, abbr: m.home.abbr, score: hs },
        away: { id: m.away.id, name: m.away.shortName, abbr: m.away.abbr, score: as },
        finishedAt: Date.now(),
        source: 'live',
      });
    }
  }, [phaseClock, round, matches, slip, leagueId]);

  const cap = phaseClock.phase === 'betting' ? BETTING_SECONDS : phaseClock.phase === 'live' ? LIVE_SECONDS : FINISHED_SECONDS;
  const secondsToNextPhase = Math.max(0, cap - phaseClock.secondsInto);
  const nextRoundIn = phaseClock.phase === 'betting'
    ? BETTING_SECONDS - phaseClock.secondsInto + LIVE_SECONDS + FINISHED_SECONDS
    : phaseClock.phase === 'live'
      ? LIVE_SECONDS - phaseClock.secondsInto + FINISHED_SECONDS
      : FINISHED_SECONDS - phaseClock.secondsInto;

  return { round, phase: phaseClock.phase, secondsToNextPhase, matches, nextRoundIn, liveCount: phaseClock.phase === 'live' ? matches.length : 0 };
}
