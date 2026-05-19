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
  source: 'country.is' | 'ipwho.is' | 'ipapi.co' | 'language' | 'timezone';
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
    // Map the most common IANA prefixes to ISO-3166-1 codes. Wider coverage
    // matters more than precision here — this is a fallback, not the primary
    // source. Browsers respect the OS timezone, so when a VPN flips the
    // system clock to America/New_York this gives us the right answer even
    // when the IP services lag or get spoofed.
    if (tz.startsWith('Africa/Lagos'))        return 'NG';
    if (tz.startsWith('Africa/Accra'))        return 'GH';
    if (tz.startsWith('Africa/Nairobi'))      return 'KE';
    if (tz.startsWith('Africa/Johannesburg')) return 'ZA';
    if (tz.startsWith('Africa/Cairo'))        return 'EG';
    if (tz.startsWith('Africa/Kampala'))      return 'UG';
    if (tz.startsWith('Africa/Dar_es_Salaam'))return 'TZ';
    if (tz.startsWith('Africa/Kigali'))       return 'RW';
    if (tz.startsWith('America/New_York')     || tz.startsWith('America/Detroit')) return 'US';
    if (tz.startsWith('America/Chicago')      || tz.startsWith('America/Denver')) return 'US';
    if (tz.startsWith('America/Los_Angeles')  || tz.startsWith('America/Phoenix')) return 'US';
    if (tz.startsWith('America/Anchorage')    || tz.startsWith('America/Boise'))  return 'US';
    if (tz.startsWith('America/Toronto') || tz.startsWith('America/Vancouver') || tz.startsWith('America/Edmonton')) return 'CA';
    if (tz.startsWith('America/Mexico_City') || tz.startsWith('America/Monterrey')) return 'MX';
    if (tz.startsWith('America/Sao_Paulo')   || tz.startsWith('America/Bahia'))  return 'BR';
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('Europe/Dublin')) return 'IE';
    if (tz.startsWith('Europe/Berlin') || tz.startsWith('Europe/Munich')) return 'DE';
    if (tz.startsWith('Europe/Paris'))  return 'FR';
    if (tz.startsWith('Europe/Madrid')) return 'ES';
    if (tz.startsWith('Europe/Rome'))   return 'IT';
    if (tz.startsWith('Europe/Amsterdam')) return 'NL';
    if (tz.startsWith('Europe/Lisbon')) return 'PT';
    if (tz.startsWith('Europe/Istanbul')) return 'TR';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz.startsWith('Asia/Tokyo')) return 'JP';
    if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return 'IN';
    return null;
  } catch {
    return null;
  }
}

/**
 * Run all detection strategies in priority order and return the first one
 * that succeeds. IP services come first because they're the most accurate
 * when not behind a VPN; **timezone is preferred over language** because the
 * browser language reflects the user's keyboard preference (e.g. `en-GB` for
 * an English-as-second-language speaker living in Lagos) while timezone
 * follows the OS clock which a VPN typically flips along with the IP.
 *
 * If `force === true`, any cached result is ignored.
 */
const CACHE_KEY = 'duchex.geo.v2';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;     // 6 hours — long enough to avoid hammering APIs

interface CachedGeo { result: GeoResult; at: number }

function readCache(): GeoResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedGeo = JSON.parse(raw);
    if (!parsed?.at || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.result;
  } catch { return null; }
}

function writeCache(result: GeoResult): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ result, at: Date.now() })); } catch { /* ignore */ }
}

export function clearGeoCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

export async function detectCountryAndCurrency(opts: { force?: boolean } = {}): Promise<GeoResult | null> {
  if (!opts.force) {
    const cached = readCache();
    if (cached) return cached;
  }

  const finalize = (r: GeoResult): GeoResult => { writeCache(r); return r; };

  // 1) Primary IP geolocation — api.country.is is small, fast, CORS-open.
  const cIs = await tryFetch('https://api.country.is/');
  const cIsCountry = (cIs as { country?: string } | null)?.country;
  if (cIsCountry && /^[A-Z]{2}$/.test(cIsCountry)) {
    return finalize({ country: cIsCountry, currency: currencyForCountry(cIsCountry), source: 'country.is' });
  }

  // 2) Backup IP geolocation. ipwho.is has open CORS for browser fetches.
  const ipwho = await tryFetch('https://ipwho.is/');
  const ipwhoCountry = ipwho as { country_code?: string; success?: boolean } | null;
  if (ipwhoCountry?.success && ipwhoCountry.country_code && /^[A-Z]{2}$/.test(ipwhoCountry.country_code)) {
    return finalize({ country: ipwhoCountry.country_code, currency: currencyForCountry(ipwhoCountry.country_code), source: 'ipwho.is' });
  }

  // 3) Third IP fallback — ipapi.co occasionally blocks deployed domains with
  //    403 but works for many residential IPs and is worth trying before we
  //    fall back to local signals.
  const ipapi = await tryFetch('https://ipapi.co/json/');
  const ipapiCountry = (ipapi as { country_code?: string; country?: string } | null);
  const ipapiCC = ipapiCountry?.country_code ?? ipapiCountry?.country;
  if (ipapiCC && /^[A-Z]{2}$/.test(ipapiCC)) {
    return finalize({ country: ipapiCC, currency: currencyForCountry(ipapiCC), source: 'ipapi.co' });
  }

  // 4) Timezone (preferred over language — see top-of-function note).
  const fromTz = fromTimezone();
  if (fromTz) return finalize({ country: fromTz, currency: currencyForCountry(fromTz), source: 'timezone' });

  // 5) Browser language as last resort.
  const fromLang = fromLanguage();
  if (fromLang) return finalize({ country: fromLang, currency: currencyForCountry(fromLang), source: 'language' });

  return null;
}
