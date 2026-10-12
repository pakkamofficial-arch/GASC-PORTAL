import { Platform } from 'react-native';

const normalizeApiUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
};

// Standard production/local endpoint:
// In production builds, EXPO_PUBLIC_API_URL provides the deployed backend URL
// For local development, Android Emulator uses 10.0.2.2:5000, Web/iOS uses localhost:5000
const rawApiBase =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api/v1'
    : 'http://localhost:5000/api/v1');

const DEFAULT_API_BASE = normalizeApiUrl(rawApiBase);

const DEFAULT_TIMEOUT_MS = 15000; // 15-second timeout for mobile networks

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
  idempotencyKey?: string;
}

export interface ApiResponseData<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

class ApiService {
  private baseUrl: string = DEFAULT_API_BASE;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onUnauthorizedCallback?: () => void;

  public setBaseUrl(url: string) {
    this.baseUrl = normalizeApiUrl(url);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setTokens(access: string | null, refresh: string | null) {
    this.accessToken = access;
    this.refreshToken = refresh;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  public onUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  public async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponseData<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken && !headers.Authorization) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    if (options.idempotencyKey) {
      headers['X-Idempotency-Key'] = options.idempotencyKey;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await response.json().catch(() => ({
        success: false,
        message: `Server returned HTTP status ${response.status}`,
      }));

      // Handle token expiration (401) with auto-refresh
      if (
        response.status === 401 &&
        this.refreshToken &&
        !endpoint.includes('/auth/refresh') &&
        !endpoint.includes('/auth/login')
      ) {
        const refreshSuccess = await this.tryRefreshToken();
        if (refreshSuccess) {
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return await retryResponse.json();
        } else {
          // Invalidate session cleanly
          this.setTokens(null, null);
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
        }
      }

      if (!response.ok) {
        return {
          success: false,
          message: json.message || `Request failed with status ${response.status}`,
          errors: json.errors,
        };
      }

      return json;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Network request timed out. Please check your connection and retry.',
        };
      }

      const msg = error.message || '';
      if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
        return {
          success: false,
          message: 'Unable to connect to the college server. Please verify Wi-Fi/mobile data.',
        };
      }

      return {
        success: false,
        message: msg || 'An unexpected network error occurred.',
      };
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.success && data.data?.accessToken) {
        this.accessToken = data.data.accessToken;
        this.refreshToken = data.data.refreshToken;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Convenience methods
  public get<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponseData<T>> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  public post<T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponseData<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  public put<T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponseData<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  public patch<T = any>(endpoint: string, body?: any, options?: ApiRequestOptions): Promise<ApiResponseData<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  public delete<T = any>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponseData<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }
}

export const api = new ApiService();
