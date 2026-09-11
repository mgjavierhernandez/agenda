import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { StudentReport } from '@/api/types';

interface StudentReportViewProps {
  title: string;
  data: StudentReport;
  canExport: boolean;
  periodLabel: string;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
  isExportingPdf?: boolean;
  isExportingCsv?: boolean;
}

function formatAverage(value: number | null | undefined): string {
  if (value == null) return '—';
  return Number(value.toFixed(2)).toString();
}

export function StudentReportView({
  title,
  data,
  canExport,
  periodLabel,
  onExportPdf,
  onExportCsv,
  isExportingPdf,
  isExportingCsv,
}: StudentReportViewProps) {
  const { student, institution, enrollment, academic, attendance, observador } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">
            {student.firstName} {student.lastName} · {institution.name} · {periodLabel}
          </p>
        </div>
        {canExport && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={onExportPdf} disabled={isExportingPdf}>
              {isExportingPdf ? 'Generando…' : 'PDF'}
            </Button>
            <Button variant="secondary" size="sm" onClick={onExportCsv} disabled={isExportingCsv}>
              {isExportingCsv ? 'Generando…' : 'CSV'}
            </Button>
          </div>
        )}
      </div>

      {enrollment && (
        <Card>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase text-gray-500">Curso</p>
              <p className="text-sm font-semibold text-gray-900">
                {enrollment.courseName}{' '}
                <span className="text-gray-500">({enrollment.courseCode})</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Grado</p>
              <p className="text-sm font-semibold text-gray-900">{enrollment.schoolGradeName}</p>
            </div>
          </div>
        </Card>
      )}

      <Card padding="none">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="font-medium text-gray-900">Rendimiento académico</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Asignatura</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Docente</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Notas</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {academic.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Sin notas registradas para este periodo.
                  </td>
                </tr>
              ) : (
                academic.map((subject) => (
                  <tr key={subject.subjectId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{subject.subjectName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {subject.teacher
                        ? `${subject.teacher.firstName} ${subject.teacher.lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {subject.grades.length === 0
                        ? '—'
                        : subject.grades.map((g) => `${g.period}: ${g.value}`).join(', ')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatAverage(subject.simpleAverage)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-medium text-gray-900">Asistencia</h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-900">{attendance.total}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Presente</p>
              <p className="text-lg font-bold text-emerald-600">{attendance.present}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Tarde</p>
              <p className="text-lg font-bold text-amber-600">{attendance.late}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Ausente</p>
              <p className="text-lg font-bold text-red-600">{attendance.absent}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Justificado</p>
              <p className="text-lg font-bold text-blue-600">{attendance.excused}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-medium text-gray-900">Observador del estudiante</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Total</p>
              <p className="text-lg font-bold text-gray-900">{observador.total}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Abiertos</p>
              <p className="text-lg font-bold text-amber-600">{observador.open}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Resueltos</p>
              <p className="text-lg font-bold text-emerald-600">{observador.resolved}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {Object.keys(observador.byConfidentiality).length === 0 ? (
              <p className="text-sm text-gray-500">Sin registros visibles.</p>
            ) : (
              Object.entries(observador.byConfidentiality).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between text-sm">
                  <Badge variant="default">{level}</Badge>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
