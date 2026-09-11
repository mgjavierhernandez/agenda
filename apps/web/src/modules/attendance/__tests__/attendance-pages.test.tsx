import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { AttendanceListPage } from '../pages/AttendanceListPage';
import { AttendanceRegisterPage } from '../pages/AttendanceRegisterPage';
import { apiClient } from '@/api/client';
import type {
  Attendance,
  PaginatedApiResponse,
  Student,
  Course,
  AcademicPeriod,
  DocumentType,
  Enrollment,
} from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockHasPermission = vi.fn().mockReturnValue(true);

vi.mock('@/permissions/usePermissions', () => ({
  usePermissions: () => ({
    permissionCodes: [],
    isLoading: false,
    isError: false,
    hasPermission: mockHasPermission,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
  }),
}));

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
  description: null,
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const mockPeriod: AcademicPeriod = {
  id: 'ap-1',
  institutionId: 'inst-1',
  name: '2026-P1',
  code: '2026-P1',
  startDate: '2026-01-15',
  endDate: '2026-06-30',
  status: 'ACTIVE',
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const mockClosedPeriod: AcademicPeriod = {
  ...mockPeriod,
  id: 'ap-closed',
  status: 'CLOSED',
};

const mockAttendance: Attendance = {
  id: 'att-1',
  institutionId: 'inst-1',
  studentId: 'stu-1',
  courseId: 'cou-1',
  academicPeriodId: 'ap-1',
  date: '2026-04-05T00:00:00.000Z',
  status: 'PRESENT',
  notes: null,
  recordedById: 'user-1',
  createdAt: '2026-04-05T10:00:00Z',
  updatedAt: '2026-04-05T10:00:00Z',
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

const mockAttendanceData = () => {
  vi.mocked(apiClient.get).mockImplementation((url: string) => {
    const u = String(url);
    if (u.startsWith('/attendance') && !u.includes('/bulk')) {
      return Promise.resolve({
        data: [mockAttendance],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      } as PaginatedApiResponse<Attendance>);
    }
    if (u.startsWith('/students')) {
      return Promise.resolve({
        data: [mockStudent],
        meta: { total: 1, page: 1, limit: 200, totalPages: 1 },
      });
    }
    if (u.startsWith('/courses')) {
      return Promise.resolve({
        data: [mockCourse],
        meta: { total: 1, page: 1, limit: 200, totalPages: 1 },
      });
    }
    if (u.startsWith('/academic-periods')) {
      return Promise.resolve({
        data: [mockPeriod, mockClosedPeriod],
        meta: { total: 2, page: 1, limit: 200, totalPages: 1 },
      });
    }
    if (u.startsWith('/enrollments')) {
      return Promise.resolve({
        data: [mockEnrollment],
        meta: { total: 1, page: 1, limit: 200, totalPages: 1 },
      });
    }
    return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
  });
};

describe('AttendanceListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockAttendanceData();
  });

  it('renders the page header', async () => {
    render(<AttendanceListPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Asistencia')).toBeInTheDocument();
  });

  it('renders empty state when no attendance records', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      const u = String(url);
      if (u.startsWith('/attendance') && !u.includes('/bulk')) {
        return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      }
      return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 200, totalPages: 0 } });
    });

    render(<AttendanceListPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('No hay registros de asistencia')).toBeInTheDocument();
    });
  });

  it('renders attendance records in a table', async () => {
    render(<AttendanceListPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0);
    });
  });

  it('shows register button for users with create permission', async () => {
    render(<AttendanceListPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Registrar asistencia')).toBeInTheDocument();
    });
  });

  it('hides register button without create permission', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'attendance:create');
    render(<AttendanceListPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Registrar asistencia')).not.toBeInTheDocument();
    });
  });

  it('shows filter dropdowns', async () => {
    render(<AttendanceListPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Estudiante')).toBeInTheDocument();
      expect(screen.getByLabelText('Curso')).toBeInTheDocument();
      expect(screen.getByLabelText('Periodo')).toBeInTheDocument();
      expect(screen.getByLabelText('Estado')).toBeInTheDocument();
    });
  });

  it('shows attendance status badge', async () => {
    render(<AttendanceListPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Presente').length).toBeGreaterThan(0);
    });
  });
});

describe('AttendanceRegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockAttendanceData();
  });

  it('renders the page header', () => {
    render(<AttendanceRegisterPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Registrar asistencia')).toBeInTheDocument();
  });

  it('renders course, period and date selectors', async () => {
    render(<AttendanceRegisterPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByLabelText('Curso')).toBeInTheDocument();
      expect(screen.getByLabelText('Periodo académico')).toBeInTheDocument();
      expect(screen.getByLabelText('Fecha')).toBeInTheDocument();
    });
  });

  it('shows a warning when the selected period is closed', async () => {
    render(<AttendanceRegisterPage />, { wrapper: createWrapper() });

    const course = await screen.findByLabelText('Curso');
    await waitFor(() => {
      const options = Array.from((course as HTMLSelectElement).options).map((o) => o.value);
      expect(options).toContain('cou-1');
    });
    fireEvent.change(course, { target: { value: 'cou-1' } });

    const period = await screen.findByLabelText('Periodo académico');
    await waitFor(() => {
      const options = Array.from((period as HTMLSelectElement).options).map((o) => o.value);
      expect(options).toContain('ap-closed');
    });
    fireEvent.change(period, { target: { value: 'ap-closed' } });

    await waitFor(() => {
      expect(screen.getByText(/está cerrado/)).toBeInTheDocument();
    });
  });

  it('shows a no-students state when none are enrolled', async () => {
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      const u = String(url);
      if (u.startsWith('/students')) {
        return Promise.resolve({
          data: [],
          meta: { total: 0, page: 1, limit: 300, totalPages: 0 },
        });
      }
      if (u.startsWith('/enrollments')) {
        return Promise.resolve({
          data: [],
          meta: { total: 0, page: 1, limit: 200, totalPages: 0 },
        });
      }
      if (u.startsWith('/courses')) {
        return Promise.resolve({
          data: [mockCourse],
          meta: { total: 1, page: 1, limit: 200, totalPages: 1 },
        });
      }
      if (u.startsWith('/academic-periods')) {
        return Promise.resolve({
          data: [mockPeriod],
          meta: { total: 1, page: 1, limit: 200, totalPages: 1 },
        });
      }
      if (u.startsWith('/attendance')) {
        return Promise.resolve({
          data: [],
          meta: { total: 0, page: 1, limit: 200, totalPages: 0 },
        });
      }
      return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    });

    render(<AttendanceRegisterPage />, { wrapper: createWrapper() });

    const course = await screen.findByLabelText('Curso');
    await waitFor(() => {
      const options = Array.from((course as HTMLSelectElement).options).map((o) => o.value);
      expect(options).toContain('cou-1');
    });
    fireEvent.change(course, { target: { value: 'cou-1' } });

    const period = await screen.findByLabelText('Periodo académico');
    await waitFor(() => {
      const options = Array.from((period as HTMLSelectElement).options).map((o) => o.value);
      expect(options).toContain('ap-1');
    });
    fireEvent.change(period, { target: { value: 'ap-1' } });

    await waitFor(() => {
      expect(screen.getByText(/No hay estudiantes matriculados/)).toBeInTheDocument();
    });
  });

  it('hides controls when user lacks create permission', () => {
    mockHasPermission.mockReturnValue(false);
    render(<AttendanceRegisterPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/No tienes permisos para registrar asistencia/)).toBeInTheDocument();
  });
});
