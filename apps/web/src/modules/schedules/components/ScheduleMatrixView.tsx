import { useMemo } from 'react';
import { useSchedules } from '../hooks/useSchedules';
import { useCourses } from '@/modules/courses/hooks';
import { useSubjects } from '@/modules/subjects/hooks';
import { useClassrooms } from '../hooks/useClassrooms';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { ScheduleMatrix, type NamedSchedule } from './ScheduleMatrix';

interface ScheduleMatrixViewProps {
  studentId?: string;
}

/**
 * Vista matriz del horario con datos completos (límite amplio) y estilos de
 * impresión autocontenidos.
 */
export function ScheduleMatrixView({ studentId }: ScheduleMatrixViewProps) {
  const { data, isLoading } = useSchedules({ limit: 200, status: 'ACTIVE', studentId });
  const { data: coursesData } = useCourses({ limit: 200 });
  const { data: subjectsData } = useSubjects({ limit: 200 });
  const { data: classroomsData } = useClassrooms({ limit: 200 });

  const named: NamedSchedule[] = useMemo(() => {
    const courseNames = new Map((coursesData?.data ?? []).map((c) => [c.id, c.name]));
    const subjectNames = new Map((subjectsData?.data ?? []).map((s) => [s.id, s.name]));
    const classroomNames = new Map((classroomsData?.data ?? []).map((c) => [c.id, c.name]));
    return (data?.data ?? []).map((s) => ({
      ...s,
      courseName: courseNames.get(s.courseId),
      subjectName: subjectNames.get(s.subjectId),
      classroomName: s.classroomId ? classroomNames.get(s.classroomId) : undefined,
    }));
  }, [data, coursesData, subjectsData, classroomsData]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Card>
      <style>{`@media print {
        body * { visibility: hidden; }
        #schedule-print-area, #schedule-print-area * { visibility: visible; }
        #schedule-print-area { position: absolute; left: 0; top: 0; width: 100%; }
      }`}</style>
      <div id="schedule-print-area">
        <ScheduleMatrix schedules={named} />
      </div>
    </Card>
  );
}
