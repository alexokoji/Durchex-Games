import {
  createContext, useCallback, useContext, useEffect, useState,
  type ReactNode,
} from 'react';
import { authApi, type ApiUser } from '../api/auth';
import { walletApi } from '../api/wallet';
import { ApiError, hasTokens, clearTokens } from '../api/client';
import { detectCountryAndCurrency, clearGeoCache } from '../utils/geolocation';
import { type FiatCurrency, currencyForCountry } from '../utils/currency';
import { getDeviceSignature } from '../utils/deviceFingerprint';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  initials: string;
  vipLevel: number;
  vipName: string;
  vipColor: string;
  vipCashbackPct: number;
  vipProgress: number;
  vipWageredUsd: number;
  vipNextThresholdUsd: number | null;
  wagered: number;
  currency: FiatCurrency;
  countryCode?: string;
  emailVerified: boolean;
  referralCode: string;
  promoterStatus: 'none' | 'pending' | 'approved' | 'banned';
  isAdmin: boolean;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

export interface SignUpExtras {
  referralCode?: string;
  promoCode?: string;
}

export type SignUpResult =
  | { ok: true;  bonus?: { amount: number; rollover: number; code: string } | null; referralApplied?: boolean }
  | { ok: false; error: string };

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  authError: string | null;

  signIn: (email: string, password: string) => Promise<AuthResult>;
  adminLogin: (username: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, username: string, password: string, extras?: SignUpExtras) => Promise<SignUpResult>;
  signInWithGoogle: () => void;
  signInWithApple:  () => void;
  signOut:  () => Promise<void>;
  refreshMe: () => Promise<void>;

  requireAuth: () => boolean;
  authPromptOpen: boolean;
  openAuthPrompt: () => void;
  closeAuthPrompt: () => void;

  forgotPassword: (email: string) => Promise<AuthResult>;
  resetPassword:  (email: string, token: string, newPassword: string) => Promise<AuthResult>;
  verifyEmail:    (email: string, token: string) => Promise<AuthResult>;
  resendVerification: () => Promise<AuthResult>;

  acceptOAuthTokens: (access: string, refresh: string) => Promise<AuthResult>;

  /** Detected on app boot; used to seed the registration form's country/currency. */
  detectedCountry?: string;
  detectedCurrency?: FiatCurrency;
  /** Push the detected currency to the server (called after sign-in if user has the default USD). */
  syncCurrencyFromGeo: () => Promise<void>;
  /** Force a fresh geolocation lookup (bypassing cache) and push to server.
   *  Used by Settings → "Detect from location" so VPN users can fix a wrong
   *  currency without manually choosing one. */
  redetectCurrency: () => Promise<{ ok: true; currency: FiatCurrency } | { ok: false; error: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    initials: u.initials,
    vipLevel: u.vipLevel ?? 0,
    vipName: u.vipName ?? 'Unranked',
    vipColor: u.vipColor ?? '#64748b',
    vipCashbackPct: u.vipCashbackPct ?? 0,
    vipProgress: u.vipProgressPct ?? 0,
    vipWageredUsd: u.vipWageredUsd ?? 0,
    vipNextThresholdUsd: u.vipNextThresholdUsd ?? null,
    wagered: u.totalWagered,
    currency: u.currency,
    countryCode: u.countryCode,
    emailVerified: u.emailVerified,
    referralCode: u.referralCode,
    promoterStatus: u.promoterStatus,
    isAdmin: u.isAdmin ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(hasTokens());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | undefined>();
  const [detectedCurrency, setDetectedCurrency] = useState<FiatCurrency | undefined>();

  // 1) Detect country/currency once, in parallel with /me.
  useEffect(() => {
    detectCountryAndCurrency().then(r => {
      if (r) { setDetectedCountry(r.country); setDetectedCurrency(r.currency); }
      else   { setDetectedCurrency(currencyForCountry(null)); }
    }).catch(() => {});
  }, []);

  // 2) Hydrate from /me on mount if we already have tokens.
  useEffect(() => {
    if (!hasTokens()) { setIsLoading(false); return; }
    (async () => {
      try {
        const u = await authApi.me();
        setUser(toAuthUser(u));
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('duchex:auth:logout', onLogout);
    return () => window.removeEventListener('duchex:auth:logout', onLogout);
  }, []);

  const refreshMe = useCallback(async (): Promise<void> => {
    if (!hasTokens()) return;
    try {
      const u = await authApi.me();
      setUser(toAuthUser(u));
    } catch { /* keep state on transient failure */ }
  }, []);

  const syncCurrencyFromGeo = useCallback(async (): Promise<void> => {
    if (!user || !detectedCurrency) return;
    // Only push if the server still has the default USD AND we detected something else.
    if (user.currency !== 'USD' || detectedCurrency === 'USD') return;
    try {
      const r = await walletApi.setCurrency(detectedCurrency, detectedCountry);
      setUser(toAuthUser(r.user));
    } catch { /* non-blocking */ }
  }, [user, detectedCurrency, detectedCountry]);

  const redetectCurrency = useCallback(async () => {
    clearGeoCache();
    const r = await detectCountryAndCurrency({ force: true });
    if (!r) return { ok: false as const, error: 'detection_failed' };
    setDetectedCountry(r.country);
    setDetectedCurrency(r.currency);
    // If signed in, also push to the server so the user's account currency
    // is updated. This is the path that fixes "I VPN'd to NY but still see GBP".
    if (user) {
      try {
        const resp = await walletApi.setCurrency(r.currency, r.country);
        setUser(toAuthUser(resp.user));
      } catch (err) {
        return { ok: false as const, error: err instanceof ApiError ? err.code : 'sync_failed' };
      }
    }
    return { ok: true as const, currency: r.currency };
  }, [user]);

  // Auto-sync once per sign-in (when user.id first appears) if the account is still
  // on the default USD but geolocation says otherwise.  We intentionally exclude
  // syncCurrencyFromGeo from deps so a manual currency change (which updates user.currency
  // and therefore the callback ref) does NOT re-trigger this effect and overwrite the
  // user's choice with the geo-detected value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void syncCurrencyFromGeo(); }, [user?.id]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setIsSubmitting(true); setAuthError(null);
    try {
      const u = await authApi.login(email, password);
      setUser(toAuthUser(u));
      setAuthPromptOpen(false);
      return { ok: true };
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'login_failed';
      setAuthError(code);
      return { ok: false, error: code };
    } finally { setIsSubmitting(false); }
  }, []);

  const adminLogin = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    setIsSubmitting(true); setAuthError(null);
    try {
      const u = await authApi.adminLogin(username, password);
      setUser(toAuthUser(u));
      return { ok: true };
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'admin_login_failed';
      setAuthError(code);
      return { ok: false, error: code };
    } finally { setIsSubmitting(false); }
  }, []);

  const signUp = useCallback(async (
    email: string, username: string, password: string, extras?: SignUpExtras,
  ): Promise<SignUpResult> => {
    setIsSubmitting(true); setAuthError(null);
    try {
      const r = await authApi.register(email, username, password, detectedCountry, detectedCurrency, {
        ...extras,
        deviceSignature: getDeviceSignature(),
      });
      setUser(toAuthUser(r.user));
      setAuthPromptOpen(false);
      return {
        ok: true,
        bonus: r.promo ? { amount: r.promo.bonus, rollover: r.promo.rollover, code: r.promo.code } : null,
        referralApplied: r.referral?.applied ?? false,
      };
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'register_failed';
      setAuthError(code);
      return { ok: false, error: code };
    } finally { setIsSubmitting(false); }
  }, [detectedCountry, detectedCurrency]);

  const signOut = useCallback(async (): Promise<void> => {
    await authApi.logout();
    setUser(null);
  }, []);

  const signInWithGoogle = useCallback((): void => { window.location.href = authApi.oauthStartUrl('google'); }, []);
  const signInWithApple  = useCallback((): void => { window.location.href = authApi.oauthStartUrl('apple');  }, []);

  const acceptOAuthTokens = useCallback(async (access: string, refresh: string): Promise<AuthResult> => {
    authApi.acceptOAuthTokens(access, refresh);
    try {
      const u = await authApi.me();
      setUser(toAuthUser(u));
      setAuthPromptOpen(false);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof ApiError ? err.code : 'oauth_failed' };
    }
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<AuthResult> => {
    try { await authApi.forgotPassword(email); return { ok: true }; }
    catch (err) { return { ok: false, error: err instanceof ApiError ? err.code : 'forgot_password_failed' }; }
  }, []);
  const resetPassword = useCallback(async (email: string, token: string, newPassword: string): Promise<AuthResult> => {
    try { await authApi.resetPassword(email, token, newPassword); return { ok: true }; }
    catch (err) { return { ok: false, error: err instanceof ApiError ? err.code : 'reset_password_failed' }; }
  }, []);
  const verifyEmail = useCallback(async (email: string, token: string): Promise<AuthResult> => {
    try {
      await authApi.verifyEmail(email, token);
      if (user) await refreshMe();
      return { ok: true };
    } catch (err) { return { ok: false, error: err instanceof ApiError ? err.code : 'verify_email_failed' }; }
  }, [user, refreshMe]);
  const resendVerification = useCallback(async (): Promise<AuthResult> => {
    try { await authApi.resendVerification(); return { ok: true }; }
    catch (err) { return { ok: false, error: err instanceof ApiError ? err.code : 'resend_failed' }; }
  }, []);

  const openAuthPrompt  = useCallback(() => { setAuthError(null); setAuthPromptOpen(true); }, []);
  const closeAuthPrompt = useCallback(() => setAuthPromptOpen(false), []);
  const requireAuth = useCallback(() => {
    if (user) return true;
    setAuthPromptOpen(true);
    return false;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: user !== null, isLoading, isSubmitting, authError,
      signIn, adminLogin, signUp, signOut, signInWithGoogle, signInWithApple, acceptOAuthTokens,
      refreshMe, requireAuth, authPromptOpen, openAuthPrompt, closeAuthPrompt,
      forgotPassword, resetPassword, verifyEmail, resendVerification,
      detectedCountry, detectedCurrency, syncCurrencyFromGeo, redetectCurrency,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
