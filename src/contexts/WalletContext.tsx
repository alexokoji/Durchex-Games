import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { walletApi, type ApiTransaction } from '../api/wallet';
import { betsApi, type ApiBet } from '../api/bets';
import { paymentsApi, type DepositInitBody, type WithdrawBody } from '../api/payments';
import { ApiError } from '../api/client';
import { getChatSocket } from '../api/chat';
import type { FiatCurrency, CryptoCurrency, AnyCurrency } from '../utils/currency';
import { minBetFor, formatMoney, usdApprox } from '../utils/currency';
import { useToasts } from './ToastContext';
import { useNotifications } from './NotificationContext';

export type BetResult = 'win' | 'loss' | 'push' | 'pending';

export interface BetRecord {
  id: string;
  gameId: string;
  gameName: string;
  stake: number;
  payout: number;
  multiplier?: number;
  currency: AnyCurrency;
  result: BetResult;
  placedAt: number;
  settledAt?: number;
  details?: string;
}

export interface TxRecord {
  id: string;
  kind: ApiTransaction['kind'];
  amount: number;
  currency: AnyCurrency;
  method: string;
  status: ApiTransaction['status'];
  at: number;
}

interface WalletContextValue {
  currency: FiatCurrency;
  balance: number;
  bonusBalance: number;
  bonusRollover: number;
  cryptoBalances: Partial<Record<CryptoCurrency, number>>;

  history: BetRecord[];
  pendingBets: BetRecord[];
  transactions: TxRecord[];
  isLoading: boolean;
  lastError: string | null;

  placeBet: (args: { gameId: string; gameName: string; stake: number; details?: string; selections?: unknown; mode?: 'single' | 'multi' | 'system'; systemK?: number }) =>
    Promise<BetRecord | null>;
  settleBet: (betId: string, opts: { won: boolean; payout?: number; multiplier?: number; details?: string }) =>
    Promise<void>;
  cancelBet: (betId: string) => void;

  initDeposit: (body: DepositInitBody) => Promise<{ paymentLink: string; reference: string } | null>;
  requestWithdrawal: (body: WithdrawBody) => Promise<boolean>;
  refresh: () => Promise<void>;

  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function toBetRecord(b: ApiBet): BetRecord {
  let result: BetResult = 'pending';
  if (b.status === 'won' || b.status === 'cashout') result = 'win';
  else if (b.status === 'lost') result = 'loss';
  else if (b.status === 'push') result = 'push';
  return {
    id: b._id, gameId: b.gameId, gameName: b.gameName,
    stake: b.stake, payout: b.payout, multiplier: b.multiplier,
    currency: b.currency, result,
    placedAt:  new Date(b.placedAt).getTime(),
    settledAt: b.settledAt ? new Date(b.settledAt).getTime() : undefined,
    details: b.details,
  };
}
function toTxRecord(t: ApiTransaction): TxRecord {
  return {
    id: t._id, kind: t.kind,
    amount: t.amount, currency: t.currency,
    method: t.method, status: t.status,
    at: new Date(t.completedAt ?? t.createdAt).getTime(),
  };
}

const FRIENDLY_ERRORS: Record<string, string> = {
  insufficient_funds: "You don't have enough balance for that bet.",
  currency_mismatch:  'Your wallet currency changed — refresh and try again.',
  currency_not_supported_by_flutterwave: "Flutterwave doesn't support your currency yet — try a crypto deposit.",
  rollover_outstanding: 'Your bonus rollover requirement is still outstanding. Wager the remaining amount before withdrawing.',
  validation_error:   'Some of those details look wrong.',
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, requireAuth } = useAuth();
  const toasts = useToasts();
  const notif  = useNotifications();

