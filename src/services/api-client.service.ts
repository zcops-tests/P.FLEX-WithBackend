import { Injectable, inject } from '@angular/core';
import { BrowserStorageService } from './browser-storage.service';

interface RequestOptions {
  auth?: boolean;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
  retryOnAuthFailure?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private storage = inject(BrowserStorageService);
  private readonly accessTokenKey = 'pflex_access_token';
  private readonly refreshTokenKey = 'pflex_refresh_token';
  private readonly sessionKey = 'pflex_session';
  private refreshPromise: Promise<boolean> | null = null;

  get baseUrl(): string {
    const globalValue = (window as any).__PFLEX_API_URL__;
    const storedValue = this.storage.getItem('PFLEX_API_URL');
    const configured = globalValue || storedValue;
    const fallback =
      window.location.hostname === 'localhost' && window.location.port === '4200'
        ? 'http://localhost:3000/api/v1'
        : `${window.location.origin}/api/v1`;
    return String(configured || fallback).replace(/\/+$/, '');
  }

  get accessToken(): string | null {
    return this.storage.getItem(this.accessTokenKey);
  }

  get refreshToken(): string | null {
    return this.storage.getItem(this.refreshTokenKey);
  }

  get session(): Record<string, unknown> | null {
    const raw = this.storage.getItem(this.sessionKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  setSession(tokens: { accessToken: string; refreshToken: string; sessionId?: string }, session?: Record<string, unknown>) {
    this.storage.setItem(this.accessTokenKey, tokens.accessToken);
    this.storage.setItem(this.refreshTokenKey, tokens.refreshToken);
    this.storage.setItem(
      this.sessionKey,
      JSON.stringify({
        ...(session || {}),
        sessionId: tokens.sessionId || null,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  clearSession() {
    this.storage.removeItem(this.accessTokenKey);
    this.storage.removeItem(this.refreshTokenKey);
    this.storage.removeItem(this.sessionKey);
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  async post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  async put<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  async patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  async upload<T>(path: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
    const headers = { ...(options.headers || {}) };
    return this.rawRequest<T>('POST', path, {
      ...options,
      headers,
      body: formData,
    });
  }

  async download(path: string, options: RequestOptions = {}): Promise<Blob> {
    const response = await this.fetchWithAuth('GET', path, options);
    if (!response.ok) {
      await this.throwApiError(response);
    }
    return response.blob();
  }

  private async request<T>(method: string, path: string, options: RequestOptions): Promise<T> {
    return this.rawRequest<T>(method, path, options);
  }

  private async rawRequest<T>(method: string, path: string, options: RequestOptions): Promise<T> {
    const response = await this.fetchWithAuth(method, path, options);
    if (!response.ok) {
      await this.throwApiError(response);
    }

    if (response.status === 204) {
      return null as T;
    }

    const text = await response.text();
    if (!text) {
      return null as T;
    }

    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'success' in parsed) {
      return parsed.data as T;
    }
    return parsed as T;
  }

  private async fetchWithAuth(method: string, path: string, options: RequestOptions): Promise<Response> {
    const retryOnAuthFailure = options.retryOnAuthFailure ?? true;
    const response = await this.executeFetch(method, path, options);

    if (response.status === 401 && options.auth !== false && retryOnAuthFailure && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.executeFetch(method, path, {
          ...options,
          retryOnAuthFailure: false,
        });
      }
    }

    return response;
  }

  private async executeFetch(method: string, path: string, options: RequestOptions): Promise<Response> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    };

    if (options.auth !== false && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    return fetch(url, {
      method,
      headers,
      body: options.body instanceof FormData || options.body === undefined ? (options.body as BodyInit | null | undefined) : JSON.stringify(options.body),
      credentials: 'same-origin',
      cache: 'no-store',
    });
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    Object.entries(query || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });

    return url.toString();
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (!response.ok) {
          this.clearSession();
          return false;
        }

        const payload = await response.json();
        const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
        this.setSession(
          {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            sessionId: (this.session?.sessionId as string | undefined) || data.sessionId,
          },
          this.session || undefined,
        );
        return true;
      } catch {
        this.clearSession();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async throwApiError(response: Response): Promise<never> {
    let message = `HTTP ${response.status}`;
    try {
      const payload = await response.json();
      const error = payload?.error;
      message =
        error?.message ||
        payload?.message ||
        (Array.isArray(error?.message) ? error.message.join(', ') : null) ||
        message;
    } catch {
      // Ignore JSON parsing errors and preserve generic message.
    }
    throw new Error(message);
  }
}
