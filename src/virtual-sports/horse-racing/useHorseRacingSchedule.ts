import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BetSelection, Market, MatchEvent } from '../core/types';
import { useBetSlip, type SettlementOutcome } from '../core/BetSlipContext';
import { HORSE_POOL, JOCKEYS, RACE_TYPES, type RaceType } from './horseDatabase';
import { buildRaceMarkets, type HorseEntry } from './horseRacingMarkets';
import { simulateRace, resolveHorseSelection, type SimulatedRace } from './horseRacingSimulation';

export type RacePhase = 'betting' | 'live' | 'finished';

const BETTING_SECONDS = 60;
const LIVE_SECONDS = 60;       // 1-min compressed race
const FINISHED_SECONDS = 25;

export interface ScheduledRace {
  id: string;
  round: number;
  raceNumber: number;
  raceType: RaceType;
  horses: HorseEntry[];
  markets: Market[];
  simulation: SimulatedRace;
  phase: RacePhase;
  liveProgress: number;        // 0..1
  visibleEvents: MatchEvent[];
}

export interface UseHorseRacingScheduleResult {
  round: number;
  phase: RacePhase;
  secondsToNextPhase: number;
  races: ScheduledRace[];
  nextRoundIn: number;
  liveCount: number;
}

interface Args { racesPerRound?: number }

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function pickHorses(roundSeed: number, raceIndex: number, count = 8): HorseEntry[] {
  const seed = roundSeed * 31 + raceIndex;
  const rng = () => {
    let s = seed * (raceIndex + 7);
    s = (s + 0x6d2b79f5) >>> 0;
    s ^= s >>> 13;
    s = Math.imul(s, 0x5bd1e995);
    return ((s ^ (s >>> 15)) >>> 0) / 4294967296;
  };
  // simple shuffle using deterministic rng
  let r = seed;
  function nextR() { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; }
  const shuffled = [...HORSE_POOL].sort(() => nextR() - 0.5);
  return shuffled.slice(0, count).map((h, i): HorseEntry => {
    const speed = 60 + Math.floor(nextR() * 36);
    const accel = 60 + Math.floor(nextR() * 36);
    const stam  = 60 + Math.floor(nextR() * 36);
    const form  = Math.round((nextR() - 0.5) * 16);
    const jockey = JOCKEYS[Math.floor(nextR() * JOCKEYS.length)].short;
    return {
      id: `${h.name.toLowerCase().replace(/\s+/g, '-')}-${seed}-${i}`,
      number: i + 1,
      name: h.name,
      silkPrimary: h.silkPrimary,
      silkSecondary: h.silkSecondary,
      jockey,
      speed, acceleration: accel, stamina: stam, form,
    };
  });
  void rng;
}

export function useHorseRacingSchedule({ racesPerRound = 10 }: Args = {}): UseHorseRacingScheduleResult {
  const slip = useBetSlip();
  const settledRef = useRef<Set<string>>(new Set());

  const buildRound = useCallback((r: number): ScheduledRace[] => {
    const seed = hash(`turf-${r}`);
    return Array.from({ length: racesPerRound }, (_, i) => {
      const raceType: RaceType = RACE_TYPES[i % RACE_TYPES.length];
      const horses = pickHorses(seed, i);
      const raceId = `r-${r}-${i}`;
      const { markets } = buildRaceMarkets(raceId, horses, raceType);
      const simulation = simulateRace(horses, raceType, hash(raceId));
      return {
        id: raceId,
        round: r,
        raceNumber: i + 1,
        raceType,
        horses,
        markets,
        simulation,
        phase: 'betting' as RacePhase,
        liveProgress: 0,
        visibleEvents: [],
      };
    });
  }, [racesPerRound]);

  const [round, setRound] = useState(1);
  const [races, setRaces] = useState<ScheduledRace[]>(() => buildRound(1));
  const [phaseClock, setPhaseClock] = useState({ phase: 'betting' as RacePhase, secondsInto: 0 });

  useEffect(() => {
    const t = window.setInterval(() => {
      setPhaseClock(prev => {
        let { phase, secondsInto } = prev;
        secondsInto++;
        const cap = phase === 'betting' ? BETTING_SECONDS : phase === 'live' ? LIVE_SECONDS : FINISHED_SECONDS;
        if (secondsInto >= cap) {
          if (phase === 'betting') return { phase: 'live', secondsInto: 0 };
          if (phase === 'live')    return { phase: 'finished', secondsInto: 0 };
          setRound(r => { const n = r + 1; setRaces(buildRound(n)); return n; });
          return { phase: 'betting', secondsInto: 0 };
        }
        return { phase, secondsInto };
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [buildRound]);

  useEffect(() => {
    setRaces(prev => prev.map(rc => {
      if (phaseClock.phase === 'betting') return { ...rc, phase: 'betting', liveProgress: 0, visibleEvents: [] };
      if (phaseClock.phase === 'live') {
        const progress = Math.min(1, phaseClock.secondsInto / LIVE_SECONDS);
        const visibleEvents = rc.simulation.events.filter(e => e.minute / 90 <= progress);
        return { ...rc, phase: 'live', liveProgress: progress, visibleEvents };
      }
      return { ...rc, phase: 'finished', liveProgress: 1, visibleEvents: rc.simulation.events };
    }));
  }, [phaseClock]);

  useEffect(() => {
    if (phaseClock.phase !== 'finished' || phaseClock.secondsInto !== 0) return;
    const key = `turf-r-${round}`;
    if (settledRef.current.has(key)) return;
    settledRef.current.add(key);
    const pending: BetSelection[] = slip.openTickets.flatMap(t => t.selections);
    const outcomes: SettlementOutcome[] = [];
    for (const sel of pending) {
      const race = races.find(r => r.id === sel.matchId);
      if (!race) continue;
      outcomes.push({ selectionId: sel.id, result: resolveHorseSelection(sel, race.simulation) });
    }
    if (outcomes.length > 0) slip.settleOutcomes(outcomes);
  }, [phaseClock, round, races, slip]);

  const cap = phaseClock.phase === 'betting' ? BETTING_SECONDS : phaseClock.phase === 'live' ? LIVE_SECONDS : FINISHED_SECONDS;
  const secondsToNextPhase = Math.max(0, cap - phaseClock.secondsInto);
  const nextRoundIn = phaseClock.phase === 'betting'
    ? BETTING_SECONDS - phaseClock.secondsInto + LIVE_SECONDS + FINISHED_SECONDS
    : phaseClock.phase === 'live'
      ? LIVE_SECONDS - phaseClock.secondsInto + FINISHED_SECONDS
      : FINISHED_SECONDS - phaseClock.secondsInto;

  // useMemo to expose teams=null
  void useMemo;
  return { round, phase: phaseClock.phase, secondsToNextPhase, races, nextRoundIn, liveCount: phaseClock.phase === 'live' ? races.length : 0 };
}
