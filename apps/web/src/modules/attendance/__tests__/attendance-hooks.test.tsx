import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useAttendances } from '../hooks/useAttendances';
import { useAttendance } from '../hooks/useAttendance';
import { useCreateAttendance } from '../hooks/useCreateAttendance';
import { useUpdateAttendance } from '../hooks/useUpdateAttendance';
import { useDeleteAttendance } from '../hooks/useDeleteAttendance';
import { useBulkCreateAttendance } from '../hooks/useBulkCreateAttendance';
import { apiClient } from '@/api/client';
import type { Attendance, PaginatedApiResponse } from '@/api/types';

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

const mockAttendance: Attendance = {
  id: 'att-1',
  institutionId: 'inst-1',
  studentId: 'student-1',
  courseId: 'course-1',
  academicPeriodId: 'period-1',
  date: '2026-04-05T00:00:00.000Z',
  status: 'PRESENT',
  notes: null,
  recordedById: 'user-1',
  createdAt: '2026-04-05T10:00:00Z',
  updatedAt: '2026-04-05T10:00:00Z',
};

describe('Attendance hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAttendances', () => {
    it('fetches paginated attendance records', async () => {
      const mockResponse: PaginatedApiResponse<Attendance> = {
        data: [mockAttendance],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAttendances({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/attendance?page=1&limit=20');
    });

    it('sends course, student, period and date filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

      renderHook(
        () =>
          useAttendances({
            courseId: 'course-1',
            studentId: 'student-1',
            academicPeriodId: 'period-1',
            date: '2026-04-05',
            status: 'ABSENT',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      const url = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(url).toContain('courseId=course-1');
      expect(url).toContain('studentId=student-1');
      expect(url).toContain('academicPeriodId=period-1');
      expect(url).toContain('date=2026-04-05');
      expect(url).toContain('status=ABSENT');
    });
  });

  describe('useAttendance', () => {
    it('fetches a single attendance by id', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(mockAttendance);

      const { result } = renderHook(() => useAttendance('att-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockAttendance);
      expect(apiClient.get).toHaveBeenCalledWith('/attendance/att-1');
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(() => useAttendance(''), { wrapper: createWrapper() });
      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateAttendance', () => {
    it('creates an attendance record via POST', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockAttendance);

      const { result } = renderHook(() => useCreateAttendance(), { wrapper: createWrapper() });

      const created = await result.current.mutateAsync({
        studentId: 'student-1',
        courseId: 'course-1',
        academicPeriodId: 'period-1',
        date: '2026-04-05',
        status: 'PRESENT',
        notes: null,
      });

      expect(created).toEqual(mockAttendance);
      expect(apiClient.post).toHaveBeenCalledWith('/attendance', {
        studentId: 'student-1',
        courseId: 'course-1',
        academicPeriodId: 'period-1',
        date: '2026-04-05',
        status: 'PRESENT',
        notes: null,
      });
    });
  });

  describe('useUpdateAttendance', () => {
    it('updates an attendance with patch', async () => {
      const updated = { ...mockAttendance, status: 'EXCUSED' as const };
      vi.mocked(apiClient.patch).mockResolvedValue(updated);

      const { result } = renderHook(() => useUpdateAttendance(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync({
        id: 'att-1',
        data: { status: 'EXCUSED', notes: 'Justificado' },
      });

      expect(res.status).toBe('EXCUSED');
      expect(apiClient.patch).toHaveBeenCalledWith('/attendance/att-1', {
        status: 'EXCUSED',
        notes: 'Justificado',
      });
    });
  });

  describe('useDeleteAttendance', () => {
    it('deletes an attendance record', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteAttendance(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync('att-1');
      expect(res.success).toBe(true);
      expect(apiClient.delete).toHaveBeenCalledWith('/attendance/att-1');
    });
  });

  describe('useBulkCreateAttendance', () => {
    it('bulk creates attendance via POST /attendance/bulk', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ created: 2, skipped: 1, total: 3 });

      const { result } = renderHook(() => useBulkCreateAttendance(), { wrapper: createWrapper() });

      const res = await result.current.mutateAsync({
        courseId: 'course-1',
        academicPeriodId: 'period-1',
        date: '2026-04-05',
        records: [
          { studentId: 's1', status: 'PRESENT' },
          { studentId: 's2', status: 'ABSENT', notes: 'Sin justificar' },
        ],
      });

      expect(res.created).toBe(2);
      expect(vi.mocked(apiClient.post).mock.calls[0][0]).toBe('/attendance/bulk');
      const body = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>;
      expect(body.courseId).toBe('course-1');
      expect((body.records as unknown[]).length).toBe(2);
    });
  });
});
