import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { TeacherAssignmentsPage } from '../pages/TeacherAssignmentsPage';
import { TeacherAssignmentDetailPage } from '../pages/TeacherAssignmentDetailPage';
import { TeacherAssignmentFormPage } from '../pages/TeacherAssignmentFormPage';
import { apiClient } from '@/api/client';
import type { TeacherAssignment, PaginatedApiResponse, User, Course, Subject, AcademicPeriod } from '@/api/types';

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

const mockUser: User = {
  id: 'user-1',
  email: 'profesor@test.com',
  firstName: 'Carlos',
  lastName: 'García',
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

const mockSubject: Subject = {
  id: 'sub-1',
  institutionId: 'inst-1',
  code: 'MAT',
  name: 'Matemáticas',
  description: 'Asignatura de matemáticas',
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

const mockAssignment: TeacherAssignment = {
  id: 'ta-1',
  institutionId: 'inst-1',
  teacherUserId: 'user-1',
  courseId: 'cou-1',
  subjectId: 'sub-1',
  academicPeriodId: 'ap-1',
  status: 'ACTIVE',
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
    if (u.startsWith('/teacher-assignments/') && u !== '/teacher-assignments') {
      return Promise.resolve(mockAssignment);
    }
    if (u.startsWith('/teacher-assignments')) {
      return Promise.resolve({
        data: [mockAssignment],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      } as PaginatedApiResponse<TeacherAssignment>);
    }
    if (u.startsWith('/users/')) {
      return Promise.resolve(mockUser);
    }
    if (u.startsWith('/users')) {
      return Promise.resolve({ data: [mockUser], meta: { total: 1, page: 1, limit: 200, totalPages: 1 } });
    }
    if (u.startsWith('/courses/')) {
      return Promise.resolve(mockCourse);
    }
    if (u.startsWith('/courses')) {
      return Promise.resolve({ data: [mockCourse], meta: { total: 1, page: 1, limit: 200, totalPages: 1 } });
    }
    if (u.startsWith('/subjects/')) {
      return Promise.resolve(mockSubject);
    }
    if (u.startsWith('/subjects')) {
      return Promise.resolve({ data: [mockSubject], meta: { total: 1, page: 1, limit: 200, totalPages: 1 } });
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

describe('TeacherAssignmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockRelatedData();
  });

  it('renders the page header', async () => {
    render(<TeacherAssignmentsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Asignaciones docentes')).toBeInTheDocument();
  });

  it('renders empty state when no assignments', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      const u = String(url);
      if (u.startsWith('/teacher-assignments')) {
        return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      }
      return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } });
    });

    render(<TeacherAssignmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay asignaciones docentes')).toBeInTheDocument();
    });
  });

  it('renders assignments in a table', async () => {
    render(<TeacherAssignmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Carlos García').length).toBeGreaterThan(0);
    });
  });

  it('shows create button for managers', async () => {
    render(<TeacherAssignmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Nueva asignación')).toBeInTheDocument();
    });
  });

  it('hides create button for non-managers', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'teacher-assignments:manage');
    render(<TeacherAssignmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Nueva asignación')).not.toBeInTheDocument();
    });
  });

  it('shows filter dropdowns', async () => {
    render(<TeacherAssignmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Profesor')).toBeInTheDocument();
      expect(screen.getByLabelText('Curso')).toBeInTheDocument();
      expect(screen.getByLabelText('Asignatura')).toBeInTheDocument();
      expect(screen.getByLabelText('Periodo')).toBeInTheDocument();
    });
  });

  it('shows assignment status badge', async () => {
    render(<TeacherAssignmentsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Activa').length).toBeGreaterThan(0);
    });
  });
});

describe('TeacherAssignmentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockParams = { id: 'ta-1' };
    mockRelatedData();
  });

  it('renders assignment details', async () => {
    render(<TeacherAssignmentDetailPage />, { wrapper: createWrapper(['/teacher-assignments/ta-1']) });
    await waitFor(() => {
      expect(screen.getAllByText('Carlos García').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows course name', async () => {
    render(<TeacherAssignmentDetailPage />, { wrapper: createWrapper(['/teacher-assignments/ta-1']) });
    await waitFor(() => {
      expect(screen.getByText('Décimo A (10A)')).toBeInTheDocument();
    });
  });

  it('shows subject name', async () => {
    render(<TeacherAssignmentDetailPage />, { wrapper: createWrapper(['/teacher-assignments/ta-1']) });
    await waitFor(() => {
      expect(screen.getByText('Matemáticas (MAT)')).toBeInTheDocument();
    });
  });

  it('shows status badge', async () => {
    render(<TeacherAssignmentDetailPage />, { wrapper: createWrapper(['/teacher-assignments/ta-1']) });
    await waitFor(() => {
      expect(screen.getByText('Activa')).toBeInTheDocument();
    });
  });

  it('shows deactivate button for active assignments', async () => {
    render(<TeacherAssignmentDetailPage />, { wrapper: createWrapper(['/teacher-assignments/ta-1']) });
    await waitFor(() => {
      expect(screen.getByText('Desactivar')).toBeInTheDocument();
    });
  });

  it('hides actions for non-managers', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'teacher-assignments:manage');
    render(<TeacherAssignmentDetailPage />, { wrapper: createWrapper(['/teacher-assignments/ta-1']) });
    await waitFor(() => {
      expect(screen.queryByText('Desactivar')).not.toBeInTheDocument();
    });
  });

  it('shows back button', async () => {
    render(<TeacherAssignmentDetailPage />, { wrapper: createWrapper(['/teacher-assignments/ta-1']) });
    await waitFor(() => {
      expect(screen.getByText('Volver a asignaciones')).toBeInTheDocument();
    });
  });
});

describe('TeacherAssignmentFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockParams = {};
    mockRelatedData();
  });

  it('renders create form', async () => {
    render(<TeacherAssignmentFormPage />, { wrapper: createWrapper(['/teacher-assignments/new']) });
    await waitFor(() => {
      expect(screen.getByText('Nueva asignación docente')).toBeInTheDocument();
      expect(screen.getByText('Crear asignación')).toBeInTheDocument();
    });
  });

  it('renders form fields', async () => {
    render(<TeacherAssignmentFormPage />, { wrapper: createWrapper(['/teacher-assignments/new']) });
    await waitFor(() => {
      expect(screen.getByLabelText(/^Profesor/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Curso/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Asignatura/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Periodo académico/)).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    render(<TeacherAssignmentFormPage />, { wrapper: createWrapper(['/teacher-assignments/new']) });
    await waitFor(() => {
      expect(screen.getByText('Crear asignación')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Crear asignación');
    submitButton.click();

    await waitFor(() => {
      expect(screen.getByText('El profesor es requerido')).toBeInTheDocument();
    });
  });

  it('shows cancel button', async () => {
    render(<TeacherAssignmentFormPage />, { wrapper: createWrapper(['/teacher-assignments/new']) });
    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });
  });

  it('hides form when user lacks permission', () => {
    mockHasPermission.mockReturnValue(false);
    render(<TeacherAssignmentFormPage />, { wrapper: createWrapper(['/teacher-assignments/new']) });
    expect(screen.getByText(/No tienes permisos/)).toBeInTheDocument();
  });

  it('populates selector options', async () => {
    render(<TeacherAssignmentFormPage />, { wrapper: createWrapper(['/teacher-assignments/new']) });
    await waitFor(() => {
      const teacherSelect = screen.getByLabelText(/^Profesor/) as HTMLSelectElement;
      expect(teacherSelect.options.length).toBeGreaterThan(1);
    });
  });
});
