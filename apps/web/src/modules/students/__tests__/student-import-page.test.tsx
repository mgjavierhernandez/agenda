import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { type ReactNode } from 'react';
import { StudentImportPage } from '../pages/StudentImportPage';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    permissionCodes: ['students:manage'],
    isLoading: false,
    isError: false,
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
  }),
}));

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({ selectedInstitutionId: 'inst-1' }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={['/students/import']}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('StudentImportPage (GAP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url.startsWith('/courses')) {
        return Promise.resolve({
          data: [{ id: 'c-1', code: '2A', name: 'Segundo A' }],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
        });
      }
      if (url.startsWith('/academic-periods')) {
        return Promise.resolve({
          data: [{ id: 'p-1', code: '2026-P1', name: 'Periodo 1' }],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
        });
      }
      return Promise.resolve(undefined as never);
    });
  });

  it('renders the import form with course and period selectors', async () => {
    render(<StudentImportPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Importar estudiantes')).toBeInTheDocument();
    expect(screen.getByLabelText(/Archivo/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('2A — Segundo A')).toBeInTheDocument();
    });
  });

  it('uploads the file and shows the summary with errors', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      created: 1,
      updated: 0,
      enrollments: 1,
      errors: [{ row: 3, field: 'documentType', message: 'Invalid documentType' }],
    });

    render(<StudentImportPage />, { wrapper: createWrapper() });

    const file = new File(['a,b'], 'students.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/Archivo/) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText('Importar'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/students/import', expect.any(FormData));
    });
    expect(screen.getByText(/Creados: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Errores: 1/)).toBeInTheDocument();
    expect(screen.getByText('Invalid documentType')).toBeInTheDocument();
  });

  it('warns when no file is selected', async () => {
    render(<StudentImportPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Importar'));

    await waitFor(() => {
      expect(screen.getByText(/Selecciona un archivo/)).toBeInTheDocument();
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
