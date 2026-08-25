import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { SchoolGradesPage } from '../pages/SchoolGradesPage';
import { SchoolGradeDetailPage } from '../pages/SchoolGradeDetailPage';
import { SchoolGradeFormPage } from '../pages/SchoolGradeFormPage';
import { apiClient } from '@/api/client';
import type { SchoolGrade, PaginatedApiResponse } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockHasPermission = vi.fn().mockReturnValue(true);

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    roles: [],
    permissionCodes: [],
    hasPermission: mockHasPermission,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    hasRole: () => false,
  }),
}));

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
  }),
}));

let mockParams: Record<string, string> = {};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
  };
});

const mockGrade: SchoolGrade = {
  id: 'sg-1',
  institutionId: 'inst-1',
  name: 'Preescolar',
  code: 'PRE',
  sortOrder: 0,
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const createWrapper = (initialEntries?: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('SchoolGradesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it('renders the page header', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

    render(<SchoolGradesPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Grados académicos')).toBeInTheDocument();
  });

  it('renders empty state when no grades', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

    render(<SchoolGradesPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay grados académicos')).toBeInTheDocument();
    });
  });

  it('renders grades in a table', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockGrade],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<SchoolGrade>);

    render(<SchoolGradesPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Preescolar').length).toBeGreaterThan(0);
    });
  });

  it('shows new grade button for managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

    render(<SchoolGradesPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Nuevo grado')).toBeInTheDocument();
    });
  });

  it('hides new grade button for non-managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    mockHasPermission.mockImplementation((perm: string) => perm !== 'school-grades:manage');

    render(<SchoolGradesPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Nuevo grado')).not.toBeInTheDocument();
    });
  });

  it('renders grade code', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockGrade],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<SchoolGrade>);

    render(<SchoolGradesPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('PRE').length).toBeGreaterThan(0);
    });
  });

  it('renders status badge', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [mockGrade],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    } as PaginatedApiResponse<SchoolGrade>);

    render(<SchoolGradesPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Activo').length).toBeGreaterThan(0);
    });
  });
});

describe('SchoolGradeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockParams = { id: 'sg-1' };
  });

  it('renders grade details', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGrade);

    render(<SchoolGradeDetailPage />, { wrapper: createWrapper(['/school-grades/sg-1']) });

    await waitFor(() => {
      expect(screen.getAllByText('Preescolar').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders grade code', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGrade);

    render(<SchoolGradeDetailPage />, { wrapper: createWrapper(['/school-grades/sg-1']) });

    await waitFor(() => {
      expect(screen.getByText('PRE')).toBeInTheDocument();
    });
  });

  it('shows status badge', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGrade);

    render(<SchoolGradeDetailPage />, { wrapper: createWrapper(['/school-grades/sg-1']) });

    await waitFor(() => {
      expect(screen.getByText('Activo')).toBeInTheDocument();
    });
  });

  it('shows edit button for managers', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGrade);

    render(<SchoolGradeDetailPage />, { wrapper: createWrapper(['/school-grades/sg-1']) });

    await waitFor(() => {
      expect(screen.getByText('Editar')).toBeInTheDocument();
    });
  });

  it('shows deactivate button for active grades', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGrade);

    render(<SchoolGradeDetailPage />, { wrapper: createWrapper(['/school-grades/sg-1']) });

    await waitFor(() => {
      expect(screen.getByText('Desactivar')).toBeInTheDocument();
    });
  });

  it('hides deactivate button for inactive grades', async () => {
    const inactiveGrade = { ...mockGrade, status: 'INACTIVE' as const };
    vi.mocked(apiClient.get).mockResolvedValue(inactiveGrade);

    render(<SchoolGradeDetailPage />, { wrapper: createWrapper(['/school-grades/sg-1']) });

    await waitFor(() => {
      expect(screen.queryByText('Desactivar')).not.toBeInTheDocument();
    });
  });

  it('hides edit/deactivate for non-managers', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'school-grades:manage');
    vi.mocked(apiClient.get).mockResolvedValue(mockGrade);

    render(<SchoolGradeDetailPage />, { wrapper: createWrapper(['/school-grades/sg-1']) });

    await waitFor(() => {
      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
      expect(screen.queryByText('Desactivar')).not.toBeInTheDocument();
    });
  });

  it('shows sort order', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGrade);

    render(<SchoolGradeDetailPage />, { wrapper: createWrapper(['/school-grades/sg-1']) });

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('shows back button', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGrade);

    render(<SchoolGradeDetailPage />, { wrapper: createWrapper(['/school-grades/sg-1']) });

    await waitFor(() => {
      expect(screen.getByText('Volver a grados')).toBeInTheDocument();
    });
  });
});

describe('SchoolGradeFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockParams = {};
  });

  it('renders create form', () => {
    render(<SchoolGradeFormPage />, { wrapper: createWrapper(['/school-grades/new']) });

    expect(screen.getByText('Nuevo grado académico')).toBeInTheDocument();
    expect(screen.getByText('Crear grado')).toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(<SchoolGradeFormPage />, { wrapper: createWrapper(['/school-grades/new']) });

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Código')).toBeInTheDocument();
    expect(screen.getByLabelText('Orden de visualización')).toBeInTheDocument();
  });

  it('validates required name', async () => {
    render(<SchoolGradeFormPage />, { wrapper: createWrapper(['/school-grades/new']) });

    const submitButton = screen.getByText('Crear grado');
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
    });
  });

  it('validates required code', async () => {
    render(<SchoolGradeFormPage />, { wrapper: createWrapper(['/school-grades/new']) });

    const nameInput = screen.getByLabelText('Nombre') as HTMLInputElement;
    nameInput.value = 'Test';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    const submitButton = screen.getByText('Crear grado');
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('El código es requerido')).toBeInTheDocument();
    });
  });

  it('renders edit form with existing data', async () => {
    mockParams = { id: 'sg-1' };
    vi.mocked(apiClient.get).mockResolvedValue(mockGrade);

    render(<SchoolGradeFormPage />, { wrapper: createWrapper(['/school-grades/sg-1/edit']) });

    await waitFor(() => {
      expect(screen.getByText('Editar grado académico')).toBeInTheDocument();
    });
  });

  it('hides form when user lacks permission', () => {
    mockHasPermission.mockReturnValue(false);

    render(<SchoolGradeFormPage />, { wrapper: createWrapper(['/school-grades/new']) });

    expect(screen.getByText(/No tienes permisos/)).toBeInTheDocument();
  });

  it('shows cancel button', () => {
    render(<SchoolGradeFormPage />, { wrapper: createWrapper(['/school-grades/new']) });

    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });
});
