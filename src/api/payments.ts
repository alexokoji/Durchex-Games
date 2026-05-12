import { apiPost } from './client';
import type { CryptoCurrency } from '../utils/currency';

export type FlwPaymentOption =
  | 'card' | 'banktransfer' | 'mobilemoneyghana' | 'mobilemoneyrwanda'
  | 'mobilemoneyuganda' | 'mobilemoneyzambia' | 'mobilemoneytanzania'
  | 'mpesa' | 'ussd' | 'account' | 'crypto';

export interface DepositInitBody {
  amount: number;        // in the user's primary currency (locked server-side)
  paymentOptions?: FlwPaymentOption[];
  phone?: string;
}

export interface DepositInitResult {
  paymentLink: string;
  reference: string;
}

export type WithdrawMethod = 'bank' | 'mobilemoney' | 'crypto';
export interface WithdrawBody {
  amount: number;
  method: WithdrawMethod;
  // fiat:
  accountBank?: string;
  accountNumber?: string;
  beneficiaryName?: string;
  // crypto:
  cryptoCurrency?: CryptoCurrency;
  cryptoNetwork?: string;
  cryptoAddress?: string;
}

export const paymentsApi = {
  depositInit: (body: DepositInitBody) =>
    apiPost<DepositInitResult>('/payments/deposit/init', body),
  withdraw: (body: WithdrawBody) =>
    apiPost<{ reference: string; status: string }>('/payments/withdraw', body),
};
