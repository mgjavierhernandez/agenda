import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AcademicDashboard } from '../AcademicDashboard';

vi.mock('@/modules/grades/hooks', () => ({
  useGrades: vi.fn(),
}));
vi.mock('@/modules/tasks/hooks', () => ({
  useTasks: vi.fn(),
}));
vi.mock('@/modules/subjects/hooks', () => ({
  useSubjects: vi.fn(),
}));

import { useGrades } from '@/modules/grades/hooks';
import { useTasks } from '@/modules/tasks/hooks';
import { useSubjects } from '@/modules/subjects/hooks';

const mockGrades = vi.mocked(useGrades);
const mockTasks = vi.mocked(useTasks);
const mockSubjects = vi.mocked(useSubjects);

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const gradesData = {
  data: [
    { id: 'g1', studentId: 'stu-1', courseId: 'c1', subjectId: 's-math', value: '4.50', period: 'Q1', evaluationType: 'Parcial', description: null, status: 'ACTIVE' },
    { id: 'g2', studentId: 'stu-1', courseId: 'c1', subjectId: 's-math', value: '3.50', period: 'Q2', evaluationType: 'Parcial', description: null, status: 'ACTIVE' },
    { id: 'g3', studentId: 'stu-1', courseId: 'c1', subjectId: 's-lang', value: '5.00', period: 'Q1', evaluationType: 'Parcial', description: null, status: 'ACTIVE' },
  ],
  meta: { page: 1, limit: 200, total: 3, totalPages: 1 },
};

describe('AcademicDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGrades.mockReturnValue({ data: gradesData, isLoading: false } as never);
    mockTasks.mockReturnValue({
      data: {
        data: [{ id: 't1', title: 'Tarea 1', status: 'PUBLISHED', dueDate: new Date(Date.now() + 86400000).toISOString() }],
        meta: { page: 1, limit: 200, total: 1, totalPages: 1 },
      },
      isLoading: false,
    } as never);
    mockSubjects.mockReturnValue({
      data: {
        data: [
          { id: 's-math', name: 'Matemáticas' },
          { id: 's-lang', name: 'Lenguaje' },
        ],
        meta: { page: 1, limit: 100, total: 2, totalPages: 1 },
      },
      isLoading: false,
    } as never);
  });

  it('requests scoped data for the selected child', () => {
    render(<AcademicDashboard studentId="stu-1" childName="Juan Pérez" />, { wrapper });

    expect(mockGrades).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'stu-1' }));
    expect(mockTasks).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'stu-1' }));
    expect(screen.getByText(/Juan Pérez/)).toBeDefined();
  });

  it('shows average, charts and filters', async () => {
    render(<AcademicDashboard studentId="stu-1" />, { wrapper });

    await waitFor(() => expect(screen.getAllByText('4.33').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByText('Matemáticas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Lenguaje').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('Período')).toBeDefined();
    expect(screen.getByLabelText('Materia')).toBeDefined();
  });

  it('filters by period', async () => {
    const user = userEvent.setup();
    render(<AcademicDashboard studentId="stu-1" />, { wrapper });

    await waitFor(() => expect(screen.getAllByText('4.33').length).toBeGreaterThanOrEqual(1));
    await user.selectOptions(screen.getByLabelText('Período'), 'Q1');

    await waitFor(() => expect(screen.getAllByText('4.75').length).toBeGreaterThanOrEqual(1));
  });

  it('shows attention alerts', () => {
    render(<AcademicDashboard studentId="stu-1" unreadCommunications={2} pendingSignatures={1} />, { wrapper });

    expect(screen.getByText('Requiere tu atención')).toBeDefined();
    expect(screen.getByText(/sin leer/)).toBeDefined();
    expect(screen.getAllByText(/pendiente/).length).toBeGreaterThanOrEqual(1);
  });
});
