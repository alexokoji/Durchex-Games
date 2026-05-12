import {
  createContext, useCallback, useContext, useEffect, useState,
  type ReactNode,
} from 'react';
import { authApi, type ApiUser } from '../api/auth';
import { walletApi } from '../api/wallet';
import { ApiError, hasTokens, clearTokens } from '../api/client';
import { detectCountryAndCurrency } from '../utils/geolocation';
import { type FiatCurrency, currencyForCountry } from '../utils/currency';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  initials: string;
  vipLevel: number;
  vipProgress: number;
  wagered: number;
  currency: FiatCurrency;
  countryCode?: string;
  emailVerified: boolean;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  authError: string | null;

  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, username: string, password: string) => Promise<AuthResult>;
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(u: ApiUser): AuthUser {
  const vipProgress = Math.min(99, Math.round((u.vipXp % 100)));
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    initials: u.initials,
    vipLevel: u.vipLevel,
    vipProgress,
    wagered: u.totalWagered,
    currency: u.currency,
    countryCode: u.countryCode,
    emailVerified: u.emailVerified,
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

  // Auto-sync after sign-in if user is on default USD but we detected otherwise.
  useEffect(() => { void syncCurrencyFromGeo(); }, [user?.id, syncCurrencyFromGeo]);

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

  const signUp = useCallback(async (email: string, username: string, password: string): Promise<AuthResult> => {
    setIsSubmitting(true); setAuthError(null);
    try {
      const u = await authApi.register(email, username, password, detectedCountry, detectedCurrency);
      setUser(toAuthUser(u));
      setAuthPromptOpen(false);
      return { ok: true };
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
      signIn, signUp, signOut, signInWithGoogle, signInWithApple, acceptOAuthTokens,
      refreshMe, requireAuth, authPromptOpen, openAuthPrompt, closeAuthPrompt,
      forgotPassword, resetPassword, verifyEmail, resendVerification,
      detectedCountry, detectedCurrency, syncCurrencyFromGeo,
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
