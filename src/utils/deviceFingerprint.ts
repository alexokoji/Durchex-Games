// Lightweight device signature for anti-abuse on signup. NOT a privacy
// invasion — it's a stable hash of UA/screen/timezone/language that catches
// the easy case of one person creating multiple accounts on the same machine.
//
// Determined attackers can defeat this (incognito, different browser, VM).
// That's fine — this is one of several layered signals (IP, email domain,
// referrer linkage). The goal is to make casual self-referral abuse not
// worth the friction.
//
// We deliberately avoid canvas / WebGL fingerprinting: those are flaky and
// trigger fingerprinting warnings in privacy tooling. Stable signals only.

const STORAGE_KEY = 'duchex.device.sig.v1';

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function computeSignals(): string {
  const parts: (string | number | undefined)[] = [];
  try {
    parts.push(navigator.userAgent);
    parts.push(navigator.language);
    parts.push(navigator.languages?.join(',') ?? '');
    parts.push(navigator.platform);
    parts.push(navigator.hardwareConcurrency);
    parts.push((navigator as Navigator & { deviceMemory?: number }).deviceMemory);
    parts.push(screen.width, screen.height, screen.colorDepth, screen.pixelDepth);
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    parts.push(new Date().getTimezoneOffset());
    parts.push((navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints);
  } catch {
    /* if anything errors we still hash whatever we collected */
  }
  return parts.map(x => String(x ?? '')).join('|');
}

/**
 * Returns a stable per-device signature. Cached in localStorage so the same
 * browser session always returns the same value (prevents collisions where
 * a new render captures a different timezone offset after a DST shift).
 */
export function getDeviceSignature(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && /^[a-f0-9]{16,}$/.test(cached)) return cached;
  } catch { /* localStorage may be disabled */ }

  // 16 hex chars — two FNV1a passes with different salts. Good enough for a
  // birthday-paradox collision rate well below any realistic user count.
  const raw = computeSignals();
  const sig = fnv1a(raw) + fnv1a(raw + ':v1');

  try { localStorage.setItem(STORAGE_KEY, sig); } catch { /* ignore */ }
  return sig;
}
