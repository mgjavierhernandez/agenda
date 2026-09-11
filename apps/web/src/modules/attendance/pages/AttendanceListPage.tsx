import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendances } from '../hooks';
import { useStudents } from '@/modules/students/hooks';
import { useCourses } from '@/modules/courses/hooks';
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
import { ATTENDANCE_STATUS_LABELS } from '@/api/types';
import type { AttendanceStatus } from '@/api/types';

const ATTENDANCE_STATUS_VARIANT: Record<
  AttendanceStatus,
  'success' | 'danger' | 'warning' | 'info'
> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  LATE: 'warning',
  EXCUSED: 'info',
};

export function AttendanceListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canRegister = hasPermission(PERMISSIONS.ATTENDANCE_CREATE);

  const [page, setPage] = useState(1);
  const [studentIdFilter, setStudentIdFilter] = useState('');
  const [courseIdFilter, setCourseIdFilter] = useState('');
  const [academicPeriodIdFilter, setAcademicPeriodIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | ''>('');
  const [dateFilter, setDateFilter] = useState('');
  const limit = 20;

  const { data, isLoading, error } = useAttendances({
    page,
    limit,
    studentId: studentIdFilter || undefined,
    courseId: courseIdFilter || undefined,
    academicPeriodId: academicPeriodIdFilter || undefined,
    status: (statusFilter as AttendanceStatus) || undefined,
    date: dateFilter || undefined,
  });

  const { data: studentsData } = useStudents({ limit: 200 });
  const { data: coursesData } = useCourses({ limit: 200 });
  const { data: periodsData } = useAcademicPeriods({ limit: 200 });

  const [studentMap, setStudentMap] = useState<Record<string, string>>({});
  const [courseMap, setCourseMap] = useState<Record<string, string>>({});
  const [periodMap, setPeriodMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (studentsData?.data) {
      const map: Record<string, string> = {};
      for (const s of studentsData.data) map[s.id] = `${s.firstName} ${s.lastName}`;
      setStudentMap(map);
    }
  }, [studentsData]);

  useEffect(() => {
    if (coursesData?.data) {
      const map: Record<string, string> = {};
      for (const c of coursesData.data) map[c.id] = c.name;
      setCourseMap(map);
    }
  }, [coursesData]);

  useEffect(() => {
    if (periodsData?.data) {
      const map: Record<string, string> = {};
      for (const p of periodsData.data) map[p.id] = p.name;
      setPeriodMap(map);
    }
  }, [periodsData]);

  const attendances = data?.data ?? [];
  const meta = data?.meta;

  const hasActiveFilters =
    studentIdFilter || courseIdFilter || academicPeriodIdFilter || statusFilter || dateFilter;

  const handleClearFilters = () => {
    setStudentIdFilter('');
    setCourseIdFilter('');
    setAcademicPeriodIdFilter('');
    setStatusFilter('');
    setDateFilter('');
    setPage(1);
  };

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asistencia"
        description="Registro de asistencia de estudiantes a los cursos"
        actions={
          canRegister ? (
            <Button onClick={() => navigate('/attendance/register')}>Registrar asistencia</Button>
          ) : undefined
        }
      />

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label
              htmlFor="filter-student"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Estudiante
            </label>
            <select
              id="filter-student"
              value={studentIdFilter}
              onChange={(e) => {
                setStudentIdFilter(e.target.value);
                setPage(1);
              }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {studentsData?.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
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
              onChange={(e) => {
                setCourseIdFilter(e.target.value);
                setPage(1);
              }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {coursesData?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
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
              onChange={(e) => {
                setAcademicPeriodIdFilter(e.target.value);
                setPage(1);
              }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {periodsData?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as AttendanceStatus | '');
                setPage(1);
              }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-date" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <input
              id="filter-date"
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
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
      ) : attendances.length === 0 ? (
        <EmptyState
          title={
            hasActiveFilters ? 'No se encontraron registros' : 'No hay registros de asistencia'
          }
          description={
            hasActiveFilters
              ? 'No encontramos asistencias que coincidan con los filtros.'
              : 'Comienza registrando la asistencia de un curso.'
          }
          action={
            canRegister && !hasActiveFilters ? (
              <Button onClick={() => navigate('/attendance/register')}>Registrar asistencia</Button>
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
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Periodo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((attendance) => (
                    <tr key={attendance.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {studentMap[attendance.studentId] ?? attendance.studentId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {courseMap[attendance.courseId] ?? attendance.courseId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {periodMap[attendance.academicPeriodId] ?? attendance.academicPeriodId}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(attendance.date).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ATTENDANCE_STATUS_VARIANT[attendance.status]}>
                          {ATTENDANCE_STATUS_LABELS[attendance.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{attendance.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {attendances.map((attendance) => (
              <Card key={attendance.id}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {studentMap[attendance.studentId] ?? 'Estudiante'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {courseMap[attendance.courseId] ?? 'Curso'}
                      </p>
                    </div>
                    <Badge variant={ATTENDANCE_STATUS_VARIANT[attendance.status]}>
                      {ATTENDANCE_STATUS_LABELS[attendance.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Periodo: {periodMap[attendance.academicPeriodId] ?? '—'}</span>
                    <span>Fecha: {new Date(attendance.date).toLocaleDateString('es-CO')}</span>
                  </div>
                  {attendance.notes && (
                    <p className="text-xs text-gray-500">Notas: {attendance.notes}</p>
                  )}
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
