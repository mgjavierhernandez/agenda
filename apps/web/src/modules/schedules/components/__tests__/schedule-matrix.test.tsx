import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScheduleMatrix } from '../ScheduleMatrix';
import type { ScheduleStatus } from '@/api/types';

const base = {
  id: 's1',
  institutionId: 'inst-1',
  courseId: 'c1',
  subjectId: 's1',
  classroomId: 'r1',
  teacherUserId: 't1',
  blockId: 'b1',
  academicPeriodId: 'p1',
  status: 'ACTIVE' as ScheduleStatus,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('ScheduleMatrix', () => {
  it('renders hours as rows and weekdays as columns', () => {
    render(
      <ScheduleMatrix
        schedules={[
          {
            ...base,
            id: 's1',
            dayOfWeek: 'MONDAY',
            startTime: '1970-01-01T08:00:00.000Z',
            endTime: '1970-01-01T09:30:00.000Z',
            courseName: 'Curso 1A',
            subjectName: 'Matemáticas',
            classroomName: 'Aula 101',
          },
        ]}
      />,
    );

    expect(screen.getByText('Hora')).toBeDefined();
    expect(screen.getByText('Lun')).toBeDefined();
    expect(screen.getByText('08:00')).toBeDefined();
    expect(screen.getByText('Curso 1A')).toBeDefined();
    expect(screen.getByText('Matemáticas')).toBeDefined();
    expect(screen.getByText('08:00–09:30')).toBeDefined();
  });

  it('shows empty state without schedules', () => {
    render(<ScheduleMatrix schedules={[]} />);
    expect(screen.getByText(/Sin horarios/)).toBeDefined();
  });
});
