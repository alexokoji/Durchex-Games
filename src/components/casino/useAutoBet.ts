import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared auto-bet runtime. Each casino game wires its own `runOneBet`
 * function (place + wait for resolve + return outcome) and the hook drives
 * the loop, applying stake progression and stop conditions between rounds.
 *
 * Progression model is the classic four-knob set:
 *   • Total bets (0 = infinite, stop manually)
 *   • Stop on cumulative profit  (≥ threshold → halt)
 *   • Stop on cumulative loss    (≥ threshold → halt)
 *   • On win:  reset stake OR increase by N%
 *   • On loss: reset stake OR increase by N% (martingale / Fibonacci-lite)
 */

export type Progression = 'reset' | 'increase';

export interface AutoConfig {
  /** 0 = run until manually stopped. */
  totalBets: number;
  /** Cumulative profit limit, in the game's currency. 0 = no cap. */
  stopOnProfit: number;
  /** Cumulative loss limit, in the game's currency. 0 = no cap. */
  stopOnLoss: number;
  onWin: Progression;
  onWinPct: number;        // applied when onWin === 'increase'
  onLoss: Progression;
  onLossPct: number;       // applied when onLoss === 'increase'
}

export interface AutoBetState {
  isRunning: boolean;
  betsDone: number;
  betsRemaining: number;
  cumulativeProfit: number;
  currentStake: number;
  /** Reason we stopped on the most recent run, for UI hints. */
  lastStopReason: 'manual' | 'limit' | 'profit_cap' | 'loss_cap' | 'error' | null;
}

export interface UseAutoBetResult extends AutoBetState {
  start: (cfg: AutoConfig) => void;
  stop: (reason?: AutoBetState['lastStopReason']) => void;
}

interface UseAutoBetArgs {
  /** Place one bet and return its outcome once resolved. */
  runOneBet: (stake: number) => Promise<{ won: boolean; profit: number } | null>;
  /** Initial stake at the start of an auto run. */
  baseStake: number;
  /** Push the next stake to the game's bet panel (so the UI reflects it). */
  setStake: (next: number) => void;
  /** Min/max stake clamps. */
  minStake?: number;
  maxStake?: number;
}

export function useAutoBet({ runOneBet, baseStake, setStake, minStake = 0.01, maxStake = Infinity }: UseAutoBetArgs): UseAutoBetResult {
  const [state, setState] = useState<AutoBetState>({
    isRunning: false,
    betsDone: 0,
    betsRemaining: 0,
    cumulativeProfit: 0,
    currentStake: baseStake,
    lastStopReason: null,
  });

  // Refs so the loop can read latest config + abort flag without re-binding.
  const cfgRef    = useRef<AutoConfig | null>(null);
  const abortRef  = useRef(false);
  const baseRef   = useRef(baseStake);
  useEffect(() => { baseRef.current = baseStake; }, [baseStake]);

  const stop = useCallback((reason: AutoBetState['lastStopReason'] = 'manual') => {
    abortRef.current = true;
    setState(s => ({ ...s, isRunning: false, lastStopReason: reason ?? s.lastStopReason }));
  }, []);

  const start = useCallback((cfg: AutoConfig) => {
    cfgRef.current = cfg;
    abortRef.current = false;
    setState({
      isRunning: true,
      betsDone: 0,
      betsRemaining: cfg.totalBets,
      cumulativeProfit: 0,
      currentStake: baseRef.current,
      lastStopReason: null,
    });

    void (async () => {
      let stake = baseRef.current;
      let profitAccum = 0;
      let done = 0;
      const limit = cfg.totalBets || Number.MAX_SAFE_INTEGER;

      while (done < limit) {
        if (abortRef.current) { stop('manual'); return; }

        // Stop conditions BEFORE placing the next bet, so the user can't
        // overshoot their threshold by one round.
        if (cfg.stopOnProfit > 0 && profitAccum >= cfg.stopOnProfit) { stop('profit_cap'); return; }
        if (cfg.stopOnLoss   > 0 && profitAccum <= -cfg.stopOnLoss)  { stop('loss_cap');   return; }

        // Clamp the next stake and push it to the bet panel so the player
        // sees what's about to happen.
        const next = Math.max(minStake, Math.min(maxStake, stake));
        setStake(next);
        setState(s => ({ ...s, currentStake: next }));

        let result: { won: boolean; profit: number } | null = null;
        try {
          result = await runOneBet(next);
        } catch (err) {
          console.error('[autobet] bet errored', err);
          stop('error');
          return;
        }
        // Game refused the bet (e.g., insufficient balance) → bail.
        if (!result) { stop('error'); return; }

        done++;
        profitAccum += result.profit;
        setState(s => ({
          ...s,
          betsDone: done,
          betsRemaining: cfg.totalBets ? Math.max(0, cfg.totalBets - done) : 0,
          cumulativeProfit: profitAccum,
        }));

        // Apply progression.
        const pct = result.won ? cfg.onWinPct : cfg.onLossPct;
        const mode = result.won ? cfg.onWin : cfg.onLoss;
        if (mode === 'reset') stake = baseRef.current;
        else stake = next * (1 + pct / 100);
      }

      stop('limit');
    })();
  }, [runOneBet, setStake, stop, minStake, maxStake]);

  // Abort the loop on unmount.
  useEffect(() => () => { abortRef.current = true; }, []);

  return { ...state, start, stop };
}
