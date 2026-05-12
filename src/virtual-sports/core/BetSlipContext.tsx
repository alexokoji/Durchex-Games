import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import type {
  BetSelection, BetTicket, BetMode, OddsFormat,
} from './types';
import {
  calculateMultiOdds, calculatePayout, calculateSystemBet,
} from './oddsEngine';

const STORAGE_KEY_TICKETS = 'vsb.openTickets.v1';
const STORAGE_KEY_FORMAT = 'vsb.oddsFormat.v1';
const STORAGE_KEY_HISTORY = 'vsb.history.v1';

export type SettlementOutcome = {
  selectionId: string;
  result: 'win' | 'loss' | 'void';
};

export interface BetSlipContextValue {
  selections: BetSelection[];
  mode: BetMode;
  systemK: number;
  stake: number;
  oddsFormat: OddsFormat;
  openTickets: BetTicket[];
  history: BetTicket[];

  addSelection: (sel: BetSelection) => void;
  removeSelection: (id: string) => void;
  clearSlip: () => void;
  setMode: (m: BetMode) => void;
  setSystemK: (k: number) => void;
  setStake: (s: number) => void;
  setOddsFormat: (f: OddsFormat) => void;

  placeBet: () => BetTicket | null;
  cancelTicket: (ticketId: string) => void;
  cashout: (ticketId: string) => void;
  settleOutcomes: (outcomes: SettlementOutcome[]) => void;

  isSelected: (matchId: string, marketId: string, optionId: string) => boolean;
  hasSelectionFromMarket: (matchId: string, marketId: string) => boolean;
  computedOdds: number;
  potentialPayout: number;
  totalStake: number;
  systemLines: number;
}

const BetSlipContext = createContext<BetSlipContextValue | null>(null);

