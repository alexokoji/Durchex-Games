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

/** A pre-booked / live / finished bundle of fixtures for one round. */
export interface ScheduledSession {
  sessionId: number;       // round number, exposed as the public "Session #" to the user
  state: 'live' | 'upcoming';
  matches: ScheduledMatch[];
  /** Seconds until this session's phase changes (kickoff / settle / next). */
  secondsUntilLive: number;
}

interface UseSoccerScheduleArgs {
  leagueId: string;
  matchesPerRound?: number;
  /** How many future rounds to pre-build for pre-booking. Default 2 → Live + Next + After-next. */
  upcomingCount?: number;
}

export interface UseSoccerScheduleResult {
  round: number;
  phase: MatchPhase;
  secondsToNextPhase: number;
  matches: ScheduledMatch[];
  /** Pre-booking layer — future sessions users can already bet on. */
  upcomingSessions: ScheduledSession[];
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

export function useSoccerSchedule({ leagueId, matchesPerRound, upcomingCount = 2 }: UseSoccerScheduleArgs): UseSoccerScheduleResult {
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
  /** Future rounds keyed by round number — pre-built so users can bet on them now. */
  const [upcoming, setUpcoming] = useState<Record<number, ScheduledMatch[]>>(() => {
    const out: Record<number, ScheduledMatch[]> = {};
    for (let i = 1; i <= upcomingCount; i++) out[1 + i] = buildRound(1 + i);
    return out;
  });
  const [phaseClock, setPhaseClock] = useState({ phase: 'betting' as MatchPhase, secondsInto: 0 });

  // Rebuild round when league changes (fresh history per league).
  useEffect(() => {
    historyRef.current = createRecentPairsHistory();
    setRound(1);
    setMatches(buildRound(1));
    const out: Record<number, ScheduledMatch[]> = {};
    for (let i = 1; i <= upcomingCount; i++) out[1 + i] = buildRound(1 + i);
    setUpcoming(out);
    setPhaseClock({ phase: 'betting', secondsInto: 0 });
  }, [buildRound, upcomingCount]);

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
          // finished → promote upcoming[round+1] into current, shift everything down,
          // generate a new tail upcoming round.
          setRound(r => {
            const nextRound = r + 1;
            setUpcoming(prevUpcoming => {
              const next = { ...prevUpcoming };
              const promoted = next[nextRound];
              if (promoted) setMatches(promoted);
              else          setMatches(buildRound(nextRound));
              delete next[nextRound];
              // Shift: build a fresh tail at the highest round.
              const tailRound = nextRound + upcomingCount;
              next[tailRound] = buildRound(tailRound);
              // Re-seed lower upcoming rounds that were already there.
              for (let i = 1; i < upcomingCount; i++) {
                const r2 = nextRound + i;
                if (!next[r2]) next[r2] = buildRound(r2);
              }
              return next;
            });
            return nextRound;
          });
          return { phase: 'betting', secondsInto: 0 };
        }
        return { phase, secondsInto };
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [buildRound, upcomingCount]);

  // Sync the LIVE round's matches with phase clock.
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
      return { ...m, phase: 'finished', liveMinute: 90, visibleEvents: m.simulation.events };
    }));
  }, [phaseClock]);

  // Settle bet slip outcomes when round transitions into 'finished'. Includes
  // any pre-booked bets on this round that came in via the future-round UI.
  useEffect(() => {
    if (phaseClock.phase !== 'finished' || phaseClock.secondsInto !== 0) return;
    const roundKey = `r-${round}-${leagueId}`;
    if (settledRoundsRef.current.has(roundKey)) return;
    settledRoundsRef.current.add(roundKey);

    const outcomes: SettlementOutcome[] = [];
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

  // Build the upcoming-session bundles. Each upcoming round's kickoff
  // happens `nextRoundIn + (offset-1) * ROUND_SECONDS` seconds from now.
  const upcomingSessions: ScheduledSession[] = useMemo(() => {
    const keys = Object.keys(upcoming).map(Number).sort((a, b) => a - b);
    return keys.map((k, idx) => ({
      sessionId: k,
      state: 'upcoming' as const,
      matches: upcoming[k],
      secondsUntilLive: nextRoundIn + idx * ROUND_SECONDS,
    }));
  }, [upcoming, nextRoundIn]);

  return {
    round,
    phase: phaseClock.phase,
    secondsToNextPhase,
    matches,
    upcomingSessions,
    nextRoundIn,
    liveCount: phaseClock.phase === 'live' ? matches.length : 0,
  };
}
