import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnrollments } from '../hooks';
import { useStudents } from '@/modules/students/hooks';
import { useCourses } from '@/modules/courses/hooks';
import { useAcademicPeriods } from '@/modules/academic-periods/hooks';
import { useSchoolGrades } from '@/modules/school-grades/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { ENROLLMENT_STATUS_LABELS } from '@/api/types';
import type { EnrollmentStatus } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<EnrollmentStatus, 'success' | 'warning' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  WITHDRAWN: 'warning',
};

export function EnrollmentsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.ENROLLMENTS_MANAGE);

  const [page, setPage] = useState(1);
  const [studentIdFilter, setStudentIdFilter] = useState('');
  const [courseIdFilter, setCourseIdFilter] = useState('');
  const [schoolGradeIdFilter, setSchoolGradeIdFilter] = useState('');
  const [academicPeriodIdFilter, setAcademicPeriodIdFilter] = useState('');
  const limit = 20;

  const { data, isLoading, error } = useEnrollments({
    page,
    limit,
    studentId: studentIdFilter || undefined,
    courseId: courseIdFilter || undefined,
    schoolGradeId: schoolGradeIdFilter || undefined,
    academicPeriodId: academicPeriodIdFilter || undefined,
  });

  const { data: studentsData } = useStudents({ limit: 200 });
  const { data: coursesData } = useCourses({ limit: 200 });
  const { data: schoolGradesData } = useSchoolGrades({ limit: 200 });
  const { data: periodsData } = useAcademicPeriods({ limit: 200 });

  const [studentMap, setStudentMap] = useState<Record<string, string>>({});
  const [courseMap, setCourseMap] = useState<Record<string, string>>({});
  const [schoolGradeMap, setSchoolGradeMap] = useState<Record<string, string>>({});
  const [periodMap, setPeriodMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (studentsData?.data) {
      const map: Record<string, string> = {};
      for (const s of studentsData.data) {
        map[s.id] = `${s.firstName} ${s.lastName}`;
      }
      setStudentMap(map);
    }
  }, [studentsData]);

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
    if (schoolGradesData?.data) {
      const map: Record<string, string> = {};
      for (const g of schoolGradesData.data) {
        map[g.id] = g.name;
      }
      setSchoolGradeMap(map);
    }
  }, [schoolGradesData]);

  useEffect(() => {
    if (periodsData?.data) {
      const map: Record<string, string> = {};
      for (const p of periodsData.data) {
        map[p.id] = p.name;
      }
      setPeriodMap(map);
    }
  }, [periodsData]);

  const enrollments = data?.data ?? [];
  const meta = data?.meta;

  const hasActiveFilters = studentIdFilter || courseIdFilter || schoolGradeIdFilter || academicPeriodIdFilter;

  const handleClearFilters = () => {
    setStudentIdFilter('');
    setCourseIdFilter('');
    setSchoolGradeIdFilter('');
    setAcademicPeriodIdFilter('');
    setPage(1);
  };

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matrículas"
        description="Gestionar matrículas de estudiantes en cursos"
        actions={
          canManage ? (
            <Button onClick={() => navigate('/enrollments/new')}>
              Nueva matrícula
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="filter-student" className="block text-sm font-medium text-gray-700 mb-1">
              Estudiante
            </label>
            <select
              id="filter-student"
              value={studentIdFilter}
              onChange={(e) => { setStudentIdFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {studentsData?.data.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-course" className="block text-sm font-medium text-gray-700 mb-1">
              Curso
            </label>
            <select
              id="filter-course"
              value={courseIdFilter}
              onChange={(e) => { setCourseIdFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {coursesData?.data.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-grade" className="block text-sm font-medium text-gray-700 mb-1">
              Grado
            </label>
            <select
              id="filter-grade"
              value={schoolGradeIdFilter}
              onChange={(e) => { setSchoolGradeIdFilter(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {schoolGradesData?.data.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-period" className="block text-sm font-medium text-gray-700 mb-1">
              Periodo
            </label>
            <select
              id="filter-period"
              value={academicPeriodIdFilter}
              onChange={(e) => { setAcademicPeriodIdFilter(e.target.value); setPage(1); }}
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
      ) : enrollments.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'No se encontraron matrículas' : 'No hay matrículas'}
          description={
            hasActiveFilters
              ? 'No encontramos matrículas que coincidan con los filtros.'
              : 'Comienza creando una nueva matrícula.'
          }
          action={
            canManage && !hasActiveFilters ? (
              <Button onClick={() => navigate('/enrollments/new')}>Nueva matrícula</Button>
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
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estudiante</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Curso</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Grado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Periodo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => (
                    <tr key={enrollment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {studentMap[enrollment.studentId] ?? enrollment.studentId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {courseMap[enrollment.courseId] ?? enrollment.courseId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {schoolGradeMap[enrollment.schoolGradeId] ?? enrollment.schoolGradeId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {periodMap[enrollment.academicPeriodId] ?? enrollment.academicPeriodId}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[enrollment.status]}>
                          {ENROLLMENT_STATUS_LABELS[enrollment.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(enrollment.enrolledAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/enrollments/${enrollment.id}`)}
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
            {enrollments.map((enrollment) => (
              <Card key={enrollment.id}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {studentMap[enrollment.studentId] ?? 'Estudiante'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {courseMap[enrollment.courseId] ?? 'Curso'}
                      </p>
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANT[enrollment.status]}>
                      {ENROLLMENT_STATUS_LABELS[enrollment.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Grado: {schoolGradeMap[enrollment.schoolGradeId] ?? '—'}</span>
                    <span>Periodo: {periodMap[enrollment.academicPeriodId] ?? '—'}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Matriculado: {new Date(enrollment.enrolledAt).toLocaleDateString('es-CO')}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/enrollments/${enrollment.id}`)}
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