  const [currency, setCurrency] = useState<FiatCurrency>(user?.currency ?? 'USD');
  const [balance,  setBalance]  = useState(0);
  const [bonusBalance,  setBonusBalance]  = useState(0);
  const [bonusRollover, setBonusRollover] = useState(0);
  const [cryptoBalances, setCryptoBalances] = useState<Partial<Record<CryptoCurrency, number>>>({});
  const [history, setHistory] = useState<BetRecord[]>([]);
  const [pendingBets, setPendingBets] = useState<BetRecord[]>([]);
  const [transactions, setTransactions] = useState<TxRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [snap, hist, pend, txs] = await Promise.all([
        walletApi.get(),
        betsApi.history({ limit: 100 }),
        betsApi.pending(),
        walletApi.transactions(50),
      ]);
      setCurrency(snap.currency);
      setBalance(snap.balance);
      setBonusBalance(snap.bonusBalance ?? 0);
      setBonusRollover(snap.bonusRollover ?? 0);
      setCryptoBalances(snap.cryptoBalances ?? {});
      setHistory(hist.bets.map(toBetRecord));
      setPendingBets(pend.bets.map(toBetRecord));
      setTransactions(txs.transactions.map(toTxRecord));
    } catch (err) {
      setLastError(err instanceof ApiError ? err.code : 'wallet_refresh_failed');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setBalance(0); setBonusBalance(0); setBonusRollover(0); setCryptoBalances({});
      setHistory([]); setPendingBets([]); setTransactions([]);
      return;
    }
    void refresh();
  }, [isAuthenticated, refresh]);

  // Subscribe to live wallet events. The backend pushes 'notification' on
  // the user's room when balance changes or a bet settles.
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getChatSocket();
    function onNotification(n: { kind: string; title: string; body?: string }) {
      // Anything wallet-relevant → refetch.
      if (n.kind === 'wallet:update' ||
          n.kind === 'deposit:completed' ||
          n.kind === 'withdraw:completed' ||
          n.kind === 'bet:settled') {
        void refresh();
      }
      notif.push({
        kind: n.kind as never,
        title: n.title,
        body:  n.body,
      });
      if (n.kind === 'deposit:completed') toasts.success(n.title, n.body);
      if (n.kind === 'deposit:failed')    toasts.error(n.title,   n.body);
      if (n.kind === 'withdraw:queued')   toasts.info(n.title,    n.body);
      if (n.kind === 'withdraw:failed')   toasts.error(n.title,   n.body);
    }
    socket.on('notification', onNotification);
    return () => { socket.off('notification', onNotification); };
  }, [isAuthenticated, refresh, toasts, notif]);

  // Light polling fallback in case the socket misses something.
  useEffect(() => {
    if (!isAuthenticated) return;
    const t = window.setInterval(() => { void refresh(); }, 30_000);
    return () => window.clearInterval(t);
  }, [isAuthenticated, refresh]);

  const placeBet = useCallback<WalletContextValue['placeBet']>(async ({ gameId, gameName, stake, details, selections, mode, systemK }) => {
    if (!isAuthenticated) { requireAuth(); return null; }
    const minBet = minBetFor(currency);
    if (stake + 1e-9 < minBet) {
      toasts.warning(
        'Bet too small',
        `Minimum bet is ${formatMoney(minBet, currency)} (≈ $0.01).`,
      );
      return null;
    }
    const spendable = balance + bonusBalance;
    if (stake > spendable + 1e-9) {
      toasts.error('Insufficient balance', `You only have ${formatMoney(spendable, currency)} available (incl. bonus). Top up to keep playing.`);
      return null;
    }
    setLastError(null);
    try {
      const { bet, balance: newBalance, bonusBalance: newBonus } = await betsApi.place({ gameId, gameName, stake, details, selections, mode, systemK });
      const rec = toBetRecord(bet);
      setPendingBets(prev => [rec, ...prev]);
      setBalance(newBalance);
      if (typeof newBonus === 'number') setBonusBalance(newBonus);
      return rec;
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'place_bet_failed';
      setLastError(code);
      toasts.error(
        code === 'insufficient_funds' ? 'Insufficient balance' : 'Could not place bet',
        FRIENDLY_ERRORS[code] ?? code,
      );
      return null;
    }
  }, [isAuthenticated, requireAuth, balance, bonusBalance, currency, toasts]);

  const settleBet = useCallback<WalletContextValue['settleBet']>(async (betId, { won, payout, details }) => {
    setLastError(null);
    const stake = pendingBets.find(b => b.id === betId)?.stake ?? 0;
    // Use payout as-is if provided (already calculated from odds).
    // Multiplier is not applied here to avoid double multiplication.
    const resolvedPayout = payout != null ? payout : won ? stake : 0;
    console.log('[WalletContext.settleBet] Settlement:', {
      betId,
      stake,
      payout,
      won,
      resolvedPayout,
    });
    try {
      const { bet, balance: newBalance } = await betsApi.settle(betId, {
        won,
        payout: Math.max(0, resolvedPayout),
        details,
      });
      console.log('[WalletContext.settleBet] Settlement result:', {
        betId,
        dbPayout: bet.payout,
        newBalance,
      });
      setBalance(newBalance);
      // Update pending and history
      setPendingBets(prev => prev.filter(b => b.id !== betId));
      const rec = toBetRecord(bet);
      setHistory(prev => [rec, ...prev].slice(0, 200));
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'settle_bet_failed';
      setLastError(code);
      // If the server scheduler already settled this bet before the client
      // call landed, the balance was credited on the server but the client
      // never received the updated value (the error path skips setBalance).
      // Refresh so the UI reflects the correct post-settlement balance.
      if (code === 'bet_already_settled') void refresh();
    }
  }, [pendingBets, refresh]);

  const cancelBet = useCallback<WalletContextValue['cancelBet']>((betId) => {
    setPendingBets(prev => prev.filter(b => b.id !== betId));
  }, []);

  const initDeposit = useCallback<WalletContextValue['initDeposit']>(async (body) => {
    if (!isAuthenticated) { requireAuth(); return null; }
    try { return await paymentsApi.depositInit(body); }
    catch (err) {
      const code = err instanceof ApiError ? err.code : 'deposit_init_failed';
      setLastError(code);
      toasts.error('Deposit failed', FRIENDLY_ERRORS[code] ?? code);
      return null;
    }
  }, [isAuthenticated, requireAuth, toasts]);

  const requestWithdrawal = useCallback<WalletContextValue['requestWithdrawal']>(async (body) => {
    if (!isAuthenticated) { requireAuth(); return false; }
    try {
      await paymentsApi.withdraw(body);
      await refresh();
      return true;
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'withdraw_failed';
      let message = FRIENDLY_ERRORS[code] ?? code;
      if (err instanceof ApiError && code === 'rollover_outstanding' && err.details && typeof err.details === 'object' && 'rollover' in err.details) {
        const rolloverRequired = Number((err.details as { rollover?: number }).rollover ?? 0);
        if (Number.isFinite(rolloverRequired) && rolloverRequired > 0) {
          message = `${message} Remaining rollover: ${formatMoney(rolloverRequired, currency)}${currency !== 'USD' ? ` (${usdApprox(rolloverRequired, currency)})` : ''}.`;
        }
      }
      setLastError(code);
      toasts.error('Withdrawal failed', message);
      return false;
    }
  }, [isAuthenticated, requireAuth, refresh, toasts, currency]);

  const { totalWagered, totalWon, totalLost, netProfit } = useMemo(() => {
    let wagered = 0, won = 0, lost = 0;
    for (const b of history) {
      wagered += b.stake;
      if (b.result === 'win') won += Math.max(0, b.payout - b.stake);
      else if (b.result === 'loss') lost += b.stake;
    }
    return { totalWagered: wagered, totalWon: won, totalLost: lost, netProfit: won - lost };
  }, [history]);

  return (
    <WalletContext.Provider value={{
      currency, balance, bonusBalance, bonusRollover, cryptoBalances,
      history, pendingBets, transactions,
      isLoading, lastError,
      placeBet, settleBet, cancelBet,
      initDeposit, requestWithdrawal, refresh,
      totalWagered, totalWon, totalLost, netProfit,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
