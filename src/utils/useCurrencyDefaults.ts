import { useMemo } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { defaultStakeFor, formatMoney, minBetFor, FIAT } from './currency';

/**
 * Currency-aware betting defaults for casino game pages. Reads the user's
 * primary currency from the wallet and produces sensible defaults so the
 * old hard-coded 0.01 BTC strings can go away.
 */
export function useCurrencyDefaults() {
  const { currency, balance } = useWallet();
  return useMemo(() => {
    const baseDefault = defaultStakeFor(currency);
    const minBet = minBetFor(currency);
    // Initial stake is the larger of the per-currency "nice" default and the
    // platform-wide $0.01 minimum, so the game never starts below the floor.
    const defaultStake = Math.max(baseDefault, minBet);
    const meta = FIAT[currency];
    return {
      currency,
      symbol: meta.symbol,
      decimals: meta.decimals,
      defaultStake,
      defaultStakeString: defaultStake.toFixed(meta.decimals === 0 ? 0 : 2),
      minBet,
      minBetLabel: formatMoney(minBet, currency),
      balance,
      formatAmount: (amount: number) => formatMoney(amount, currency),
      // Sensible quick-stake presets keyed off the per-currency default.
      quickStakes: [1, 5, 25, 100].map(mult => defaultStake * mult),
    };
  }, [currency, balance]);
}
