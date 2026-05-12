// All currency knowledge for the server lives here.
// Country → currency map drives geolocation defaults; the catalog drives FX
// fallback rates, decimal places, default stakes, and per-currency limits.

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
  /** Approximate USD value of 1 unit (used as FX fallback). Replace with a
   *  live rates feed before launch — currently a static reference table. */
  usdPerUnit: number;
  /** Whether Flutterwave Standard checkout accepts this directly. */
  flutterwaveSupported: boolean;
}

export const FIAT: Record<FiatCurrency, FiatMeta> = {
  NGN: { code: 'NGN', name: 'Nigerian Naira',     symbol: '₦',   decimals: 2, defaultStake: 1000,  usdPerUnit: 1 / 1500,    flutterwaveSupported: true  },
  USD: { code: 'USD', name: 'US Dollar',          symbol: '$',   decimals: 2, defaultStake: 5,     usdPerUnit: 1,            flutterwaveSupported: true  },
  EUR: { code: 'EUR', name: 'Euro',               symbol: '€',   decimals: 2, defaultStake: 5,     usdPerUnit: 1.08,         flutterwaveSupported: true  },
  GBP: { code: 'GBP', name: 'British Pound',      symbol: '£',   decimals: 2, defaultStake: 5,     usdPerUnit: 1.27,         flutterwaveSupported: true  },
  CAD: { code: 'CAD', name: 'Canadian Dollar',    symbol: 'C$',  decimals: 2, defaultStake: 7,     usdPerUnit: 0.73,         flutterwaveSupported: true  },
  AUD: { code: 'AUD', name: 'Australian Dollar',  symbol: 'A$',  decimals: 2, defaultStake: 7,     usdPerUnit: 0.66,         flutterwaveSupported: false },
  JPY: { code: 'JPY', name: 'Japanese Yen',       symbol: '¥',   decimals: 0, defaultStake: 500,   usdPerUnit: 1 / 150,      flutterwaveSupported: false },
  INR: { code: 'INR', name: 'Indian Rupee',       symbol: '₹',   decimals: 2, defaultStake: 400,   usdPerUnit: 1 / 84,       flutterwaveSupported: false },
  GHS: { code: 'GHS', name: 'Ghanaian Cedi',      symbol: 'GH₵', decimals: 2, defaultStake: 50,    usdPerUnit: 1 / 15,       flutterwaveSupported: true  },
  KES: { code: 'KES', name: 'Kenyan Shilling',    symbol: 'KSh', decimals: 2, defaultStake: 500,   usdPerUnit: 1 / 130,      flutterwaveSupported: true  },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R',   decimals: 2, defaultStake: 80,    usdPerUnit: 1 / 18,       flutterwaveSupported: true  },
  ZMW: { code: 'ZMW', name: 'Zambian Kwacha',     symbol: 'ZK',  decimals: 2, defaultStake: 100,   usdPerUnit: 1 / 25,       flutterwaveSupported: true  },
  RWF: { code: 'RWF', name: 'Rwandan Franc',      symbol: 'RF',  decimals: 0, defaultStake: 5000,  usdPerUnit: 1 / 1300,     flutterwaveSupported: true  },
  UGX: { code: 'UGX', name: 'Ugandan Shilling',   symbol: 'USh', decimals: 0, defaultStake: 15000, usdPerUnit: 1 / 3700,     flutterwaveSupported: true  },
  TZS: { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', decimals: 0, defaultStake: 10000, usdPerUnit: 1 / 2500,     flutterwaveSupported: true  },
  EGP: { code: 'EGP', name: 'Egyptian Pound',     symbol: 'E£',  decimals: 2, defaultStake: 200,   usdPerUnit: 1 / 48,       flutterwaveSupported: true  },
  BRL: { code: 'BRL', name: 'Brazilian Real',     symbol: 'R$',  decimals: 2, defaultStake: 25,    usdPerUnit: 1 / 5.5,      flutterwaveSupported: false },
  MXN: { code: 'MXN', name: 'Mexican Peso',       symbol: 'Mex$',decimals: 2, defaultStake: 100,   usdPerUnit: 1 / 20,       flutterwaveSupported: false },
};

export const ALL_FIAT_CODES: FiatCurrency[] = Object.keys(FIAT) as FiatCurrency[];
export const FLUTTERWAVE_FIAT: FiatCurrency[] = ALL_FIAT_CODES.filter(c => FIAT[c].flutterwaveSupported);

export const CRYPTO_USD: Record<CryptoCurrency, number> = {
  BTC:  66_700,
  USDT: 1,
  USDC: 1,
};

/** Map ISO-3166 country code → preferred currency. Anything missing falls back to USD. */
export const COUNTRY_TO_CURRENCY: Record<string, FiatCurrency> = {
  // Africa
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', ZM: 'ZMW',
  RW: 'RWF', UG: 'UGX', TZ: 'TZS', EG: 'EGP',
  // North America
  US: 'USD', CA: 'CAD', MX: 'MXN',
  // South America
  BR: 'BRL',
  // EU members → EUR
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', PT: 'EUR',
  IE: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR',
  CY: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', MT: 'EUR', SK: 'EUR',
  SI: 'EUR', HR: 'EUR',
  // Rest of Europe
  GB: 'GBP',
  // Oceania
  AU: 'AUD', NZ: 'AUD',
  // Asia
  JP: 'JPY', IN: 'INR',
};

export function currencyForCountry(country?: string | null): FiatCurrency {
  if (!country) return 'USD';
  const c = country.toUpperCase();
  return COUNTRY_TO_CURRENCY[c] ?? 'USD';
}

export function isFiat(code: string): code is FiatCurrency {
  return code in FIAT;
}

export function isCrypto(code: string): code is CryptoCurrency {
  return code === 'BTC' || code === 'USDT' || code === 'USDC';
}

/** Convert any amount to USD using the static reference rates. */
export function toUsd(amount: number, code: AnyCurrency): number {
  if (isFiat(code)) return amount * FIAT[code].usdPerUnit;
  if (isCrypto(code)) return amount * CRYPTO_USD[code];
  return 0;
}

/** Convert across currencies (fiat ↔ fiat, fiat ↔ crypto). */
export function convert(amount: number, from: AnyCurrency, to: AnyCurrency): number {
  if (from === to) return amount;
  const usd = toUsd(amount, from);
  if (isFiat(to))   return usd / FIAT[to].usdPerUnit;
  if (isCrypto(to)) return usd / CRYPTO_USD[to];
  return 0;
}

export function defaultStakeFor(code: AnyCurrency): number {
  if (isFiat(code)) return FIAT[code].defaultStake;
  if (code === 'BTC')  return 0.0001;
  if (code === 'USDT' || code === 'USDC') return 5;
  return 5;
}