const QUICK_STAKES = [0.001, 0.005, 0.01, 0.05] as const;
export const QUICK_STAKE_PRESETS = QUICK_STAKES;

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  // Every slip is one ticket — all selections must win. Default to 'multi'; 'system' opt-in.
  const [mode, setMode] = useState<BetMode>('multi');
  const [systemK, setSystemK] = useState<number>(2);
  const [stake, setStake] = useState<number>(0.01);
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>(() => loadFormat());
  const [openTickets, setOpenTickets] = useState<BetTicket[]>(() => loadTickets(STORAGE_KEY_TICKETS));
  const [history, setHistory] = useState<BetTicket[]>(() => loadTickets(STORAGE_KEY_HISTORY));

  useEffect(() => { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(openTickets)); }, [openTickets]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 30))); }, [history]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_FORMAT, oddsFormat); }, [oddsFormat]);

  const addSelection = useCallback((sel: BetSelection) => {
    setSelections(prev => {
      const sameMarket = prev.findIndex(s => s.matchId === sel.matchId && s.marketId === sel.marketId);
      if (sameMarket >= 0) {
        // toggle off if same option, else replace
        if (prev[sameMarket].optionId === sel.optionId) {
          return prev.filter((_, i) => i !== sameMarket);
        }
        const next = [...prev];
        next[sameMarket] = sel;
        return next;
      }
      return [...prev, sel];
    });
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections(prev => prev.filter(s => s.id !== id));
  }, []);

  const clearSlip = useCallback(() => setSelections([]), []);

  const isSelected = useCallback((matchId: string, marketId: string, optionId: string) => {
    return selections.some(s => s.matchId === matchId && s.marketId === marketId && s.optionId === optionId);
  }, [selections]);

  const hasSelectionFromMarket = useCallback((matchId: string, marketId: string) => {
    return selections.some(s => s.matchId === matchId && s.marketId === marketId);
  }, [selections]);

  // Derived betting math
  const computedOdds = useMemo(() => {
    if (selections.length === 0) return 0;
    if (mode === 'single') return selections[0].odds;
    if (mode === 'multi') return calculateMultiOdds(selections);
    return 0; // system handled differently
  }, [mode, selections]);

  const { totalStake, potentialPayout, systemLines } = useMemo(() => {
    if (selections.length === 0) return { totalStake: 0, potentialPayout: 0, systemLines: 0 };
    if (mode === 'single') {
      const t = stake * selections.length;
      const payout = selections.reduce((s, sel) => s + calculatePayout(stake, sel.odds), 0);
      return { totalStake: t, potentialPayout: payout, systemLines: selections.length };
    }
    if (mode === 'multi') {
      return {
        totalStake: stake,
        potentialPayout: calculatePayout(stake, computedOdds),
        systemLines: 1,
      };
    }
    // system
    const k = Math.max(2, Math.min(systemK, selections.length));
    const sys = calculateSystemBet(selections, k, stake);
    return { totalStake: sys.totalStake, potentialPayout: sys.maxPayout, systemLines: sys.lines };
  }, [mode, selections, stake, systemK, computedOdds]);

  const placeBet = useCallback((): BetTicket | null => {
    if (selections.length === 0 || stake <= 0) return null;
    if (mode === 'system' && selections.length < 3) return null;

    const ticket: BetTicket = {
      id: `tk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mode,
      selections: [...selections],
      stake,
      totalStake,
      systemK: mode === 'system' ? Math.max(2, Math.min(systemK, selections.length)) : undefined,
      placedAt: Date.now(),
      status: 'pending',
      potentialPayout,
    };
    setOpenTickets(prev => [ticket, ...prev]);
    setSelections([]);
    return ticket;
  }, [selections, stake, mode, systemK, totalStake, potentialPayout]);

  const cancelTicket = useCallback((ticketId: string) => {
    setOpenTickets(prev => {
      const t = prev.find(x => x.id === ticketId);
      if (!t) return prev;
      // Move to history as void
      setHistory(h => [{ ...t, status: 'cashout', settledPayout: t.totalStake, settledAt: Date.now() }, ...h]);
      return prev.filter(x => x.id !== ticketId);
    });
  }, []);

  const cashout = useCallback((ticketId: string) => {
    setOpenTickets(prev => {
      const t = prev.find(x => x.id === ticketId);
      if (!t) return prev;
      // 80% of current potential payout — typical cashout discount.
      const payout = Math.max(t.totalStake * 0.5, t.potentialPayout * 0.8);
      setHistory(h => [{ ...t, status: 'cashout', settledPayout: payout, settledAt: Date.now() }, ...h]);
      return prev.filter(x => x.id !== ticketId);
    });
  }, []);

  const settleOutcomes = useCallback((outcomes: SettlementOutcome[]) => {
    if (outcomes.length === 0) return;
    const map = new Map(outcomes.map(o => [o.selectionId, o.result]));
    setOpenTickets(prev => {
      const stillOpen: BetTicket[] = [];
      const settled: BetTicket[] = [];
      for (const t of prev) {
        const decisions = t.selections.map(s => map.get(s.id));
        const anyUnknown = decisions.some(d => d === undefined);
        if (anyUnknown) {
          stillOpen.push(t);
          continue;
        }
        const results = decisions as ('win' | 'loss' | 'void')[];
        const ticket = applyResults(t, results);
        settled.push(ticket);
      }
      if (settled.length > 0) {
        setHistory(h => [...settled, ...h].slice(0, 50));
      }
      return stillOpen;
    });
  }, []);

  const value: BetSlipContextValue = {
    selections, mode, systemK, stake, oddsFormat, openTickets, history,
    addSelection, removeSelection, clearSlip,
    setMode, setSystemK, setStake, setOddsFormat,
    placeBet, cancelTicket, cashout, settleOutcomes,
    isSelected, hasSelectionFromMarket,
    computedOdds, potentialPayout, totalStake, systemLines,
  };

  return <BetSlipContext.Provider value={value}>{children}</BetSlipContext.Provider>;
}

export function useBetSlip(): BetSlipContextValue {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip must be used inside <BetSlipProvider>');
  return ctx;
}

function applyResults(t: BetTicket, results: ('win' | 'loss' | 'void')[]): BetTicket {
  if (t.mode === 'single') {
    let payout = 0;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r === 'win')  payout += calculatePayout(t.stake, t.selections[i].odds);
      else if (r === 'void') payout += t.stake;
    }
    const allWon = results.every(r => r === 'win');
    const allLost = results.every(r => r === 'loss');
    return {
      ...t,
      status: allWon ? 'won' : allLost ? 'lost' : 'partial',
      settledPayout: payout,
      settledAt: Date.now(),
    };
  }
  if (t.mode === 'multi') {
    if (results.some(r => r === 'loss')) {
      return { ...t, status: 'lost', settledPayout: 0, settledAt: Date.now() };
    }
    // void selections collapse to 1.0 in the parlay
    const odds = t.selections.reduce((p, sel, i) => p * (results[i] === 'void' ? 1 : sel.odds), 1);
    return { ...t, status: 'won', settledPayout: t.stake * odds, settledAt: Date.now() };
  }
  // system
  const k = t.systemK ?? 2;
  const n = t.selections.length;
  const winningCombos = combinations(n, k).filter(combo =>
    combo.every(i => results[i] === 'win'),
  );
  if (winningCombos.length === 0) {
    return { ...t, status: 'lost', settledPayout: 0, settledAt: Date.now() };
  }
  const payout = winningCombos.reduce((sum, combo) => {
    const oddsProduct = combo.reduce((p, i) => p * t.selections[i].odds, 1);
    return sum + t.stake * oddsProduct;
  }, 0);
  const fullWin = winningCombos.length === combinations(n, k).length;
  return {
    ...t,
    status: fullWin ? 'won' : 'partial',
    settledPayout: payout,
    settledAt: Date.now(),
  };
}

function combinations(n: number, k: number): number[][] {
  if (k <= 0 || k > n) return [];
  const out: number[][] = [];
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    out.push([...idx]);
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return out;
}

function loadTickets(key: string): BetTicket[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function loadFormat(): OddsFormat {
  try {
    const v = localStorage.getItem(STORAGE_KEY_FORMAT);
    if (v === 'decimal' || v === 'fractional' || v === 'american') return v;
  } catch {}
  return 'decimal';
}
