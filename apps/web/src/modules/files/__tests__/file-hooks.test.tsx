import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useUploadFile } from '../hooks/useUploadFile';
import { useDeleteFile } from '../hooks/useDeleteFile';
import { useTaskAttachments } from '../hooks/useTaskAttachments';
import { useCreateTaskAttachment } from '../hooks/useCreateTaskAttachment';
import { useDeleteTaskAttachment } from '../hooks/useDeleteTaskAttachment';
import { useCommunicationAttachments } from '../hooks/useCommunicationAttachments';
import { useCreateCommunicationAttachment } from '../hooks/useCreateCommunicationAttachment';
import { useDeleteCommunicationAttachment } from '../hooks/useDeleteCommunicationAttachment';
import { apiClient } from '@/api/client';
import type { TaskAttachment, CommunicationAttachment, FileAsset } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    upload: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockFileAsset: FileAsset = {
  id: 'file-1',
  institutionId: 'inst-1',
  originalName: 'documento.pdf',
  storageKey: 'inst-1/files/abc123.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  checksum: 'abc123',
  status: 'ACTIVE',
  uploadedByUserId: 'user-1',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const mockTaskAttachment: TaskAttachment = {
  id: 'att-1',
  institutionId: 'inst-1',
  taskId: 'task-1',
  fileAssetId: 'file-1',
  createdAt: '2026-01-15T10:00:00Z',
  fileAsset: mockFileAsset,
};

const mockCommAttachment: CommunicationAttachment = {
  id: 'att-2',
  institutionId: 'inst-1',
  communicationId: 'comm-1',
  fileAssetId: 'file-1',
  createdAt: '2026-01-15T10:00:00Z',
  fileAsset: mockFileAsset,
};

describe('File upload hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useUploadFile', () => {
    it('uploads a file successfully', async () => {
      vi.mocked(apiClient.upload).mockResolvedValue(mockFileAsset);

      const { result } = renderHook(() => useUploadFile(), { wrapper: createWrapper() });

      const file = new File(['test'], 'documento.pdf', { type: 'application/pdf' });
      result.current.mutate(file);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockFileAsset);
      expect(apiClient.upload).toHaveBeenCalledWith('/files', file);
    });
  });

  describe('useDeleteFile', () => {
    it('deletes a file successfully', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ message: 'File deleted successfully' });

      const { result } = renderHook(() => useDeleteFile(), { wrapper: createWrapper() });

      result.current.mutate('file-1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiClient.delete).toHaveBeenCalledWith('/files/file-1');
    });
  });

  describe('useTaskAttachments', () => {
    it('fetches task attachments', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([mockTaskAttachment]);

      const { result } = renderHook(() => useTaskAttachments('task-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].fileAsset.originalName).toBe('documento.pdf');
    });

    it('does not fetch when taskId is empty', () => {
      renderHook(() => useTaskAttachments(''), { wrapper: createWrapper() });
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateTaskAttachment', () => {
    it('creates a task attachment', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockTaskAttachment);

      const { result } = renderHook(() => useCreateTaskAttachment(), { wrapper: createWrapper() });

      result.current.mutate({ taskId: 'task-1', fileAssetId: 'file-1' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiClient.post).toHaveBeenCalledWith('/tasks/task-1/attachments', {
        fileAssetId: 'file-1',
      });
    });
  });

  describe('useDeleteTaskAttachment', () => {
    it('deletes a task attachment', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteTaskAttachment(), { wrapper: createWrapper() });

      result.current.mutate({ taskId: 'task-1', attachmentId: 'att-1' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiClient.delete).toHaveBeenCalledWith('/tasks/task-1/attachments/att-1');
    });
  });

  describe('useCommunicationAttachments', () => {
    it('fetches communication attachments', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([mockCommAttachment]);

      const { result } = renderHook(() => useCommunicationAttachments('comm-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
    });

    it('does not fetch when communicationId is empty', () => {
      renderHook(() => useCommunicationAttachments(''), { wrapper: createWrapper() });
      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateCommunicationAttachment', () => {
    it('creates a communication attachment', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(mockCommAttachment);

      const { result } = renderHook(() => useCreateCommunicationAttachment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ communicationId: 'comm-1', fileAssetId: 'file-1' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiClient.post).toHaveBeenCalledWith('/communications/comm-1/attachments', {
        fileAssetId: 'file-1',
      });
    });
  });

  describe('useDeleteCommunicationAttachment', () => {
    it('deletes a communication attachment', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useDeleteCommunicationAttachment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ communicationId: 'comm-1', attachmentId: 'att-2' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiClient.delete).toHaveBeenCalledWith('/communications/comm-1/attachments/att-2');
    });
  });
});
