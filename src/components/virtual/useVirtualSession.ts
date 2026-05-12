import { useEffect, useMemo, useRef, useState } from 'react';

export type SessionPhase = 'betting' | 'live' | 'result';

export interface SessionTiming {
  betting: number;
  live: number;
  result: number;
}

export interface VirtualSessionState {
  sessionId: number;
  phase: SessionPhase;
  phaseElapsed: number;
  phaseRemaining: number;
  phaseDuration: number;
  totalElapsed: number;
  sessionDuration: number;
  liveProgress: number;
  bettingOpen: boolean;
  startedAt: number;
}

interface UseVirtualSessionOptions {
  timing: SessionTiming;
  onSessionStart?: (sessionId: number) => void;
  onPhaseChange?: (phase: SessionPhase, sessionId: number) => void;
  onSessionEnd?: (sessionId: number) => void;
}

export function useVirtualSession({
  timing, onSessionStart, onPhaseChange, onSessionEnd,
}: UseVirtualSessionOptions): VirtualSessionState {
  const sessionDuration = timing.betting + timing.live + timing.result;
  const [now, setNow] = useState(() => Date.now());
  const startRef = useRef(Date.now());
  const sessionIdRef = useRef(1);
  const lastPhaseRef = useRef<SessionPhase>('betting');

  useEffect(() => {
    onSessionStart?.(sessionIdRef.current);
    onPhaseChange?.('betting', sessionIdRef.current);
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const elapsedMs = now - startRef.current;
  const totalElapsed = Math.min(sessionDuration, elapsedMs / 1000);

  let phase: SessionPhase;
  let phaseElapsed: number;
  let phaseDuration: number;

  if (totalElapsed < timing.betting) {
    phase = 'betting';
    phaseElapsed = totalElapsed;
    phaseDuration = timing.betting;
  } else if (totalElapsed < timing.betting + timing.live) {
    phase = 'live';
    phaseElapsed = totalElapsed - timing.betting;
    phaseDuration = timing.live;
  } else {
    phase = 'result';
    phaseElapsed = totalElapsed - timing.betting - timing.live;
    phaseDuration = timing.result;
  }

  const phaseRemaining = Math.max(0, phaseDuration - phaseElapsed);
  const liveProgress = phase === 'live'
    ? Math.min(1, phaseElapsed / phaseDuration)
    : phase === 'result' ? 1 : 0;

  useEffect(() => {
    if (lastPhaseRef.current !== phase) {
      lastPhaseRef.current = phase;
      onPhaseChange?.(phase, sessionIdRef.current);
    }
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (elapsedMs >= sessionDuration * 1000) {
      onSessionEnd?.(sessionIdRef.current);
      sessionIdRef.current += 1;
      startRef.current = Date.now();
      lastPhaseRef.current = 'betting';
      onSessionStart?.(sessionIdRef.current);
      onPhaseChange?.('betting', sessionIdRef.current);
    }
  }, [elapsedMs, sessionDuration, onSessionEnd, onSessionStart, onPhaseChange]);

  return useMemo(() => ({
    sessionId: sessionIdRef.current,
    phase,
    phaseElapsed,
    phaseRemaining,
    phaseDuration,
    totalElapsed,
    sessionDuration,
    liveProgress,
    bettingOpen: phase === 'betting',
    startedAt: startRef.current,
  }), [phase, phaseElapsed, phaseRemaining, phaseDuration, totalElapsed, sessionDuration, liveProgress]);
}

export function formatCountdown(seconds: number): string {
  const total = Math.ceil(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
