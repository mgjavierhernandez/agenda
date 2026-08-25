import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { FileUploader } from '../components/FileUploader';
import { AttachmentList } from '../components/AttachmentList';
import { formatFileSize } from '../utils';
import { apiClient } from '@/api/client';
import type { TaskAttachment, FileAsset } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    upload: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', status: 'ACTIVE' },
    selectedInstitutionId: 'inst-1',
  }),
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

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });
});

describe('FileUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area with instructions', () => {
    const onUploadComplete = vi.fn();
    render(<FileUploader onUploadComplete={onUploadComplete} />, { wrapper: createWrapper() });

    expect(screen.getByText(/arrastra un archivo/i)).toBeInTheDocument();
    expect(screen.getByText(/selecciona/i)).toBeInTheDocument();
  });

  it('shows disabled state when disabled prop is true', () => {
    const onUploadComplete = vi.fn();
    const { container } = render(<FileUploader onUploadComplete={onUploadComplete} disabled />, { wrapper: createWrapper() });
    const dropzone = container.querySelector('.opacity-50');
    expect(dropzone).toBeInTheDocument();
  });

  it('rejects files exceeding 10MB', async () => {
    vi.mocked(apiClient.upload).mockResolvedValue(mockFileAsset);
    const onUploadComplete = vi.fn();
    render(<FileUploader onUploadComplete={onUploadComplete} />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(await screen.findByText(/excede el tamaño máximo/i)).toBeInTheDocument();
    expect(apiClient.upload).not.toHaveBeenCalled();
  });

  it('rejects disallowed MIME types', async () => {
    vi.mocked(apiClient.upload).mockResolvedValue(mockFileAsset);
    const onUploadComplete = vi.fn();
    render(<FileUploader onUploadComplete={onUploadComplete} />, { wrapper: createWrapper() });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const exeFile = new File(['test'], 'malware.exe', { type: 'application/x-msdownload' });

    fireEvent.change(input, { target: { files: [exeFile] } });

    expect(await screen.findByText(/tipo de archivo no permitido/i)).toBeInTheDocument();
    expect(apiClient.upload).not.toHaveBeenCalled();
  });
});

describe('AttachmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no attachments', () => {
    render(<AttachmentList attachments={[]} canManage={false} />, { wrapper: createWrapper() });
    expect(screen.getByText('No hay archivos adjuntos.')).toBeInTheDocument();
  });

  it('renders attachment with file name and size', () => {
    render(<AttachmentList attachments={[mockTaskAttachment]} canManage={false} />, { wrapper: createWrapper() });
    expect(screen.getByText('documento.pdf')).toBeInTheDocument();
    expect(screen.getByText(/1\.0 KB/)).toBeInTheDocument();
    expect(screen.getByText(/application\/pdf/)).toBeInTheDocument();
  });

  it('shows download button', () => {
    render(<AttachmentList attachments={[mockTaskAttachment]} canManage={false} />, { wrapper: createWrapper() });
    expect(screen.getByText('Descargar')).toBeInTheDocument();
  });

  it('shows delete button when canManage is true', () => {
    render(<AttachmentList attachments={[mockTaskAttachment]} canManage />, { wrapper: createWrapper() });
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('hides delete button when canManage is false', () => {
    render(<AttachmentList attachments={[mockTaskAttachment]} canManage={false} />, { wrapper: createWrapper() });
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
  });

  it('renders correct file icon for PDF', () => {
    render(<AttachmentList attachments={[mockTaskAttachment]} canManage={false} />, { wrapper: createWrapper() });
    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('renders correct file icon for images', () => {
    const imageAttachment = {
      ...mockTaskAttachment,
      fileAsset: { ...mockFileAsset, mimeType: 'image/png' },
    };
    render(<AttachmentList attachments={[imageAttachment]} canManage={false} />, { wrapper: createWrapper() });
    expect(screen.getByText('🖼️')).toBeInTheDocument();
  });
});
