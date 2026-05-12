import { apiGet, apiPost, apiBaseUrl, setTokens, clearTokens } from './client';
import type { FiatCurrency, CryptoCurrency } from '../utils/currency';

export interface ApiUser {
  id: string;
  email: string;
  username: string;
  initials: string;
  emailVerified: boolean;
  currency: FiatCurrency;
  countryCode?: string;
  balance: number;
  cryptoBalances: Partial<Record<CryptoCurrency, number>>;
  totalWagered: number;
  totalWon: number;
  vipLevel: number;
  vipXp: number;
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

function applyAuthResponse(r: AuthResponse): ApiUser {
  setTokens(r.accessToken, r.refreshToken);
  return r.user;
}

export const authApi = {
  async register(email: string, username: string, password: string, countryCode?: string, currency?: FiatCurrency): Promise<ApiUser> {
    const r = await apiPost<AuthResponse>('/auth/register',
      { email, username, password, countryCode, currency },
      { skipAuth: true });
    return applyAuthResponse(r);
  },
  async login(email: string, password: string): Promise<ApiUser> {
    const r = await apiPost<AuthResponse>('/auth/login', { email, password }, { skipAuth: true });
    return applyAuthResponse(r);
  },
  async me(): Promise<ApiUser> {
    const r = await apiGet<{ user: ApiUser }>('/auth/me');
    return r.user;
  },
  async logout(): Promise<void> {
    try { await apiPost('/auth/logout'); } catch { /* server is best-effort */ }
    clearTokens();
  },
  acceptOAuthTokens(access: string, refresh: string): void { setTokens(access, refresh); },
  oauthStartUrl(provider: 'google' | 'apple'): string {
    return `${apiBaseUrl()}/api/auth/${provider}`;
  },

  forgotPassword: (email: string) =>
    apiPost('/auth/forgot-password', { email }, { skipAuth: true }),
  resetPassword: (email: string, token: string, newPassword: string) =>
    apiPost('/auth/reset-password', { email, token, newPassword }, { skipAuth: true }),
  verifyEmail: (email: string, token: string) =>
    apiPost('/auth/verify-email', { email, token }, { skipAuth: true }),
  resendVerification: () => apiPost('/auth/resend-verification'),
};
