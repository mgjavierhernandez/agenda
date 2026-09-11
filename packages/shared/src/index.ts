export const APP_NAME = 'Agenda Escolar Digital';

export const API_PREFIX = '/api/v1';

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface HealthResponse {
  status: 'ok';
}
