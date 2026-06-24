import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import type {
  BetSelection, BetTicket, BetMode, OddsFormat,
} from './types';
import {
  calculateMultiOdds, calculatePayout, calculateSystemBet, MAX_ODDS,
} from './oddsEngine';
import { useWallet } from '../../contexts/WalletContext';
import { useAuth } from '../../contexts/AuthContext';
import { minVirtualBetFor } from '../../utils/currency';
import { betsApi, type ApiBet } from '../../api/bets';
import { deriveMatchState } from './matchStateForSelection';

const STORAGE_KEY_TICKETS_BASE = 'vsb.openTickets.v1';
const STORAGE_KEY_FORMAT_BASE = 'vsb.oddsFormat.v1';
const STORAGE_KEY_HISTORY_BASE = 'vsb.history.v1';

function storageKey(base: string, userId?: string | null): string {
  return userId ? `${base}.${userId}` : `${base}.anon`;
}

export type SettlementOutcome = {
  selectionId: string;
  result: 'win' | 'loss' | 'void';
  /** Final score snapshot — captured at settle time so the ticket retains
   *  finished match details even after the season seed rotates (UTC
   *  midnight rollover). */
  finalScore?: { home: number; away: number };
};

/** Per-selection result snapshot attached to a settled ticket. Drives the
 *  history view so each leg can show its own win/loss + final score even
 *  days after the season has moved on. */
export interface TicketSelectionResult {
  selectionId: string;
  result: 'win' | 'loss' | 'void';
  finalScore?: { home: number; away: number };
}

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

  /** Charges the wallet and returns the new ticket. Async because the wallet
   *  call goes to the server. Returns null if auth required or the wallet
   *  rejects (insufficient funds). */
  placeBet: () => Promise<BetTicket | null>;
  cancelTicket: (ticketId: string) => void;
  settleOutcomes: (outcomes: SettlementOutcome[]) => void;

  isSelected: (matchId: string, marketId: string, optionId: string) => boolean;
  hasSelectionFromMarket: (matchId: string, marketId: string) => boolean;
  computedOdds: number;
  potentialPayout: number;
  totalStake: number;
  systemLines: number;
}

const BetSlipContext = createContext<BetSlipContextValue | null>(null);

// Quick-stake presets are now generated per-currency at render time via
// `virtualQuickStakes(currency)`. The legacy BTC tuple stays exported as a
// dev-mode fallback for any caller that didn't migrate yet.
const QUICK_STAKES = [0.001, 0.005, 0.01, 0.05] as const;
export const QUICK_STAKE_PRESETS = QUICK_STAKES;

