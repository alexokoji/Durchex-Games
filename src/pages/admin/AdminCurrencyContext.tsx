import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { AnyCurrency, convert, formatMoney } from '../../utils/currency';

export type AdminDisplayCurrency = 'NGN' | 'USD';

interface AdminCurrencyContextValue {
  displayCurrency: AdminDisplayCurrency;
  setDisplayCurrency: Dispatch<SetStateAction<AdminDisplayCurrency>>;
}

const AdminCurrencyContext = createContext<AdminCurrencyContextValue | null>(null);

export function AdminCurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrency] = useState<AdminDisplayCurrency>('NGN');
  return (
    <AdminCurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency }}>
      {children}
    </AdminCurrencyContext.Provider>
  );
}

export function useAdminCurrency(): AdminCurrencyContextValue {
  const ctx = useContext(AdminCurrencyContext);
  if (!ctx) {
    throw new Error('useAdminCurrency must be used within AdminCurrencyProvider');
  }
  return ctx;
}

export function formatAdminCurrency(amount: number, sourceCurrency: AnyCurrency, displayCurrency: AdminDisplayCurrency): string {
  const converted = convert(amount, sourceCurrency, displayCurrency);
  const formatted = formatMoney(converted, displayCurrency);

  if (sourceCurrency === displayCurrency) {
    return formatted;
  }

  const reverseCurrency = displayCurrency === 'NGN' ? 'USD' : 'NGN';
  const reverseAmount = convert(amount, sourceCurrency, reverseCurrency);
  const reverseFormatted = formatMoney(reverseAmount, reverseCurrency);

  return `${formatted} ≈ ${reverseFormatted}`;
}
