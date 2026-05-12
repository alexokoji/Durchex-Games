import { currencyForCountry, type FiatCurrency } from './currency';

/**
 * Best-effort country detection via a free IP geolocation service.
 * No browser permission prompt, no PII beyond IP. The frontend uses this
 * once on app load to default the user's display currency.
 *
 * Returns null only if every fallback fails (offline, no network).
 */
export interface GeoResult {
  country: string;        // ISO-3166-1 alpha-2 (e.g. 'NG')
  currency: FiatCurrency;
  source: 'ipapi' | 'country.is' | 'language' | 'timezone';
}

async function tryFetch(url: string, ms = 4000): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function fromLanguage(): string | null {
  const lang = navigator.language || (navigator.languages?.[0] ?? '');
  // 'en-NG' → 'NG'. Languages without a country segment ('en') return null.
  const parts = lang.split('-');
  if (parts.length < 2) return null;
  const cc = parts[1].toUpperCase();
  return /^[A-Z]{2}$/.test(cc) ? cc : null;
}

function fromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    // Very rough — covers the most common cases we see in production. The
    // network providers above are tried first; this is the last-resort.
    if (tz.startsWith('Africa/Lagos')) return 'NG';
    if (tz.startsWith('Africa/Accra')) return 'GH';
    if (tz.startsWith('Africa/Nairobi')) return 'KE';
    if (tz.startsWith('Africa/Johannesburg')) return 'ZA';
    if (tz.startsWith('America/New_York') || tz.startsWith('America/Chicago') || tz.startsWith('America/Los_Angeles')) return 'US';
    if (tz.startsWith('America/Toronto') || tz.startsWith('America/Vancouver')) return 'CA';
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('Europe/Berlin') || tz.startsWith('Europe/Paris') || tz.startsWith('Europe/Madrid') || tz.startsWith('Europe/Rome')) return 'DE';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz.startsWith('Asia/Tokyo')) return 'JP';
    if (tz.startsWith('Asia/Kolkata')) return 'IN';
    return null;
  } catch {
    return null;
  }
}

export async function detectCountryAndCurrency(): Promise<GeoResult | null> {
  // 1) Free IP geolocation — primary signal.
  const cIs = await tryFetch('https://api.country.is/');
  const cIsCountry = (cIs as { country?: string } | null)?.country;
  if (cIsCountry && /^[A-Z]{2}$/.test(cIsCountry)) {
    return { country: cIsCountry, currency: currencyForCountry(cIsCountry), source: 'country.is' };
  }

  const ipApi = await tryFetch('https://ipapi.co/json/');
  const ipApiCountry = (ipApi as { country_code?: string } | null)?.country_code;
  if (ipApiCountry && /^[A-Z]{2}$/.test(ipApiCountry)) {
    return { country: ipApiCountry, currency: currencyForCountry(ipApiCountry), source: 'ipapi' };
  }

  // 2) Browser language fallback.
  const fromLang = fromLanguage();
  if (fromLang) return { country: fromLang, currency: currencyForCountry(fromLang), source: 'language' };

  // 3) Timezone fallback.
  const fromTz = fromTimezone();
  if (fromTz) return { country: fromTz, currency: currencyForCountry(fromTz), source: 'timezone' };

  return null;
}
