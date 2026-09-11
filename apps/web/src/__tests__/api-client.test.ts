import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/api/client';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.setAccessToken(null);
    apiClient.setInstitutionId(null);
    apiClient.setOnUnauthorized(null);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });
  });

  it('adds Authorization header when token is set', async () => {
    apiClient.setAccessToken('test-token');
    await apiClient.get('/test');
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer test-token');
  });

  it('adds X-Institution-Id header when institution is set', async () => {
    apiClient.setInstitutionId('inst-123');
    await apiClient.get('/test');
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['X-Institution-Id']).toBe('inst-123');
  });

  it('adds X-Request-Id header', async () => {
    await apiClient.get('/test');
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['X-Request-Id']).toBeDefined();
  });

  it('calls onUnauthorized on 401', async () => {
    const handler = vi.fn();
    apiClient.setOnUnauthorized(handler);
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await apiClient.get('/test').catch(() => {});
    expect(handler).toHaveBeenCalled();
  });

  it('throws error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({ statusCode: 404, message: 'Not found', timestamp: '', path: '/test' }),
    });
    await expect(apiClient.get('/test')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('makes POST requests with JSON body', async () => {
    await apiClient.post('/test', { key: 'value' });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ key: 'value' }));
  });
});
