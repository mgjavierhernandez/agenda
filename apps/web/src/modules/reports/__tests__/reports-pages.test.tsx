import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { ReportsPage } from '../pages/ReportsPage';
import { CourseReportPage } from '../pages/CourseReportPage';
import { apiClient } from '@/api/client';
import type { StudentReport, CourseReport, PaginatedApiResponse } from '@/api/types';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    download: vi.fn(),
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

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com', firstName: 'Test', lastName: 'User' },
  }),
}));

let mockChildContext: {
  children: { studentId: string; firstName: string; lastName: string; relationshipType: string }[];
  selectedChildId: string | null;
  setSelectedChildId: (id: string | null) => void;
  isLoading: boolean;
  isParent: boolean;
};

vi.mock('@/modules/children', () => ({
  useChildContext: () => mockChildContext,
}));

const emptyApiResponse = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };

const mockPeriod = {
  id: 'ap-1',
  institutionId: 'inst-1',
  name: '2026 - Periodo 1',
  code: '2026-P1',
  startDate: '2026-01-15T00:00:00.000Z',
  endDate: '2026-06-30T00:00:00.000Z',
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

const mockReport: StudentReport = {
  student: { id: 'stu-1', firstName: 'Ana', lastName: 'García', documentType: 'DNI', documentNumber: '123', status: 'ACTIVE' },
  institution: { id: 'inst-1', name: 'Demo School', slug: 'demo-school' },
  academicPeriod: { id: 'ap-1', name: '2026 - Periodo 1', code: '2026-P1', status: 'ACTIVE', startDate: '2026-01-15', endDate: '2026-06-30' },
  enrollment: { courseId: 'c-1', courseCode: 'MAT-10', courseName: 'Matemáticas', schoolGradeId: 'sg-1', schoolGradeName: 'Grado 10', enrolledAt: '2026-01-15' },
  academic: [
    {
      subjectId: 'sub-1',
      subjectCode: 'MAT',
      subjectName: 'Matemáticas',
      grades: [{ id: 'g-1', value: 4.5, period: 'P1', status: 'ACTIVE', updatedAt: '2026-03-01' }],
      simpleAverage: 4.5,
      teacher: { id: 't-1', firstName: 'Carlos', lastName: 'Pérez' },
    },
  ],
  attendance: { total: 40, present: 35, absent: 2, late: 2, excused: 1 },
  observador: { total: 3, open: 1, resolved: 2, byConfidentiality: { PUBLICA: 2, CONFIDENCIAL: 1 } },
};

const mockCourse: { id: string; institutionId: string; code: string; name: string; description: string | null; status: 'ACTIVE' | 'INACTIVE' } = {
  id: 'c-1',
  institutionId: 'inst-1',
  code: 'MAT-10',
  name: 'Matemáticas',
  description: null,
  status: 'ACTIVE',
};

const mockCourseReport: CourseReport = {
  course: { id: 'c-1', code: 'MAT-10', name: 'Matemáticas', status: 'ACTIVE' },
  academicPeriod: { id: 'ap-1', name: '2026 - Periodo 1', code: '2026-P1', status: 'ACTIVE', startDate: '2026-01-15', endDate: '2026-06-30' },
  students: [
    {
      student: { id: 'stu-1', firstName: 'Ana', lastName: 'García', documentType: 'DNI', documentNumber: '123', status: 'ACTIVE' },
      schoolGradeName: 'Grado 10',
      subjectCount: 6,
      gradeCount: 18,
      simpleAverage: 4.2,
      attendance: { total: 40, present: 35, absent: 2, late: 2, excused: 1 },
    },
  ],
  summary: { totalStudents: 1, studentsWithGrades: 1, studentsWithAttendance: 1 },
};

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockChildContext = {
      children: [{ studentId: 'stu-1', firstName: 'Ana', lastName: 'García', relationshipType: 'MADRE' }],
      selectedChildId: 'stu-1',
      setSelectedChildId: () => {},
      isLoading: false,
      isParent: true,
    };
    vi.mocked(apiClient.get).mockImplementation(async (path: string) => {
      if (path.startsWith('/academic-periods')) {
        return { data: [mockPeriod], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } } as PaginatedApiResponse<typeof mockPeriod>;
      }
      if (path.startsWith('/reports/students/')) {
        return mockReport;
      }
      return emptyApiResponse;
    });
  });

  it('renders the page header', async () => {
    render(<ReportsPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Reportes y boletín')).toBeInTheDocument();
  });

  it('renders the empty state before a student is selected', async () => {
    mockChildContext = {
      children: [],
      selectedChildId: null,
      setSelectedChildId: () => {},
      isLoading: false,
      isParent: false,
    };
    render(<ReportsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Selecciona un estudiante')).toBeInTheDocument();
    });
  });

  it('renders the report for the current child', async () => {
    render(<ReportsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Matemáticas').length).toBeGreaterThan(0);
      expect(screen.getByText('Reporte académico')).toBeInTheDocument();
      expect(screen.getAllByText(/Ana García/).length).toBeGreaterThan(0);
    });
  });

  it('renders the bulletin section', async () => {
    render(<ReportsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Boletín académico')).toBeInTheDocument();
    });
  });

  it('shows export buttons when the user can export', async () => {
    render(<ReportsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('PDF').length).toBeGreaterThan(0);
    });
  });

  it('hides export buttons without reports:export', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'reports:export');
    render(<ReportsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Reporte académico')).toBeInTheDocument();
    });
    expect(screen.queryByText('PDF')).not.toBeInTheDocument();
  });

  it('downloads the report PDF on click', async () => {
    render(<ReportsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Matemáticas').length).toBeGreaterThan(0);
      expect(screen.getAllByText('PDF').length).toBeGreaterThan(0);
    });
    const firstPdf = screen.getAllByText('PDF')[0];
    fireEvent.click(firstPdf);
    await waitFor(() => {
      expect(apiClient.download).toHaveBeenCalled();
      const arg = vi.mocked(apiClient.download).mock.calls[0][0] as string;
      expect(arg).toMatch(/\/reports\/students\/stu-1\/export/);
      expect(vi.mocked(apiClient.download).mock.calls[0][1]).toMatch(/\.pdf$/);
    });
  });

  it('shows an error state when the report fails', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (path: string) => {
      if (path.startsWith('/academic-periods')) {
        return { data: [mockPeriod], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } } as PaginatedApiResponse<typeof mockPeriod>;
      }
      throw { statusCode: 404, message: 'Estudiante no encontrado', timestamp: '', path };
    });
    render(<ReportsPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('CourseReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    vi.mocked(apiClient.get).mockImplementation(async (path: string) => {
      if (path.startsWith('/academic-periods')) {
        return { data: [mockPeriod], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } } as PaginatedApiResponse<typeof mockPeriod>;
      }
      if (path.startsWith('/courses')) {
        return { data: [mockCourse], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } } as PaginatedApiResponse<typeof mockCourse>;
      }
      if (path.startsWith('/reports/courses/')) {
        return mockCourseReport;
      }
      return emptyApiResponse;
    });
  });

  it('renders the page header', () => {
    render(<CourseReportPage />, { wrapper: createWrapper() });
    expect(screen.getByText('Reporte de curso')).toBeInTheDocument();
  });

  it('renders the empty state until a course is selected', async () => {
    render(<CourseReportPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Selecciona un curso')).toBeInTheDocument();
    });
  });

  it('renders summary and student table after selecting a course', async () => {
    render(<CourseReportPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/MAT-10/)).toBeInTheDocument();
    });
    const select = (await screen.findByLabelText('Curso')) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'c-1' } });
    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
      expect(screen.getByText('4.2')).toBeInTheDocument();
    });
  });

  it('hides the export button without reports:export', async () => {
    mockHasPermission.mockImplementation((perm: string) => perm !== 'reports:export');
    render(<CourseReportPage />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.queryByText('Exportar CSV')).not.toBeInTheDocument();
    });
  });
});