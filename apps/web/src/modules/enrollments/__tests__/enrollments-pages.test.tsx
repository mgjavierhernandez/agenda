import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { EnrollmentsPage } from '../pages/EnrollmentsPage';
import { EnrollmentDetailPage } from '../pages/EnrollmentDetailPage';
import { EnrollmentFormPage } from '../pages/EnrollmentFormPage';
import { apiClient } from '@/api/client';
import type { Enrollment, PaginatedApiResponse, Student, Course, SchoolGrade, AcademicPeriod, DocumentType } from '@/api/types';

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

const mockStudent: Student = {
  id: 'stu-1',
  institutionId: 'inst-1',
  firstName: 'Juan',
  lastName: 'Pérez',
  documentType: 'CC' as DocumentType,
  documentNumber: '1234567890',
  dateOfBirth: '2010-01-15',
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const mockCourse: Course = {
  id: 'cou-1',
  institutionId: 'inst-1',
  code: '10A',
  name: 'Décimo A',
  description: 'Curso décimo',
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const mockSchoolGrade: SchoolGrade = {
  id: 'sg-1',
  institutionId: 'inst-1',
  name: 'Décimo',
  code: '10',
  sortOrder: 10,
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const mockPeriod: AcademicPeriod = {
  id: 'ap-1',
  institutionId: 'inst-1',
  name: '2026-1',
  code: '2026-1',
  startDate: '2026-01-15',
  endDate: '2026-06-30',
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const mockEnrollment: Enrollment = {
  id: 'enr-1',
  institutionId: 'inst-1',
  studentId: 'stu-1',
  courseId: 'cou-1',
  schoolGradeId: 'sg-1',
  academicPeriodId: 'ap-1',
  status: 'ACTIVE',
  enrolledAt: '2026-01-15T10:00:00Z',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
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

const mockRelatedData = () => {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    const u = String(url);
    if (u.startsWith('/enrollments/') && u !== '/enrollments') {
      return Promise.resolve(mockEnrollment);
    }
    if (u.startsWith('/enrollments')) {
      return Promise.resolve({
        data: [mockEnrollment],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      } as PaginatedApiResponse<Enrollment>);
    }
    if (u.startsWith('/students/')) {
      return Promise.resolve(mockStudent);
    }
    if (u.startsWith('/students')) {
      return Promise.resolve({ data: [mockStudent], meta: { total: 1, page: 1, limit: 200, totalPages: 1 } });
    }
    if (u.startsWith('/courses/')) {
      return Promise.resolve(mockCourse);
    }
    if (u.startsWith('/courses')) {
      return Promise.resolve({ data: [mockCourse], meta: { total: 1, page: 1, limit: 200, totalPages: 1 } });
    }
    if (u.startsWith('/school-grades/')) {
      return Promise.resolve(mockSchoolGrade);
    }
    if (u.startsWith('/school-grades')) {
      return Promise.resolve({ data: [mockSchoolGrade], meta: { total: 1, page: 1, limit: 200, totalPages: 1 } });
    }
    if (u.startsWith('/academic-periods/')) {
      return Promise.resolve(mockPeriod);
    }
    if (u.startsWith('/academic-periods')) {
      return Promise.resolve({ data: [mockPeriod], meta: { total: 1, page: 1, limit: 200, totalPages: 1 } });
    }
    return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  });
};

describe('EnrollmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockRelatedData();
  });

  it('renders the page header', async () => {
    render(<EnrollmentsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Matrículas')).toBeInTheDocument();
  });

  it('renders empty state when no enrollments', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      const u = String(url);
      if (u.startsWith('/enrollments')) {
        return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      }
      return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } });
    });

    render(<EnrollmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay matrículas')).toBeInTheDocument();
    });
  });

  it('renders enrollments in a table', async () => {
    render(<EnrollmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0);
    });
  });

  it('shows create button for managers', async () => {
    render(<EnrollmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Nueva matrícula')).toBeInTheDocument();
    });
  });

  it('hides create button for non-managers', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'enrollments:manage');
    render(<EnrollmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Nueva matrícula')).not.toBeInTheDocument();
    });
  });

  it('shows filter dropdowns', async () => {
    render(<EnrollmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Estudiante')).toBeInTheDocument();
      expect(screen.getByLabelText('Curso')).toBeInTheDocument();
      expect(screen.getByLabelText('Grado')).toBeInTheDocument();
      expect(screen.getByLabelText('Periodo')).toBeInTheDocument();
    });
  });

  it('shows enrollment status badge', async () => {
    render(<EnrollmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Activa').length).toBeGreaterThan(0);
    });
  });
});

