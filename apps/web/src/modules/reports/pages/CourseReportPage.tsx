import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAcademicPeriods } from '@/modules/academic-periods';
import { useCourses } from '@/modules/courses/hooks';
import { useCourseReport } from '../hooks/useReports';
import { downloadCourseReportCsv } from '../hooks/useExportReport';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/permissions/usePermissions';
import { PERMISSIONS } from '@/permissions/permission.constants';

function formatAverage(value: number | null | undefined): string {
  if (value == null) return '—';
  return Number(value.toFixed(2)).toString();
}

export function CourseReportPage() {
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermissions();
  const canExport = hasPermission(PERMISSIONS.REPORTS_EXPORT);

  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('courseId') ?? '');
  const [selectedPeriodId, setSelectedPeriodId] = useState(searchParams.get('periodId') ?? '');
  const [isExporting, setIsExporting] = useState(false);

  const { data: periodsData } = useAcademicPeriods({ page: 1, limit: 100 });
  const periods = useMemo(() => periodsData?.data ?? [], [periodsData]);

  const { data: coursesData } = useCourses({ page: 1, limit: 100, status: 'ACTIVE' });
  const courses = useMemo(() => coursesData?.data ?? [], [coursesData]);

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const active = periods.find((p) => p.status === 'ACTIVE');
      setSelectedPeriodId(active ? active.id : periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const { data, isLoading, error, refetch } = useCourseReport(
    selectedCourseId || undefined,
    selectedPeriodId || undefined,
  );

  const courseLabel =
    courses.find((c) => c.id === selectedCourseId)?.name ??
    (selectedCourseId ? 'Curso seleccionado' : '');

  const handleExportCsv = async () => {
    if (!selectedCourseId) return;
    setIsExporting(true);
    try {
      await downloadCourseReportCsv(
        selectedCourseId,
        courseLabel || 'curso',
        selectedPeriodId || undefined,
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporte de curso"
        description="Consolidado académico y de asistencia por curso"
        actions={
          canExport && selectedCourseId ? (
            <Button variant="secondary" onClick={handleExportCsv} disabled={isExporting}>
              {isExporting ? 'Generando…' : 'Exportar CSV'}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full sm:w-72">
          <label
            htmlFor="course-report-course"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Curso
          </label>
          <select
            id="course-report-course"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Seleccionar…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-72">
          <label
            htmlFor="course-report-period"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Periodo académico
          </label>
          <select
            id="course-report-period"
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos los periodos</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedCourseId ? (
        <EmptyState
          title="Selecciona un curso"
          description="Elige un curso para ver el consolidado académico y de asistencia de sus estudiantes."
        />
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data ? (
        <ErrorState error={new Error('No se encontró el reporte')} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-xs font-medium uppercase text-gray-500">Estudiantes</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary.totalStudents}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase text-gray-500">Con notas</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary.studentsWithGrades}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase text-gray-500">Con asistencia</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.summary.studentsWithAttendance}
              </p>
            </Card>
          </div>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estudiante</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Grado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Asignaturas</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Notas</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Promedio</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((row) => (
                    <tr key={row.student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {row.student.firstName} {row.student.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.schoolGradeName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{row.subjectCount}</td>
                      <td className="px-4 py-3 text-gray-600">{row.gradeCount}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatAverage(row.simpleAverage)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.attendance.total > 0
                          ? `${row.attendance.present}P / ${row.attendance.absent}A / ${row.attendance.late}T`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
