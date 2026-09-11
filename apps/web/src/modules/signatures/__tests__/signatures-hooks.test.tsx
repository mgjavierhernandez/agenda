import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useSignatures } from '../hooks/useSignatures';
import { useSignature } from '../hooks/useSignature';
import { useCreateSignature } from '../hooks/useCreateSignature';
import { useUpdateSignature } from '../hooks/useUpdateSignature';
import { useSignSignature } from '../hooks/useSignSignature';
import { useDeclineSignature } from '../hooks/useDeclineSignature';
import { usePublishSignature } from '../hooks/usePublishSignature';
import { useDeactivateSignature } from '../hooks/useDeactivateSignature';
import { apiClient } from '@/api/client';
import type { SignatureRequest, PaginatedApiResponse } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockSignature: SignatureRequest = {
  id: 'sig-1',
  institutionId: 'inst-1',
  title: 'Autorización de excursión',
  description: 'Firma para autorizar la excursión escolar',
  status: 'DRAFT',
  dueDate: null,
  createdAt: '2026-08-01T10:00:00Z',
  updatedAt: '2026-08-01T10:00:00Z',
  recipients: [],
};

describe('Signatures hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSignatures', () => {
    it('fetches paginated signatures', async () => {
      const mockResponse: PaginatedApiResponse<SignatureRequest> = {
        data: [mockSignature],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSignatures({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/signature-requests?page=1&limit=20');
    });

    it('sends search and filter params', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      renderHook(() => useSignatures({ page: 2, limit: 10, search: 'test', status: 'PUBLISHED' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=10');
      expect(callUrl).toContain('search=test');
      expect(callUrl).toContain('status=PUBLISHED');
    });
  });

  describe('useSignature', () => {
    it('fetches a single signature by id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockSignature);

      const { result } = renderHook(() => useSignature('sig-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSignature);
      expect(apiClient.get).toHaveBeenCalledWith('/signature-requests/sig-1');
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(() => useSignature(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateSignature', () => {
    it('creates signature and invalidates list', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockSignature);

      const { result } = renderHook(() => useCreateSignature(), {
        wrapper: createWrapper(),
      });

      const created = await result.current.mutateAsync({
        title: 'Autorización de excursión',
        recipientUserIds: ['user-1'],
      });

      expect(created).toEqual(mockSignature);
      expect(apiClient.post).toHaveBeenCalledWith('/signature-requests', {
        title: 'Autorización de excursión',
        recipientUserIds: ['user-1'],
      });
    });
  });

  describe('useUpdateSignature', () => {
    it('updates signature with patch', async () => {
      const updated = { ...mockSignature, title: 'Título actualizado' };
      vi.mocked(apiClient.patch).mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateSignature(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync({
        id: 'sig-1',
        data: { title: 'Título actualizado' },
      });

      expect(res).toEqual(updated);
      expect(apiClient.patch).toHaveBeenCalledWith('/signature-requests/sig-1', {
        title: 'Título actualizado',
      });
    });
  });

  describe('useSignSignature', () => {
    it('signs a signature request', async () => {
      const signed = { ...mockSignature, status: 'COMPLETED' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(signed);

      const { result } = renderHook(() => useSignSignature(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('sig-1');
      expect(res.status).toBe('COMPLETED');
      expect(apiClient.patch).toHaveBeenCalledWith('/signature-requests/sig-1/sign');
    });
  });

  describe('useDeclineSignature', () => {
    it('declines a signature request', async () => {
      vi.mocked(apiClient.patch).mockResolvedValue(mockSignature);

      const { result } = renderHook(() => useDeclineSignature(), {
        wrapper: createWrapper(),
      });

      await result.current.mutateAsync('sig-1');
      expect(apiClient.patch).toHaveBeenCalledWith('/signature-requests/sig-1/decline');
    });
  });

  describe('usePublishSignature', () => {
    it('publishes a signature request', async () => {
      const published = { ...mockSignature, status: 'PUBLISHED' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(published);

      const { result } = renderHook(() => usePublishSignature(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('sig-1');
      expect(res.status).toBe('PUBLISHED');
      expect(apiClient.patch).toHaveBeenCalledWith('/signature-requests/sig-1/publish');
    });
  });

  describe('useDeactivateSignature', () => {
    it('deactivates a signature request', async () => {
      const deactivated = { ...mockSignature, status: 'INACTIVE' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(deactivated);

      const { result } = renderHook(() => useDeactivateSignature(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('sig-1');
      expect(res.status).toBe('INACTIVE');
      expect(apiClient.patch).toHaveBeenCalledWith('/signature-requests/sig-1/deactivate');
    });
  });
});
