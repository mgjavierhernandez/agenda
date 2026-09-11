import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAcademicPeriods } from '@/modules/academic-periods';
import { useStudents } from '@/modules/students/hooks';
import { useChildContext } from '@/modules/children';
import { useStudentReport, useStudentBulletin } from '../hooks/useReports';
import {
  downloadStudentReportPdf,
  downloadStudentReportCsv,
  downloadBulletinPdf,
  downloadBulletinCsv,
} from '../hooks/useExportReport';
import { StudentReportView } from './StudentReportView';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { usePermissions } from '@/permissions/usePermissions';
import { PERMISSIONS } from '@/permissions/permission.constants';

export function ReportsPage() {
  const { hasPermission } = usePermissions();
  const canExport = hasPermission(PERMISSIONS.REPORTS_EXPORT);

  const { children, selectedChildId, isLoading: isLoadingChildren, isParent } = useChildContext();

  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);

  const [exportingReportPdf, setExportingReportPdf] = useState(false);
  const [exportingReportCsv, setExportingReportCsv] = useState(false);
  const [exportingBulletinPdf, setExportingBulletinPdf] = useState(false);
  const [exportingBulletinCsv, setExportingBulletinCsv] = useState(false);

  const { data: periodsData, isLoading: isLoadingPeriods } = useAcademicPeriods({
    page: 1,
    limit: 100,
  });
  const periods = useMemo(() => periodsData?.data ?? [], [periodsData]);

  const { data: studentsData, isLoading: isLoadingStudents } = useStudents({
    page: 1,
    limit: 8,
    search: studentSearch || undefined,
  });
  const students = studentsData?.data ?? [];

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const active = periods.find((p) => p.status === 'ACTIVE');
      setSelectedPeriodId(active ? active.id : periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  useEffect(() => {
    if (!isParent) return;
    const defaultChild = selectedChildId ?? children[0]?.studentId ?? null;
    if (selectedStudentId === null && defaultChild) {
      setSelectedStudentId(defaultChild);
    }
    if (
      selectedStudentId &&
      children.length > 0 &&
      !children.some((c) => c.studentId === selectedStudentId)
    ) {
      setSelectedStudentId(defaultChild);
    }
  }, [isParent, children, selectedChildId, selectedStudentId]);

  const handleStudentPicked = useCallback((studentId: string) => {
    setSelectedStudentId(studentId);
    setStudentPickerOpen(false);
    setStudentSearch('');
  }, []);

  const periodLabel =
    periods.find((p) => p.id === selectedPeriodId)?.name ??
    (selectedPeriodId ? 'Periodo seleccionado' : 'Todos los periodos');

  const report = useStudentReport(selectedStudentId ?? undefined, selectedPeriodId || undefined);
  const bulletin = useStudentBulletin(
    selectedStudentId ?? undefined,
    selectedPeriodId || undefined,
  );

  const selectedStudentName = students.find((s) => s.id === selectedStudentId)
    ? `${students.find((s) => s.id === selectedStudentId)!.firstName} ${students.find((s) => s.id === selectedStudentId)!.lastName}`
    : children.find((c) => c.studentId === selectedStudentId)
      ? `${children.find((c) => c.studentId === selectedStudentId)!.firstName} ${children.find((c) => c.studentId === selectedStudentId)!.lastName}`
      : null;

  const handleExportPdf = async () => {
    if (!selectedStudentId) return;
    setExportingReportPdf(true);
    try {
      await downloadStudentReportPdf(
        selectedStudentId,
        selectedStudentName ?? 'estudiante',
        selectedPeriodId || undefined,
      );
    } finally {
      setExportingReportPdf(false);
    }
  };

  const handleExportCsv = async () => {
    if (!selectedStudentId) return;
    setExportingReportCsv(true);
    try {
      await downloadStudentReportCsv(
        selectedStudentId,
        selectedStudentName ?? 'estudiante',
        selectedPeriodId || undefined,
      );
    } finally {
      setExportingReportCsv(false);
    }
  };

  const handleBulletinExportPdf = async () => {
    if (!selectedStudentId) return;
    setExportingBulletinPdf(true);
    try {
      await downloadBulletinPdf(
        selectedStudentId,
        selectedStudentName ?? 'estudiante',
        selectedPeriodId || undefined,
      );
    } finally {
      setExportingBulletinPdf(false);
    }
  };

  const handleBulletinExportCsv = async () => {
    if (!selectedStudentId) return;
    setExportingBulletinCsv(true);
    try {
      await downloadBulletinCsv(
        selectedStudentId,
        selectedStudentName ?? 'estudiante',
        selectedPeriodId || undefined,
      );
    } finally {
      setExportingBulletinCsv(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes y boletín"
        description="Consulta el reporte académico y el boletín del estudiante"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full sm:w-72">
          <label htmlFor="report-period" className="block text-sm font-medium text-gray-700 mb-1">
            Periodo académico
          </label>
          <select
            id="report-period"
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos los periodos</option>
            {isLoadingPeriods && <option disabled>Cargando…</option>}
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        {isParent ? (
          <div className="w-full sm:w-72">
            <label htmlFor="report-child" className="block text-sm font-medium text-gray-700 mb-1">
              Estudiante
            </label>
            <select
              id="report-child"
              value={selectedStudentId ?? ''}
              onChange={(e) => setSelectedStudentId(e.target.value || null)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Seleccionar…</option>
              {isLoadingChildren && <option disabled>Cargando…</option>}
              {children.map((c) => (
                <option key={c.studentId} value={c.studentId}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="w-full sm:w-80">
            <Input
              label="Estudiante"
              placeholder="Buscar estudiante…"
              value={studentSearch}
              onFocus={() => setStudentPickerOpen(true)}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setStudentPickerOpen(true);
              }}
            />
            {studentPickerOpen && (
              <div className="mt-1 rounded-md border border-gray-200 bg-white shadow-lg">
                {isLoadingStudents ? (
                  <p className="px-3 py-2 text-sm text-gray-500">Cargando…</p>
                ) : students.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500">Sin resultados.</p>
                ) : (
                  students.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStudentPicked(s.id)}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                    >
                      {s.firstName} {s.lastName}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!selectedStudentId ? (
        <EmptyState
          title="Selecciona un estudiante"
          description="Elige un estudiante (y opcionalmente un periodo) para consultar su reporte académico y boletín."
        />
      ) : report.isLoading || bulletin.isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : report.error ? (
        <ErrorState error={report.error} onRetry={() => report.refetch()} />
      ) : !report.data || !bulletin.data ? (
        <ErrorState
          error={new Error('No se encontró el reporte')}
          onRetry={() => report.refetch()}
        />
      ) : (
        <div className="space-y-8">
          {report.data ? (
            <Card padding="none">
              <div className="p-6">
                <StudentReportView
                  title="Reporte académico"
                  data={report.data}
                  canExport={canExport}
                  periodLabel={periodLabel}
                  onExportPdf={handleExportPdf}
                  onExportCsv={handleExportCsv}
                  isExportingPdf={exportingReportPdf}
                  isExportingCsv={exportingReportCsv}
                />
              </div>
            </Card>
          ) : null}

          {bulletin.data ? (
            <Card padding="none">
              <div className="p-6">
                <StudentReportView
                  title="Boletín académico"
                  data={bulletin.data}
                  canExport={canExport}
                  periodLabel={periodLabel}
                  onExportPdf={handleBulletinExportPdf}
                  onExportCsv={handleBulletinExportCsv}
                  isExportingPdf={exportingBulletinPdf}
                  isExportingCsv={exportingBulletinCsv}
                />
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
