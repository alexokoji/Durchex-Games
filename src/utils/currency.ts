// Frontend mirror of server/src/config/currencies.ts — kept manually in sync.
// All money rendered to the user goes through `formatMoney` so we have one
// place to swap in proper Intl.NumberFormat or a live rates feed later.

export type FiatCurrency =
  | 'NGN' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'INR'
  | 'GHS' | 'KES' | 'ZAR' | 'ZMW' | 'RWF' | 'UGX' | 'TZS' | 'EGP' | 'BRL' | 'MXN';
export type CryptoCurrency = 'BTC' | 'USDT' | 'USDC';
export type AnyCurrency = FiatCurrency | CryptoCurrency;

export interface FiatMeta {
  code: FiatCurrency;
  name: string;
  symbol: string;
  decimals: number;
  defaultStake: number;
  usdPerUnit: number;
  flutterwaveSupported: boolean;
  locale?: string;
}

export const FIAT: Record<FiatCurrency, FiatMeta> = {
  NGN: { code: 'NGN', name: 'Nigerian Naira',     symbol: '₦',   decimals: 2, defaultStake: 1000,  usdPerUnit: 1 / 1500,    flutterwaveSupported: true,  locale: 'en-NG' },
  USD: { code: 'USD', name: 'US Dollar',          symbol: '$',   decimals: 2, defaultStake: 5,     usdPerUnit: 1,            flutterwaveSupported: true,  locale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro',               symbol: '€',   decimals: 2, defaultStake: 5,     usdPerUnit: 1.08,         flutterwaveSupported: true,  locale: 'en-IE' },
  GBP: { code: 'GBP', name: 'British Pound',      symbol: '£',   decimals: 2, defaultStake: 5,     usdPerUnit: 1.27,         flutterwaveSupported: true,  locale: 'en-GB' },
  CAD: { code: 'CAD', name: 'Canadian Dollar',    symbol: 'C$',  decimals: 2, defaultStake: 7,     usdPerUnit: 0.73,         flutterwaveSupported: true,  locale: 'en-CA' },
  AUD: { code: 'AUD', name: 'Australian Dollar',  symbol: 'A$',  decimals: 2, defaultStake: 7,     usdPerUnit: 0.66,         flutterwaveSupported: false, locale: 'en-AU' },
  JPY: { code: 'JPY', name: 'Japanese Yen',       symbol: '¥',   decimals: 0, defaultStake: 500,   usdPerUnit: 1 / 150,      flutterwaveSupported: false, locale: 'ja-JP' },
  INR: { code: 'INR', name: 'Indian Rupee',       symbol: '₹',   decimals: 2, defaultStake: 400,   usdPerUnit: 1 / 84,       flutterwaveSupported: false, locale: 'en-IN' },
  GHS: { code: 'GHS', name: 'Ghanaian Cedi',      symbol: 'GH₵', decimals: 2, defaultStake: 50,    usdPerUnit: 1 / 15,       flutterwaveSupported: true,  locale: 'en-GH' },
  KES: { code: 'KES', name: 'Kenyan Shilling',    symbol: 'KSh', decimals: 2, defaultStake: 500,   usdPerUnit: 1 / 130,      flutterwaveSupported: true,  locale: 'en-KE' },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R',   decimals: 2, defaultStake: 80,    usdPerUnit: 1 / 18,       flutterwaveSupported: true,  locale: 'en-ZA' },
  ZMW: { code: 'ZMW', name: 'Zambian Kwacha',     symbol: 'ZK',  decimals: 2, defaultStake: 100,   usdPerUnit: 1 / 25,       flutterwaveSupported: true,  locale: 'en-ZM' },
  RWF: { code: 'RWF', name: 'Rwandan Franc',      symbol: 'RF',  decimals: 0, defaultStake: 5000,  usdPerUnit: 1 / 1300,     flutterwaveSupported: true,  locale: 'rw-RW' },
  UGX: { code: 'UGX', name: 'Ugandan Shilling',   symbol: 'USh', decimals: 0, defaultStake: 15000, usdPerUnit: 1 / 3700,     flutterwaveSupported: true,  locale: 'en-UG' },
  TZS: { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', decimals: 0, defaultStake: 10000, usdPerUnit: 1 / 2500,     flutterwaveSupported: true,  locale: 'sw-TZ' },
  EGP: { code: 'EGP', name: 'Egyptian Pound',     symbol: 'E£',  decimals: 2, defaultStake: 200,   usdPerUnit: 1 / 48,       flutterwaveSupported: true,  locale: 'ar-EG' },
  BRL: { code: 'BRL', name: 'Brazilian Real',     symbol: 'R$',  decimals: 2, defaultStake: 25,    usdPerUnit: 1 / 5.5,      flutterwaveSupported: false, locale: 'pt-BR' },
  MXN: { code: 'MXN', name: 'Mexican Peso',       symbol: 'Mex$',decimals: 2, defaultStake: 100,   usdPerUnit: 1 / 20,       flutterwaveSupported: false, locale: 'es-MX' },
};

export const ALL_FIAT_CODES = Object.keys(FIAT) as FiatCurrency[];
export const FLUTTERWAVE_FIAT = ALL_FIAT_CODES.filter(c => FIAT[c].flutterwaveSupported);

export interface CryptoMeta {
  code: CryptoCurrency;
  name: string;
  symbol: string;
  decimals: number;
  usdPerUnit: number;
  color: string;
}
export const CRYPTO: Record<CryptoCurrency, CryptoMeta> = {
  BTC:  { code: 'BTC',  name: 'Bitcoin',  symbol: '₿', decimals: 5, usdPerUnit: 66_700, color: '#f7931a' },
  USDT: { code: 'USDT', name: 'Tether',   symbol: '₮', decimals: 2, usdPerUnit: 1,      color: '#26a17b' },
  USDC: { code: 'USDC', name: 'USD Coin', symbol: '⊙', decimals: 2, usdPerUnit: 1,      color: '#2775ca' },
};
export const ALL_CRYPTO_CODES: CryptoCurrency[] = ['BTC', 'USDT', 'USDC'];

export const COUNTRY_TO_CURRENCY: Record<string, FiatCurrency> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', ZM: 'ZMW',
  RW: 'RWF', UG: 'UGX', TZ: 'TZS', EG: 'EGP',
  US: 'USD', CA: 'CAD', MX: 'MXN',
  BR: 'BRL',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', PT: 'EUR',
  IE: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR',
  CY: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', MT: 'EUR', SK: 'EUR',
  SI: 'EUR', HR: 'EUR',
  GB: 'GBP',
  AU: 'AUD', NZ: 'AUD',
  JP: 'JPY', IN: 'INR',
};

export function currencyForCountry(country?: string | null): FiatCurrency {
  if (!country) return 'USD';
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? 'USD';
}

export function isFiat(code: string): code is FiatCurrency { return code in FIAT; }
export function isCrypto(code: string): code is CryptoCurrency { return code === 'BTC' || code === 'USDT' || code === 'USDC'; }

export function symbolOf(code: AnyCurrency): string {
  if (isFiat(code)) return FIAT[code].symbol;
  if (isCrypto(code)) return CRYPTO[code].symbol;
  return '';
}
export function decimalsOf(code: AnyCurrency): number {
  if (isFiat(code)) return FIAT[code].decimals;
  if (isCrypto(code)) return CRYPTO[code].decimals;
  return 2;
}
export function defaultStakeFor(code: AnyCurrency): number {
  if (isFiat(code)) return FIAT[code].defaultStake;
  if (code === 'BTC') return 0.0001;
  return 5;
}

/**
 * Global minimum bet: $0.01 USD equivalent, expressed in the user's currency.
 * Applies to every game and every market — the platform's hard floor.
 */
export const MIN_BET_USD = 0.01;
export function minBetFor(code: AnyCurrency): number {
  if (isFiat(code)) {
    const raw = MIN_BET_USD / FIAT[code].usdPerUnit;
    // Round up to one tick of the currency's smallest unit so we never accept
    // sub-cent stakes that won't render.
    const decimals = FIAT[code].decimals;
    const factor = Math.pow(10, decimals);
    return Math.ceil(raw * factor) / factor;
  }
  if (code === 'BTC')  return MIN_BET_USD / CRYPTO.BTC.usdPerUnit;
  if (code === 'USDT' || code === 'USDC') return MIN_BET_USD;
  return MIN_BET_USD;
}

const formatterCache = new Map<string, Intl.NumberFormat>();
function getFormatter(currency: AnyCurrency, opts: { compact?: boolean } = {}): Intl.NumberFormat {
  const key = `${currency}:${opts.compact ? 'c' : 'f'}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  if (isFiat(currency)) {
    const f = new Intl.NumberFormat(FIAT[currency].locale ?? 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: FIAT[currency].decimals,
      minimumFractionDigits: opts.compact ? 0 : FIAT[currency].decimals,
      notation: opts.compact ? 'compact' : 'standard',
    });
    formatterCache.set(key, f);
    return f;
  }
  // Crypto formatting we handle manually because Intl doesn't know BTC.
  const f = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: CRYPTO[currency as CryptoCurrency].decimals,
    notation: opts.compact ? 'compact' : 'standard',
  });
  formatterCache.set(key, f);
  return f;
}

export function formatMoney(amount: number, currency: AnyCurrency, opts: { compact?: boolean; sign?: boolean } = {}): string {
  if (!Number.isFinite(amount)) amount = 0;
  const sign = opts.sign && amount > 0 ? '+' : '';
  if (isFiat(currency)) {
    return sign + getFormatter(currency, opts).format(amount);
  }
  const f = getFormatter(currency, opts).format(Math.abs(amount));
  return `${sign}${amount < 0 ? '-' : ''}${f} ${currency}`;
}

export function parseAmount(text: string): number {
  const cleaned = String(text).replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
