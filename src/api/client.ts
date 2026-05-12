// Tiny fetch wrapper that:
//  • prefixes every request with /api
//  • attaches the bearer token from localStorage
//  • transparently refreshes once on 401 (with de-dup so concurrent calls
//    only refresh one time)
//  • throws ApiError on non-2xx
//  • fires a 'duchex:auth:logout' window event when refresh fails so the
//    AuthContext can drop the user

const API_BASE  = import.meta.env.VITE_API_BASE_URL ?? '';
const API_PATH  = '/api';
const TOKEN_KEY = 'duchex.auth.tokens.v1';

interface Tokens { access: string; refresh: string }

let tokens: Tokens | null = null;
let refreshInFlight: Promise<void> | null = null;

function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Tokens;
    if (parsed?.access && parsed?.refresh) return parsed;
  } catch { /* ignore */ }
  return null;
}

function persistTokens(t: Tokens | null): void {
  if (t) localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
  else   localStorage.removeItem(TOKEN_KEY);
  tokens = t;
}

export function setTokens(access: string, refresh: string): void {
  persistTokens({ access, refresh });
}

export function clearTokens(): void {
  persistTokens(null);
}

export function getAccessToken(): string | null {
  if (!tokens) tokens = loadTokens();
  return tokens?.access ?? null;
}

export function hasTokens(): boolean {
  return getAccessToken() !== null;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, details?: unknown) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function refreshTokens(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  const current = tokens ?? loadTokens();
  if (!current?.refresh) throw new ApiError(401, 'no_refresh_token');

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}${API_PATH}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refresh }),
      });
      if (!res.ok) throw new ApiError(res.status, 'refresh_failed');
      const data = await res.json() as { accessToken: string; refreshToken: string };
      persistTokens({ access: data.accessToken, refresh: data.refreshToken });
    } catch (err) {
      persistTokens(null);
      window.dispatchEvent(new Event('duchex:auth:logout'));
      throw err;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  _retry?: boolean;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, skipAuth, _retry, headers: hdrs, ...rest } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(hdrs as Record<string, string> ?? {}) };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${API_PATH}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Single transparent retry after refreshing the access token.
  if (res.status === 401 && !skipAuth && !_retry) {
    try {
      await refreshTokens();
      return api<T>(path, { ...options, _retry: true });
    } catch {
      throw new ApiError(401, 'unauthorized');
    }
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = text; }
  }

  if (!res.ok) {
    const errCode =
      typeof data === 'object' && data && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `http_${res.status}`;
    throw new ApiError(res.status, errCode, data);
  }
  return data as T;
}

export const apiGet  = <T = unknown>(path: string, opts: ApiOptions = {}) => api<T>(path, { ...opts, method: 'GET' });
export const apiPost = <T = unknown>(path: string, body?: unknown, opts: ApiOptions = {}) =>
  api<T>(path, { ...opts, method: 'POST', body });
export const apiPatch = <T = unknown>(path: string, body?: unknown, opts: ApiOptions = {}) =>
  api<T>(path, { ...opts, method: 'PATCH', body });

export function apiBaseUrl(): string {
  return API_BASE;
}

export function socketUrl(): string {
  return import.meta.env.VITE_SOCKET_URL || API_BASE || window.location.origin;
}
