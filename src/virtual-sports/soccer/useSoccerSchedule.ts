import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { teamsByLeague } from '../core/teamDatabase';
import { buildSoccerMarkets } from './soccerMarkets';
import { simulateSoccerMatch, eventsUpTo, resolveSoccerSelection, type SimulatedMatch } from './soccerSimulation';
import type { BetSelection, Market, MatchEvent, Team } from '../core/types';
import { useBetSlip, type SettlementOutcome } from '../core/BetSlipContext';
import {
  buildRoundPairings,
  createRecentPairsHistory,
  forbiddenPairsForRound,
  recordRoundPairings,
} from '../core/scheduleHelpers';

export type MatchPhase = 'betting' | 'live' | 'finished';

const BETTING_SECONDS = 60;
const LIVE_SECONDS = 90;
const FINISHED_SECONDS = 25;
const ROUND_SECONDS = BETTING_SECONDS + LIVE_SECONDS + FINISHED_SECONDS;  // 175s

export interface ScheduledMatch {
  id: string;
  round: number;
  home: Team;
  away: Team;
  markets: Market[];
  simulation: SimulatedMatch;
  phase: MatchPhase;
  liveMinute: number;          // 0–90
  visibleEvents: MatchEvent[]; // events surfaced so far
  startsAt: number;
  liveAt: number;
  endsAt: number;
}

interface UseSoccerScheduleArgs {
  leagueId: string;
  matchesPerRound?: number;
}

export interface UseSoccerScheduleResult {
  round: number;
  phase: MatchPhase;
  secondsToNextPhase: number;
  matches: ScheduledMatch[];
  nextRoundIn: number;
  liveCount: number;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function useSoccerSchedule({ leagueId, matchesPerRound }: UseSoccerScheduleArgs): UseSoccerScheduleResult {
  const teams = useMemo(() => teamsByLeague(leagueId), [leagueId]);
  const slip = useBetSlip();
  const settledRoundsRef = useRef<Set<string>>(new Set());
  const historyRef = useRef(createRecentPairsHistory());

  const buildRound = useCallback((roundNumber: number): ScheduledMatch[] => {
    const now = Date.now();
    const forbidden = forbiddenPairsForRound(historyRef.current, roundNumber);
    const pairs = buildRoundPairings(teams, roundNumber, forbidden, matchesPerRound);
    recordRoundPairings(historyRef.current, roundNumber, pairs);
    return pairs.map((p, i) => {
      const matchId = `m-${leagueId}-r${roundNumber}-${i}`;
      const seed = hash(matchId);
      const simulation = simulateSoccerMatch(p.home, p.away, seed);
      const { markets } = buildSoccerMarkets(matchId, p.home, p.away);
      return {
        id: matchId,
        round: roundNumber,
        home: p.home,
        away: p.away,
        markets,
        simulation,
        phase: 'betting' as MatchPhase,
        liveMinute: 0,
        visibleEvents: [],
        startsAt: now,
        liveAt: now + BETTING_SECONDS * 1000,
        endsAt: now + (BETTING_SECONDS + LIVE_SECONDS) * 1000,
      };
    });
  }, [teams, leagueId, matchesPerRound]);

  const [round, setRound] = useState(1);
  const [matches, setMatches] = useState<ScheduledMatch[]>(() => buildRound(1));
  const [phaseClock, setPhaseClock] = useState({ phase: 'betting' as MatchPhase, secondsInto: 0 });

  // Rebuild round when league changes (fresh history per league).
  useEffect(() => {
    historyRef.current = createRecentPairsHistory();
    setRound(1);
    setMatches(buildRound(1));
    setPhaseClock({ phase: 'betting', secondsInto: 0 });
  }, [buildRound]);

  // 1 Hz tick: advance phase clock + live minute on live matches
  useEffect(() => {
    const t = window.setInterval(() => {
      setPhaseClock(prev => {
        let { phase, secondsInto } = prev;
        secondsInto++;
        const cap = phase === 'betting' ? BETTING_SECONDS
                  : phase === 'live'    ? LIVE_SECONDS
                  : FINISHED_SECONDS;
        if (secondsInto >= cap) {
          if (phase === 'betting') return { phase: 'live', secondsInto: 0 };
          if (phase === 'live')    return { phase: 'finished', secondsInto: 0 };
          // finished → new round
          setRound(r => {
            const next = r + 1;
            setMatches(buildRound(next));
            return next;
          });
          return { phase: 'betting', secondsInto: 0 };
        }
        return { phase, secondsInto };
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [buildRound]);

  // Sync matches with phase clock (update liveMinute, visibleEvents, phase)
  useEffect(() => {
    setMatches(prev => prev.map(m => {
      if (phaseClock.phase === 'betting') {
        return { ...m, phase: 'betting', liveMinute: 0, visibleEvents: [] };
      }
      if (phaseClock.phase === 'live') {
        const progress = Math.min(1, phaseClock.secondsInto / LIVE_SECONDS);
        const liveMinute = Math.floor(progress * 90);
        return {
          ...m,
          phase: 'live',
          liveMinute,
          visibleEvents: eventsUpTo(m.simulation.events, liveMinute),
        };
      }
      // finished
      return {
        ...m,
        phase: 'finished',
        liveMinute: 90,
        visibleEvents: m.simulation.events,
      };
    }));
  }, [phaseClock]);

  // Settle bet slip outcomes when round transitions into 'finished'.
  useEffect(() => {
    if (phaseClock.phase !== 'finished' || phaseClock.secondsInto !== 0) return;
    const roundKey = `r-${round}-${leagueId}`;
    if (settledRoundsRef.current.has(roundKey)) return;
    settledRoundsRef.current.add(roundKey);

    const outcomes: SettlementOutcome[] = [];
    // collect every pending selection from openTickets + slip that matches these matchIds
    const pendingSelections: BetSelection[] = [
      ...slip.openTickets.flatMap(t => t.selections),
    ];
    for (const sel of pendingSelections) {
      const match = matches.find(m => m.id === sel.matchId);
      if (!match) continue;
      const result = resolveSoccerSelection(sel, match.simulation);
      outcomes.push({ selectionId: sel.id, result });
    }
    if (outcomes.length > 0) {
      slip.settleOutcomes(outcomes);
    }
  }, [phaseClock, round, matches, slip, leagueId]);

  const cap = phaseClock.phase === 'betting' ? BETTING_SECONDS
            : phaseClock.phase === 'live'    ? LIVE_SECONDS
            : FINISHED_SECONDS;
  const secondsToNextPhase = Math.max(0, cap - phaseClock.secondsInto);

  const nextRoundIn = phaseClock.phase === 'betting'
    ? BETTING_SECONDS - phaseClock.secondsInto + LIVE_SECONDS + FINISHED_SECONDS
    : phaseClock.phase === 'live'
      ? LIVE_SECONDS - phaseClock.secondsInto + FINISHED_SECONDS
      : FINISHED_SECONDS - phaseClock.secondsInto;

  return {
    round,
    phase: phaseClock.phase,
    secondsToNextPhase,
    matches,
    nextRoundIn,
    liveCount: phaseClock.phase === 'live' ? matches.length : 0,
  };
  void ROUND_SECONDS;
}