describe('EnrollmentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockParams = { id: 'enr-1' };
    mockRelatedData();
  });

  it('renders enrollment details', async () => {
    render(<EnrollmentDetailPage />, { wrapper: createWrapper(['/enrollments/enr-1']) });
    await waitFor(() => {
      expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows student document', async () => {
    render(<EnrollmentDetailPage />, { wrapper: createWrapper(['/enrollments/enr-1']) });
    await waitFor(() => {
      expect(screen.getByText('CC 1234567890')).toBeInTheDocument();
    });
  });

  it('shows course name', async () => {
    render(<EnrollmentDetailPage />, { wrapper: createWrapper(['/enrollments/enr-1']) });
    await waitFor(() => {
      expect(screen.getByText('Décimo A (10A)')).toBeInTheDocument();
    });
  });

  it('shows status badge', async () => {
    render(<EnrollmentDetailPage />, { wrapper: createWrapper(['/enrollments/enr-1']) });
    await waitFor(() => {
      expect(screen.getByText('Activa')).toBeInTheDocument();
    });
  });

  it('shows deactivate button for active enrollments', async () => {
    render(<EnrollmentDetailPage />, { wrapper: createWrapper(['/enrollments/enr-1']) });
    await waitFor(() => {
      expect(screen.getByText('Desactivar')).toBeInTheDocument();
    });
  });

  it('shows withdraw button for active enrollments', async () => {
    render(<EnrollmentDetailPage />, { wrapper: createWrapper(['/enrollments/enr-1']) });
    await waitFor(() => {
      expect(screen.getByText('Retirar')).toBeInTheDocument();
    });
  });

  it('hides actions for non-managers', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'enrollments:manage');
    render(<EnrollmentDetailPage />, { wrapper: createWrapper(['/enrollments/enr-1']) });
    await waitFor(() => {
      expect(screen.queryByText('Desactivar')).not.toBeInTheDocument();
      expect(screen.queryByText('Retirar')).not.toBeInTheDocument();
    });
  });

  it('shows back button', async () => {
    render(<EnrollmentDetailPage />, { wrapper: createWrapper(['/enrollments/enr-1']) });
    await waitFor(() => {
      expect(screen.getByText('Volver a matrículas')).toBeInTheDocument();
    });
  });
});

describe('EnrollmentFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockParams = {};
    mockRelatedData();
  });

  it('renders create form', async () => {
    render(<EnrollmentFormPage />, { wrapper: createWrapper(['/enrollments/new']) });
    await waitFor(() => {
      expect(screen.getByText('Nueva matrícula')).toBeInTheDocument();
      expect(screen.getByText('Crear matrícula')).toBeInTheDocument();
    });
  });

  it('renders form fields', async () => {
    render(<EnrollmentFormPage />, { wrapper: createWrapper(['/enrollments/new']) });
    await waitFor(() => {
      expect(screen.getByLabelText(/^Estudiante/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Curso/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Grado escolar/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Periodo académico/)).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    render(<EnrollmentFormPage />, { wrapper: createWrapper(['/enrollments/new']) });
    await waitFor(() => {
      expect(screen.getByText('Crear matrícula')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Crear matrícula');
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('El estudiante es requerido')).toBeInTheDocument();
    });
  });

  it('shows cancel button', async () => {
    render(<EnrollmentFormPage />, { wrapper: createWrapper(['/enrollments/new']) });
    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });
  });

  it('hides form when user lacks permission', () => {
    mockHasPermission.mockReturnValue(false);
    render(<EnrollmentFormPage />, { wrapper: createWrapper(['/enrollments/new']) });
    expect(screen.getByText(/No tienes permisos/)).toBeInTheDocument();
  });

  it('populates selector options', async () => {
    render(<EnrollmentFormPage />, { wrapper: createWrapper(['/enrollments/new']) });
    await waitFor(() => {
      const studentSelect = screen.getByLabelText(/^Estudiante/) as HTMLSelectElement;
      expect(studentSelect.options.length).toBeGreaterThan(1);
    });
  });
});
