import type { ApiError } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken: string | null = null;
let institutionId: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const apiClient = {
  setAccessToken(token: string | null) {
    accessToken = token;
  },
  setInstitutionId(id: string | null) {
    institutionId = id;
  },
  setOnUnauthorized(handler: (() => void) | null) {
    onUnauthorized = handler;
  },
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const requestId = crypto.randomUUID();
    const headers: Record<string, string> = {
      'X-Request-Id': requestId,
      ...(options.headers as Record<string, string>),
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    if (institutionId) {
      headers['X-Institution-Id'] = institutionId;
    }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      onUnauthorized?.();
      throw { statusCode: 401, message: 'Unauthorized', timestamp: new Date().toISOString(), path } as ApiError;
    }

    if (!response.ok) {
      let errorBody: ApiError;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = {
          statusCode: response.status,
          message: response.statusText || 'Request failed',
          timestamp: new Date().toISOString(),
          path,
          requestId,
        };
      }
      throw errorBody;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  },
  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  },
  upload<T>(path: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<T>(path, { method: 'POST', body: formData });
  },
};
