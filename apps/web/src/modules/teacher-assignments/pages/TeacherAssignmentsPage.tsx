import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAssignments, useUsers } from '../hooks';
import { useCourses } from '@/modules/courses/hooks';
import { useSubjects } from '@/modules/subjects/hooks';
import { useAcademicPeriods } from '@/modules/academic-periods/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { TEACHER_ASSIGNMENT_STATUS_LABELS } from '@/api/types';
import type { TeacherAssignmentStatus } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<TeacherAssignmentStatus, 'success' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

export function TeacherAssignmentsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.TEACHER_ASSIGNMENTS_MANAGE);

  const [page, setPage] = useState(1);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const limit = 20;

  const { data, isLoading, error } = useTeacherAssignments({
    page,
    limit,
    teacherUserId: teacherFilter || undefined,
    courseId: courseFilter || undefined,
    subjectId: subjectFilter || undefined,
    academicPeriodId: periodFilter || undefined,
  });

  const { data: usersData } = useUsers({ limit: 200 });
  const { data: coursesData } = useCourses({ limit: 200 });
  const { data: subjectsData } = useSubjects({ limit: 200 });
  const { data: periodsData } = useAcademicPeriods({ limit: 200 });

  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [courseMap, setCourseMap] = useState<Record<string, string>>({});
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({});
  const [periodMap, setPeriodMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (usersData?.data) {
      const map: Record<string, string> = {};
      for (const u of usersData.data) {
        map[u.id] = `${u.firstName} ${u.lastName}`;
      }
      setUserMap(map);
    }
  }, [usersData]);

  useEffect(() => {
    if (coursesData?.data) {
      const map: Record<string, string> = {};
      for (const c of coursesData.data) {
        map[c.id] = c.name;
      }
      setCourseMap(map);
    }
  }, [coursesData]);

  useEffect(() => {
    if (subjectsData?.data) {
      const map: Record<string, string> = {};
      for (const s of subjectsData.data) {
        map[s.id] = s.name;
      }
      setSubjectMap(map);
    }
  }, [subjectsData]);

  useEffect(() => {
    if (periodsData?.data) {
      const map: Record<string, string> = {};
      for (const p of periodsData.data) {
        map[p.id] = p.name;
      }
      setPeriodMap(map);
    }
  }, [periodsData]);

  const assignments = data?.data ?? [];
  const meta = data?.meta;

  const hasActiveFilters = teacherFilter || courseFilter || subjectFilter || periodFilter;

  const handleClearFilters = () => {
    setTeacherFilter('');
    setCourseFilter('');
    setSubjectFilter('');
    setPeriodFilter('');
    setPage(1);
  };

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asignaciones docentes"
        description="Gestionar asignaciones de profesores a cursos y asignaturas"
        actions={
          canManage ? (
            <Button onClick={() => navigate('/teacher-assignments/new')}>
              Nueva asignación
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="filter-teacher" className="block text-sm font-medium text-gray-700 mb-1">
              Profesor
            </label>
            <select
              id="filter-teacher"
              value={teacherFilter}
              onChange={(e) => { setTeacherFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {usersData?.data.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-course" className="block text-sm font-medium text-gray-700 mb-1">
              Curso
            </label>
            <select
              id="filter-course"
              value={courseFilter}
              onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {coursesData?.data.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-subject" className="block text-sm font-medium text-gray-700 mb-1">
              Asignatura
            </label>
            <select
              id="filter-subject"
              value={subjectFilter}
              onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {subjectsData?.data.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-period" className="block text-sm font-medium text-gray-700 mb-1">
              Periodo
            </label>
            <select
              id="filter-period"
              value={periodFilter}
              onChange={(e) => { setPeriodFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {periodsData?.data.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'No se encontraron asignaciones' : 'No hay asignaciones docentes'}
          description={
            hasActiveFilters
              ? 'No encontramos asignaciones que coincidan con los filtros.'
              : 'Comienza creando una nueva asignación docente.'
          }
          action={
            canManage && !hasActiveFilters ? (
              <Button onClick={() => navigate('/teacher-assignments/new')}>Nueva asignación</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Profesor</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Curso</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Asignatura</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Periodo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Inicio</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fin</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {userMap[assignment.teacherUserId] ?? assignment.teacherUserId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {courseMap[assignment.courseId] ?? assignment.courseId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {subjectMap[assignment.subjectId] ?? assignment.subjectId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {periodMap[assignment.academicPeriodId] ?? assignment.academicPeriodId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString('es-CO') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString('es-CO') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[assignment.status]}>
                          {TEACHER_ASSIGNMENT_STATUS_LABELS[assignment.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/teacher-assignments/${assignment.id}`)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {userMap[assignment.teacherUserId] ?? 'Profesor'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {courseMap[assignment.courseId] ?? 'Curso'} — {subjectMap[assignment.subjectId] ?? 'Asignatura'}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANT[assignment.status]}>
                      {TEACHER_ASSIGNMENT_STATUS_LABELS[assignment.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Periodo: {periodMap[assignment.academicPeriodId] ?? '—'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Inicio: {assignment.startDate ? new Date(assignment.startDate).toLocaleDateString('es-CO') : '—'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Fin: {assignment.endDate ? new Date(assignment.endDate).toLocaleDateString('es-CO') : '—'}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/teacher-assignments/${assignment.id}`)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Mostrando {(meta.page - 1) * meta.limit + 1}–
                {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="flex items-center px-3 text-gray-700">
                  Página {meta.page} de {meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
