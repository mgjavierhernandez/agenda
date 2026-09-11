import type { ApiError } from './types';

// Normaliza la URL base: sin espacios accidentales ni barras finales,
// para que `${API_URL}${path}` nunca genere rutas como `/api/v1%20/...`.
const API_URL = (import.meta.env.VITE_API_URL || '/api/v1').trim().replace(/\/+$/, '');

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
  async download(path: string, fallbackFilename: string): Promise<void> {
    const requestId = crypto.randomUUID();
    const headers: Record<string, string> = { 'X-Request-Id': requestId };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    if (institutionId) {
      headers['X-Institution-Id'] = institutionId;
    }

    const response = await fetch(`${API_URL}${path}`, { method: 'GET', headers });

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

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const filename = match ? decodeURIComponent(match[1].trim()) : fallbackFilename;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
