import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Spinner } from '@/components/ui/Spinner';
import { useAcademicSummary } from '../hooks/useAcademicSummary';
import { SubjectBars, PeriodTrend } from './AcademicCharts';

interface AcademicDashboardProps {
  /** Hijo seleccionado (padres) o undefined (estudiante: scope propio del backend). */
  studentId?: string;
  childName?: string;
  unreadCommunications?: number;
  pendingSignatures?: number;
}

/**
 * Panel analítico familiar: desempeño, tareas, comunicaciones y firmas
 * del hijo seleccionado (o del estudiante autenticado).
 */
export function AcademicDashboard({
  studentId,
  childName,
  unreadCommunications = 0,
  pendingSignatures = 0,
}: AcademicDashboardProps) {
  const [periodFilter, setPeriodFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const summary = useAcademicSummary({
    studentId,
    period: periodFilter || undefined,
    subjectId: subjectFilter || undefined,
  });

  const subjectOptions = summary.bySubject;

  return (
    <div className="space-y-6">
      {childName && (
        <Card>
          <p className="text-sm text-gray-500">
            Mostrando información de{' '}
            <span className="font-semibold text-gray-900">{childName}</span>. Usa el selector de
            hijo en la barra superior para cambiar.
          </p>
        </Card>
      )}

      {(summary.overdueTasks > 0 || unreadCommunications > 0 || pendingSignatures > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">Requiere tu atención</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            {summary.overdueTasks > 0 && (
              <li>
                <Link to="/tasks" className="underline">
                  {summary.overdueTasks} tarea{summary.overdueTasks === 1 ? '' : 's'} vencida
                  {summary.overdueTasks === 1 ? '' : 's'}
                </Link>
              </li>
            )}
            {unreadCommunications > 0 && (
              <li>
                <Link to="/communication-inbox" className="underline">
                  {unreadCommunications} comunicación{unreadCommunications === 1 ? '' : 'es'} sin
                  leer
                </Link>
              </li>
            )}
            {pendingSignatures > 0 && (
              <li>
                <Link to="/signatures" className="underline">
                  {pendingSignatures} firma{pendingSignatures === 1 ? '' : 's'} pendiente
                  {pendingSignatures === 1 ? '' : 's'}
                </Link>
              </li>
            )}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Promedio"
          value={summary.average !== null ? summary.average.toFixed(2) : '—'}
          icon={<span className="text-2xl">📈</span>}
          description={`${summary.gradesCount} calificaciones${periodFilter ? ` · ${periodFilter}` : ''}`}
        />
        <StatCard
          title="Tareas pendientes"
          value={summary.pendingTasks}
          icon={<span className="text-2xl">✅</span>}
          description="Por vencer"
        />
        <StatCard
          title="Tareas vencidas"
          value={summary.overdueTasks}
          icon={<span className="text-2xl">⏰</span>}
          description="Requieren atención"
        />
        <StatCard
          title="Firmas pendientes"
          value={pendingSignatures}
          icon={<span className="text-2xl">✍️</span>}
          description="De este estudiante"
        />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">Desempeño académico</h3>
          <div>
            <label htmlFor="dash-period" className="block text-xs font-medium text-gray-500 mb-1">
              Período
            </label>
            <select
              id="dash-period"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {summary.periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dash-subject" className="block text-xs font-medium text-gray-500 mb-1">
              Materia
            </label>
            <select
              id="dash-subject"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {subjectOptions.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {summary.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Promedio por materia</h4>
              <SubjectBars data={summary.bySubject} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Evolución por período</h4>
              <PeriodTrend data={summary.byPeriod} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