export function BetSlipProvider({ children }: { children: ReactNode }) {
  // Pull the user's fiat currency so the stake seed and minimum gate
  // automatically respect their localization. The wallet provider sits one
  // level up in the tree (see App.tsx), so this is always defined.
  const wallet = useWallet();
  const { user } = useAuth();
  const initialStake = useMemo(() => minVirtualBetFor(wallet.currency), [wallet.currency]);

  const storageKeyTickets = useMemo(
    () => storageKey(STORAGE_KEY_TICKETS_BASE, user?.id),
    [user?.id],
  );
  const storageKeyHistory = useMemo(
    () => storageKey(STORAGE_KEY_HISTORY_BASE, user?.id),
    [user?.id],
  );
  const storageKeyFormat = useMemo(
    () => storageKey(STORAGE_KEY_FORMAT_BASE, user?.id),
    [user?.id],
  );

  const [selections, setSelections] = useState<BetSelection[]>([]);
  // Every slip is one ticket — all selections must win. Default to 'multi'; 'system' opt-in.
  const [mode, setMode] = useState<BetMode>('multi');
  const [systemK, setSystemK] = useState<number>(2);
  const [stake, setStake] = useState<number>(initialStake);

  // If the user changes currency (rare), bump the stake to that currency's
  // minimum so the slip stays valid. Only do this when the user hasn't typed
  // a stake yet OR the current value is below the new minimum.
  const lastSeenCurrency = useRef(wallet.currency);
  useEffect(() => {
    if (lastSeenCurrency.current === wallet.currency) return;
    lastSeenCurrency.current = wallet.currency;
    const min = minVirtualBetFor(wallet.currency);
    setStake(prev => (prev < min ? min : prev));
  }, [wallet.currency]);
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>(() => loadFormat(storageKeyFormat));
  // Initialise from localStorage for instant display on the same device.
  // A server-sync effect below overwrites this with authoritative data so that
  // tickets placed on any device are visible after login.
  const [openTickets, setOpenTickets] = useState<BetTicket[]>(() => loadTickets(storageKeyTickets));
  const [history, setHistory] = useState<BetTicket[]>(() => loadTickets(storageKeyHistory));

  // Hold the *current* storage key in refs so the save effects always write to
  // the right key without depending on the key in their dep arrays.
  //
  // The bug without refs:
  //   When auth restores (anon → userId), React re-runs ALL effects that depend
  //   on the changed key — SAVE first (writes empty [] to the new key), then
  //   LOAD (reads back []). Saved tickets are destroyed.
  //
  // With refs: save effects only depend on DATA, never on the key.
  // The load effect still depends on the key, so it fires on key change and
  // correctly loads whatever was already saved under the new key.
  const ticketsKeyRef = useRef(storageKeyTickets);
  const historyKeyRef = useRef(storageKeyHistory);
  const formatKeyRef  = useRef(storageKeyFormat);
  ticketsKeyRef.current = storageKeyTickets;
  historyKeyRef.current = storageKeyHistory;
  formatKeyRef.current  = storageKeyFormat;

  // Save effects — depend only on data, use refs for the key.
  useEffect(() => { localStorage.setItem(ticketsKeyRef.current, JSON.stringify(openTickets)); }, [openTickets]);
  useEffect(() => { localStorage.setItem(historyKeyRef.current, JSON.stringify(history.slice(0, 30))); }, [history]);
  useEffect(() => { localStorage.setItem(formatKeyRef.current, oddsFormat); }, [oddsFormat]);

  // Load effect — fires when the storage key changes (auth state restores).
  // By the time this runs, the save effects above have NOT fired for the new
  // key yet (refs updated synchronously, but effects are async), so the data
  // stored under the new key is whatever was previously saved for this user.
  useEffect(() => {
    setOpenTickets(loadTickets(storageKeyTickets));
    setHistory(loadTickets(storageKeyHistory));
    setOddsFormat(loadFormat(storageKeyFormat));
  }, [storageKeyTickets, storageKeyHistory, storageKeyFormat]);

  // Server-sync effect — fires once per login. Fetches the authoritative list
  // of virtual-sports open tickets and history from the server so that bets
  // placed on another device are visible immediately after sign-in. The
  // localStorage snapshot above provides instant display while this loads;
  // the server data replaces it once the fetch resolves. On sign-out we clear
  // both lists rather than leaving the previous user's tickets visible.
  useEffect(() => {
    if (!user) {
      setOpenTickets([]);
      setHistory([]);
      return;
    }
    let cancelled = false;
    async function syncFromServer() {
      try {
        const [pendingResp, histResp] = await Promise.all([
          betsApi.pending(),
          betsApi.history({ limit: 50, gameId: 'virtual_sports' }),
        ]);
        if (cancelled) return;
        setOpenTickets(
          pendingResp.bets
            .filter(b => b.gameId === 'virtual_sports')
            .map(betTicketFromApiBet),
        );
        setHistory(histResp.bets.map(betTicketFromApiBet));
      } catch {
        // Server unreachable — keep the localStorage snapshot already displayed.
      }
    }
    void syncFromServer();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
      const perSelectionStake = stake / Math.max(1, selections.length);
      const totalStake = perSelectionStake * selections.length; // equals original stake
      const payout = selections.reduce((s, sel) => s + calculatePayout(perSelectionStake, sel.odds), 0);
      return { totalStake, potentialPayout: payout, systemLines: selections.length };
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

  /**
   * Charge the user's wallet for `totalStake` and open a virtual-sports
   * ticket. The wallet bet id is stored on the ticket so `settleOutcomes`
   * can later credit (win) or close out (loss) the same bet record. This
   * is what makes virtual-sports wins actually pay out and losses actually
   * cost the user.
   */
  const placeBet = useCallback(async (): Promise<BetTicket | null> => {
    if (selections.length === 0 || stake <= 0) return null;
    if (mode === 'system' && selections.length < 3) return null;

    // One slip = one wallet bet. The wallet's atomic placement does the
    // balance + bonus split; if it returns null, the user is either not
    // signed in (auth modal opens) or short on funds (toast fires).
    const summary = selections.length === 1
      ? `${selections[0].homeTeam} vs ${selections[0].awayTeam} · ${selections[0].optionLabel}`
      : `${selections.length}-leg ${mode}`;
    const walletBet = await wallet.placeBet({
      gameId: 'virtual_sports',
      gameName: 'Virtual Sports',
      stake: totalStake,
      details: summary,
      selections,
      mode,
      systemK: mode === 'system' ? Math.max(2, Math.min(systemK, selections.length)) : undefined,
    });
    if (!walletBet) return null;

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
      walletBetId: walletBet.id,
    };
    setOpenTickets(prev => [ticket, ...prev]);
    setSelections([]);
    return ticket;
  }, [selections, stake, mode, systemK, totalStake, potentialPayout, wallet]);

  const cancelTicket = useCallback((ticketId: string) => {
    // Collect the wallet call args from inside the updater (mirrors the
    // settleOutcomes pattern). Resetting to null at the top of each updater
    // invocation handles React StrictMode double-invocation so that only the
    // final (committed) run's values are used when firing the API call below.
    let cancelledWalletBetId: string | null = null;
    let cancelledTotalStake = 0;

    setOpenTickets(prev => {
      cancelledWalletBetId = null; // reset per invocation
      const t = prev.find(x => x.id === ticketId);
      if (!t) return prev;
      cancelledWalletBetId = t.walletBetId ?? null;
      cancelledTotalStake  = t.totalStake;
      // Move to history as cashout with stake returned
      setHistory(h => [{ ...t, status: 'cashout', settledPayout: t.totalStake, settledAt: Date.now() }, ...h]);
      return prev.filter(x => x.id !== ticketId);
    });

    // Return the stake by settling the wallet bet with won=true, payout=totalStake.
    // This credits the stake back to the user's real balance.
    if (cancelledWalletBetId) {
      void wallet.settleBet(cancelledWalletBetId, {
        won: true,
        payout: cancelledTotalStake,
        details: 'Virtual sports · cashout · ticket cancelled',
      });
    }
  }, [wallet]);

const settleOutcomes = useCallback((outcomes: SettlementOutcome[]) => {
    if (outcomes.length === 0) return;
    const outcomeBySel = new Map(outcomes.map(o => [o.selectionId, o]));

    // Collect wallet settlement work to fire AFTER the state updater.
    // State updater functions must be pure; async side-effects (API calls)
    // must live outside them. toSettle.length = 0 in the updater ensures
    // only the final invocation's tickets are processed (handles StrictMode
    // double-invocation where the first run is discarded).
    const toSettle: Array<{
      walletBetId: string;
      payout: number;
      status: BetTicket['status'];
      count: number;
      selectionResults: BetTicket['selectionResults'];
    }> = [];

    setOpenTickets(prev => {
      toSettle.length = 0; // reset on each invocation so StrictMode re-runs don't double-fire
      const stillOpen: BetTicket[] = [];
      const settled: BetTicket[] = [];
      for (const t of prev) {
        const decisions = t.selections.map(s => outcomeBySel.get(s.id)?.result);
        const anyUnknown = decisions.some(d => d === undefined);
        if (anyUnknown) {
          stillOpen.push(t);
          continue;
        }
        const results = decisions as ('win' | 'loss' | 'void')[];
        // Snapshot per-selection results + final scores on the ticket so the
        // history view stays accurate even after the season seed rotates.
        const selectionResults = t.selections.map(s => {
          const outcome = outcomeBySel.get(s.id);
          return {
            selectionId: s.id,
            result: (outcome?.result ?? 'void') as 'win' | 'loss' | 'void',
            finalScore: outcome?.finalScore,
          };
        });
        const ticket = applyResults({ ...t, selectionResults }, results);
        settled.push(ticket);
        if (ticket.walletBetId) {
          toSettle.push({
            walletBetId: ticket.walletBetId,
            payout: ticket.settledPayout ?? 0,
            status: ticket.status,
            count: ticket.selections.length,
            selectionResults: ticket.selectionResults,
          });
        }
      }
      if (settled.length > 0) {
        setHistory(h => [...settled, ...h].slice(0, 50));
      }
      return stillOpen;
    });

    // Fire wallet API calls after the state updater has completed.
    // A losing ticket settles with payout=0; a winning ticket settles with
    // the computed payout (stake + winnings credited to the real balance).
    for (const s of toSettle) {
      const won = s.payout > 0;
      console.log('[BetSlipContext] Settling ticket:', {
        walletBetId: s.walletBetId,
        status: s.status,
        selectionsCount: s.count,
        settledPayout: s.payout,
        won,
      });
      void wallet.settleBet(s.walletBetId, {
        won,
        payout: s.payout,
        details: `Virtual sports · ${s.status} · ${s.count} pick${s.count === 1 ? '' : 's'}`,
        selectionResults: s.selectionResults,
      });
    }
  }, [wallet]);

  // ── Global auto-settler ────────────────────────────────────────────────
  // Settlement must not depend on the user sitting on a league's sportsbook
  // page. This runs app-wide: for every open ticket whose matches have ALL
  // Deterministic settlement on a timer: every 5s, check if any open tickets
  // have all their matches finished. If all legs are done, settle the ticket.
  // If a ticket's matches can't be resolved (bad ID, game deleted, etc.), void
  // it after 3+ minutes to prevent them hanging indefinitely in the UI.
  useEffect(() => {
    if (openTickets.length === 0) return;
    const run = () => {
      const outcomes: SettlementOutcome[] = [];
      const voidTickets: string[] = [];
      const now = Date.now();

      for (const t of openTickets) {
        const states = t.selections.map(s => ({ s, st: deriveMatchState(s) }));

        // Check if any match state is unresolvable (null) — sign of a stale/deleted fixture
        const hasUnresolvable = states.some(x => x.st == null);
        const ageMs = now - (t.placedAt ?? now);
        if (hasUnresolvable && ageMs > 3 * 60 * 1000) {
          // Ticket is >3 min old and has unresolvable matches → void it
          voidTickets.push(t.id);
          for (const { s } of states) {
            outcomes.push({ selectionId: s.id, result: 'void', finalScore: undefined });
          }
          continue;
        }

        // Only settle once every leg has finished (multi-leg tickets need all).
        if (states.length > 0 && states.every(x => x.st != null && x.st.phase === 'finished')) {
          for (const { s, st } of states) {
            outcomes.push({ selectionId: s.id, result: st!.finalResult, finalScore: st!.finalScore });
          }
        }
      }
      if (outcomes.length > 0) settleOutcomes(outcomes);
    };
    run();
    const id = window.setInterval(run, 5000);
    return () => window.clearInterval(id);
  }, [openTickets, settleOutcomes]);

  const value: BetSlipContextValue = {
    selections, mode, systemK, stake, oddsFormat, openTickets, history,
    addSelection, removeSelection, clearSlip,
    setMode, setSystemK, setStake, setOddsFormat,
    placeBet, cancelTicket, settleOutcomes,
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
    const perSelectionStake = t.stake / Math.max(1, t.selections.length);
    let payout = 0;
    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r === 'win') payout += calculatePayout(perSelectionStake, t.selections[i].odds);
        else if (r === 'void') payout += perSelectionStake;
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
    // void selections collapse to 1.0 in the parlay; cap at MAX_ODDS so the
    // settled payout matches what was shown as potential payout in the slip.
    const rawOdds = t.selections.reduce((p, sel, i) => p * (results[i] === 'void' ? 1 : sel.odds), 1);
    const odds = Math.min(MAX_ODDS, rawOdds);
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

// ─── Server → BetTicket reconstruction ──────────────────────────────────────

/** C(n, k) without factorial overflow — used to recover per-combo stake for
 *  system bets loaded from the server (where only the total stake is stored). */
function combinationCount(n: number, k: number): number {
  if (k <= 0 || k > n) return 0;
  let num = 1, den = 1;
  for (let i = 0; i < k; i++) { num *= (n - i); den *= (i + 1); }
  return Math.round(num / den);
}

/**
 * Convert a server `ApiBet` record back into a `BetTicket` that the bet-slip
 * UI can render. The server stores `selections`, `mode`, and `systemK` when
 * a virtual-sports bet is placed, so everything needed to display and settle
 * the ticket is available without any client-side state.
 */
function betTicketFromApiBet(b: ApiBet): BetTicket {
  const sels  = Array.isArray(b.selections) ? (b.selections as BetSelection[]) : [];
  const mode  = (b.mode as BetMode | undefined) ?? 'multi';
  const k     = b.systemK ?? 2;
  const totalStake = b.stake;

  // For system bets, `b.stake` is the TOTAL charged amount (per-combo × combos).
  // `applyResults` needs the per-combo stake, so we recover it here.
  const numCombos    = mode === 'system' ? combinationCount(sels.length, k) : 1;
  const perComboStake = mode === 'system' && numCombos > 0
    ? totalStake / numCombos
    : totalStake;

  // Recompute the potential payout from stored selections/mode.
  let potentialPayout = 0;
  if (sels.length > 0) {
    if (mode === 'single') {
      const perSel = totalStake / Math.max(1, sels.length);
      potentialPayout = sels.reduce((s, sel) => s + calculatePayout(perSel, sel.odds), 0);
    } else if (mode === 'multi') {
      potentialPayout = calculatePayout(totalStake, calculateMultiOdds(sels));
    } else {
      potentialPayout = calculateSystemBet(sels, k, perComboStake).maxPayout;
    }
  }

  const status: BetTicket['status'] =
    b.status === 'cashout' ? 'cashout' :
    b.status === 'won'     ? 'won'     :
    b.status === 'lost'    ? 'lost'    :
    b.status === 'push'    ? 'won'     :   // push → treat as won (payout > 0)
    'pending';

  return {
    id:              b._id,
    walletBetId:     b._id,
    mode,
    selections:      sels,
    stake:           perComboStake,   // per-combo for system; equals totalStake for single/multi
    totalStake,
    systemK:         mode === 'system' ? k : undefined,
    placedAt:        new Date(b.placedAt).getTime(),
    status,
    potentialPayout,
    settledPayout:   b.status !== 'pending' ? b.payout : undefined,
    settledAt:       b.settledAt ? new Date(b.settledAt).getTime() : undefined,
    selectionResults: b.selectionResults as BetTicket['selectionResults'],
  };
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

function loadFormat(key: string): OddsFormat {
  try {
    const v = localStorage.getItem(key);
    if (v === 'decimal' || v === 'fractional' || v === 'american') return v;
  } catch {}
  return 'decimal';
}
