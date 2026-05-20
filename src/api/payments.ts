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

/** Outcome of a client-initiated deposit confirm. Mirrors the server's
 *  `ReconcileOutcome` union (see admin.ts for the verbose copy). */
export type DepositConfirmResult =
  | { ok: true;  status: 'credited' }
  | { ok: true;  status: 'already_credited' }
  | { ok: false; status: 'not_found' }
  | { ok: false; status: 'user_not_found' }
  | { ok: false; status: 'not_successful'; flwStatus?: string }
  | { ok: false; status: 'currency_mismatch'; expected: string; got: string }
  | { ok: false; status: 'amount_mismatch'; expected: number; got: number }
  | { ok: false; status: 'not_fiat' }
  | { ok: false; status: 'verify_failed'; message: string };

export const paymentsApi = {
  depositInit: (body: DepositInitBody) =>
    apiPost<DepositInitResult>('/payments/deposit/init', body),
  /** Client-driven confirmation called from PaymentReturnPage. Verifies the
   *  deposit against Flutterwave even if the webhook never landed. */
  confirmDeposit: (body: { txRef?: string; flwTxId?: string | number }) =>
    apiPost<DepositConfirmResult>('/payments/deposit/confirm', body),
  withdraw: (body: WithdrawBody) =>
    apiPost<{ reference: string; status: string }>('/payments/withdraw', body),
};
