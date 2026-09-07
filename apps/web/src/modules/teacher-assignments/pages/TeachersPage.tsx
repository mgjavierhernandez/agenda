import { useTeachers } from '../hooks/useTeachers';
import { useDirectors } from '../hooks/useDirectors';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';

export function TeachersPage() {
  const { data: teachers, isLoading, error } = useTeachers();
  const { data: directors } = useDirectors();

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  const directorIds = new Set((directors ?? []).map((d) => d.teacherUserId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Docentes"
        description="Docentes de la institución, sus asignaciones y estudiantes"
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !teachers || teachers.length === 0 ? (
        <EmptyState
          title="No hay docentes"
          description="Registra docentes y asigna cursos y asignaturas para verlos aquí."
        />
      ) : (
        <div className="space-y-4">
          {teachers.map((teacher) => (
            <Card key={teacher.teacherUserId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">
                      {teacher.firstName} {teacher.lastName}
                    </h3>
                    {directorIds.has(teacher.teacherUserId) && (
                      <Badge variant="success">Director de grupo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{teacher.email}</p>
                </div>
                <Badge>{teacher.courses.length} curso(s)</Badge>
              </div>

              {teacher.courses.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  Sin asignaciones de curso/asignatura.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {teacher.courses.map((course) => (
                    <div
                      key={`${course.courseId}-${course.subjectId}`}
                      className="rounded-md border border-gray-200 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-gray-800">{course.courseName}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-600">{course.subjectName}</span>
                      </div>
                      {course.students.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          Estudiantes:{' '}
                          {course.students
                            .map((s) => `${s.firstName} ${s.lastName}`)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}