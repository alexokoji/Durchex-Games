import axios from 'axios';
import crypto from 'node:crypto';
import { env } from '../config/env';
import { FIAT, type FiatCurrency } from '../config/currencies';

const BASE = 'https://api.flutterwave.com/v3';

export type FlwPaymentOption =
  | 'card'
  | 'banktransfer'
  | 'mobilemoneyghana'
  | 'mobilemoneyrwanda'
  | 'mobilemoneyuganda'
  | 'mobilemoneyzambia'
  | 'mobilemoneytanzania'
  | 'mpesa'
  | 'ussd'
  | 'account'
  | 'crypto';

export const ALL_PAYMENT_OPTIONS: FlwPaymentOption[] = [
  'card', 'banktransfer', 'mobilemoneyghana', 'mobilemoneyrwanda',
  'mobilemoneyuganda', 'mobilemoneyzambia', 'mobilemoneytanzania',
  'mpesa', 'ussd', 'account', 'crypto',
];

function client() {
  return axios.create({
    baseURL: BASE,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${env.flutterwave.secretKey}`,
      'Content-Type': 'application/json',
    },
  });
}

export interface InitPaymentArgs {
  txRef: string;
  amount: number;
  currency: FiatCurrency;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  paymentOptions?: FlwPaymentOption[];
  redirectUrl?: string;
  meta?: Record<string, string | number | boolean>;
}

export interface InitPaymentResult {
  paymentLink: string;
  txRef: string;
  flwReference?: string;
}

/** Open a Flutterwave Standard checkout for a fiat deposit. */
export async function initPayment(args: InitPaymentArgs): Promise<InitPaymentResult> {
  if (!env.flutterwave.enabled) throw new Error('flutterwave_not_configured');
  if (!FIAT[args.currency]?.flutterwaveSupported) throw new Error('currency_not_supported');

  const body = {
    tx_ref: args.txRef,
    amount: args.amount,
    currency: args.currency,
    redirect_url: args.redirectUrl ?? env.flutterwave.redirectUrl,
    payment_options: (args.paymentOptions ?? ALL_PAYMENT_OPTIONS).join(','),
    customer: {
      email: args.customerEmail,
      name:  args.customerName,
      phonenumber: args.customerPhone,
    },
    customizations: {
      title: 'DUCHEXiGAMES Deposit',
      description: 'Top-up your DUCHEXiGAMES balance',
    },
    meta: args.meta,
  };
  const res = await client().post('/payments', body);
  const data = res.data?.data;
  if (!data?.link) throw new Error('flutterwave_no_link');
  return { paymentLink: data.link as string, txRef: args.txRef, flwReference: data.reference };
}

export async function verifyTransaction(flwTxId: string | number) {
  if (!env.flutterwave.enabled) throw new Error('flutterwave_not_configured');
  const res = await client().get(`/transactions/${flwTxId}/verify`);
  return res.data?.data;
}

/**
 * Verify a transaction by our own reference (tx_ref). This is the fallback
 * for when we don't have Flutterwave's numeric transaction id — typically
 * because the webhook never fired and the local pending row was created
 * before we knew the FLW id. Flutterwave's "verify_by_reference" endpoint
 * returns the same shape as the regular verify endpoint, including `id`.
 */
export async function verifyByReference(txRef: string) {
  if (!env.flutterwave.enabled) throw new Error('flutterwave_not_configured');
  const res = await client().get(`/transactions/verify_by_reference`, {
    params: { tx_ref: txRef },
  });
  return res.data?.data;
}

export interface InitTransferArgs {
  reference: string;
  amount: number;
  currency: FiatCurrency;
  accountBank: string;
  accountNumber: string;
  beneficiaryName: string;
  narration?: string;
  meta?: Record<string, string | number>;
}
export async function initTransfer(args: InitTransferArgs) {
  if (!env.flutterwave.enabled) throw new Error('flutterwave_not_configured');
  const res = await client().post('/transfers', {
    account_bank:   args.accountBank,
    account_number: args.accountNumber,
    amount:         args.amount,
    currency:       args.currency,
    reference:      args.reference,
    beneficiary_name: args.beneficiaryName,
    narration:      args.narration ?? 'DUCHEXiGAMES Withdrawal',
    meta:           args.meta,
  });
  return res.data?.data;
}

export function isWebhookSignatureValid(headerValue: string | undefined): boolean {
  if (!env.flutterwave.webhookHash) return false;
  if (!headerValue) return false;
  try {
    const a = Buffer.from(headerValue);
    const b = Buffer.from(env.flutterwave.webhookHash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
