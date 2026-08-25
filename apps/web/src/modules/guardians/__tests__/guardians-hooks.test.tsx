import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useGuardianStudents } from '../hooks/useGuardianStudents';
import { useGuardiansByStudent } from '../hooks/useGuardiansByStudent';
import { useLinkGuardian } from '../hooks/useLinkGuardian';
import { useUnlinkGuardian } from '../hooks/useUnlinkGuardian';
import { apiClient } from '@/api/client';
import type { GuardianStudentWithStudent, GuardianStudent, PaginatedApiResponse, DocumentType } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

const mockStudent = {
  id: 'stu-1',
  institutionId: 'inst-1',
  firstName: 'Juan',
  lastName: 'Pérez',
  documentType: 'CC' as DocumentType,
  documentNumber: '1234567890',
  dateOfBirth: '2010-01-15',
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const mockGuardianLink: GuardianStudentWithStudent = {
  id: 'gs-1',
  institutionId: 'inst-1',
  guardianUserId: 'user-1',
  studentId: 'stu-1',
  relationshipType: 'FATHER',
  isPrimary: true,
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
  student: mockStudent,
};

const mockGuardianLinkOnly: GuardianStudent = {
  id: 'gs-1',
  institutionId: 'inst-1',
  guardianUserId: 'user-1',
  studentId: 'stu-1',
  relationshipType: 'FATHER',
  isPrimary: true,
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

describe('Guardians hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useGuardianStudents', () => {
    it('fetches paginated guardian students with student data', async () => {
      const mockResponse: PaginatedApiResponse<GuardianStudentWithStudent> = {
        data: [mockGuardianLink],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGuardianStudents({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/guardians/students?page=1&limit=20');
    });

    it('sends search param', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

      renderHook(() => useGuardianStudents({ page: 1, limit: 20, search: 'juan' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      const callUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(callUrl).toContain('search=juan');
    });
  });

  describe('useGuardiansByStudent', () => {
    it('fetches guardians for a specific student', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([mockGuardianLinkOnly]);

      const { result } = renderHook(() => useGuardiansByStudent('stu-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([mockGuardianLinkOnly]);
      expect(apiClient.get).toHaveBeenCalledWith('/guardians/students/stu-1/guardians');
    });

    it('does not fetch when studentId is empty', () => {
      const { result } = renderHook(() => useGuardiansByStudent(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useLinkGuardian', () => {
    it('links a guardian to a student', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockGuardianLinkOnly);

      const { result } = renderHook(() => useLinkGuardian(), {
        wrapper: createWrapper(),
      });

      const created = await result.current.mutateAsync({
        studentId: 'stu-1',
        data: { studentId: 'stu-1', relationshipType: 'FATHER', isPrimary: true },
      });

      expect(created).toEqual(mockGuardianLinkOnly);
      expect(apiClient.post).toHaveBeenCalledWith('/guardians/students/stu-1', {
        studentId: 'stu-1',
        relationshipType: 'FATHER',
        isPrimary: true,
      });
    });
  });

  describe('useUnlinkGuardian', () => {
    it('unlinks a guardian from a student', async () => {
      const unlinked = { ...mockGuardianLinkOnly, status: 'INACTIVE' as const };
      vi.mocked(apiClient.delete).mockResolvedValue(unlinked);

      const { result } = renderHook(() => useUnlinkGuardian(), {
        wrapper: createWrapper(),
      });

      const res = await result.current.mutateAsync('stu-1');
      expect(res.status).toBe('INACTIVE');
      expect(apiClient.delete).toHaveBeenCalledWith('/guardians/students/stu-1');
    });
  });
});
