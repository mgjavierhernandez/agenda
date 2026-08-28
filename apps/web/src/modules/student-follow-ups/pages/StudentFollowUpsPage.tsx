import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentFollowUps, useFollowUpCategories } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { FollowUpType, FollowUpSeverity, FollowUpStatus, FollowUpConfidentiality } from '@/api/types';
import {
  FOLLOW_UP_TYPE_LABELS,
  FOLLOW_UP_SEVERITY_LABELS,
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_CONFIDENTIALITY_LABELS,
} from '@/api/types';

const TYPE_BADGE_VARIANT: Record<FollowUpType, 'default' | 'info' | 'warning'> = {
  ACADEMICO: 'info',
  CONVIVENCIA: 'warning',
  FORMATIVO: 'default',
};

const SEVERITY_BADGE_VARIANT: Record<FollowUpSeverity, 'default' | 'success' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
};

const STATUS_BADGE_VARIANT: Record<FollowUpStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  OPEN: 'info',
  IN_PROGRESS: 'success',
  ESCALATED: 'danger',
  PENDING_FOLLOW_UP: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const CONFIDENTIALITY_BADGE_VARIANT: Record<FollowUpConfidentiality, 'default' | 'success' | 'warning' | 'danger'> = {
  PUBLIC: 'success',
  INTERNAL: 'default',
  CONFIDENTIAL: 'warning',
  SENSITIVE: 'danger',
};

export function StudentFollowUpsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(PERMISSIONS.STUDENT_FOLLOW_UPS_CREATE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<FollowUpType | ''>('');
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<FollowUpSeverity | ''>('');
  const [categoryIdFilter, setCategoryIdFilter] = useState('');
  const [createdFromFilter, setCreatedFromFilter] = useState('');
  const [createdToFilter, setCreatedToFilter] = useState('');
  const limit = 20;

  const { data: categories = [] } = useFollowUpCategories();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useStudentFollowUps({
    page,
    limit,
    search: debouncedSearch || undefined,
    type: (typeFilter as FollowUpType) || undefined,
    status: (statusFilter as FollowUpStatus) || undefined,
    severity: (severityFilter as FollowUpSeverity) || undefined,
    categoryId: categoryIdFilter || undefined,
    createdFrom: createdFromFilter || undefined,
    createdTo: createdToFilter || undefined,
  });

  const followUps = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setSeverityFilter('');
    setCategoryIdFilter('');
    setCreatedFromFilter('');
    setCreatedToFilter('');
    setPage(1);
  }, []);

  const hasActiveFilters = debouncedSearch || typeFilter || statusFilter || severityFilter || categoryIdFilter || createdFromFilter || createdToFilter;

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observador del Alumno"
        description="Seguimiento y observaciones de estudiantes"
        actions={
          canCreate ? (
            <Button onClick={() => navigate('/student-follow-ups/new')}>
              Nuevo seguimiento
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por título, resumen o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as FollowUpType | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="ACADEMICO">Académico</option>
            <option value="CONVIVENCIA">Convivencia</option>
            <option value="FORMATIVO">Formativo</option>
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as FollowUpStatus | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="OPEN">Abierto</option>
            <option value="IN_PROGRESS">En progreso</option>
            <option value="ESCALATED">Escalado</option>
            <option value="PENDING_FOLLOW_UP">Pendiente seguimiento</option>
            <option value="RESOLVED">Resuelto</option>
            <option value="CLOSED">Cerrado</option>
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="severityFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Severidad
          </label>
          <select
            id="severityFilter"
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value as FollowUpSeverity | '');
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="categoryIdFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <select
            id="categoryIdFilter"
            value={categoryIdFilter}
            onChange={(e) => {
              setCategoryIdFilter(e.target.value);
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="createdFromFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Desde
          </label>
          <input
            id="createdFromFilter"
            type="date"
            value={createdFromFilter}
            onChange={(e) => {
              setCreatedFromFilter(e.target.value);
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="createdToFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Hasta
          </label>
          <input
            id="createdToFilter"
            type="date"
            value={createdToFilter}
            onChange={(e) => {
              setCreatedToFilter(e.target.value);
              setPage(1);
            }}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 mb-1"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : followUps.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'No se encontraron seguimientos' : 'No hay seguimientos registrados'}
          description={
            hasActiveFilters
              ? 'No encontramos seguimientos que coincidan con los filtros aplicados.'
              : 'Comienza registrando un seguimiento de observador del alumno.'
          }
          action={
            canCreate && !hasActiveFilters ? (
              <Button onClick={() => navigate('/student-follow-ups/new')}>Nuevo seguimiento</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estudiante</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Título</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Severidad</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Confidencialidad</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {followUps.map((fu) => (
                    <tr key={fu.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[150px] truncate">
                        {fu.student.firstName} {fu.student.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate" title={fu.title}>
                        {fu.title}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={TYPE_BADGE_VARIANT[fu.type]}>
                          {FOLLOW_UP_TYPE_LABELS[fu.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={SEVERITY_BADGE_VARIANT[fu.severity]}>
                          {FOLLOW_UP_SEVERITY_LABELS[fu.severity]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[fu.status]}>
                          {FOLLOW_UP_STATUS_LABELS[fu.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={CONFIDENTIALITY_BADGE_VARIANT[fu.confidentiality]}>
                          {FOLLOW_UP_CONFIDENTIALITY_LABELS[fu.confidentiality]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(fu.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/student-follow-ups/${fu.id}`)}
                          >
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {followUps.map((fu) => (
              <Card key={fu.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">
                      {fu.student.firstName} {fu.student.lastName}
                    </p>
                    <p className="text-sm text-gray-600 truncate">{fu.title}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={TYPE_BADGE_VARIANT[fu.type]}>{FOLLOW_UP_TYPE_LABELS[fu.type]}</Badge>
                      <Badge variant={SEVERITY_BADGE_VARIANT[fu.severity]}>{FOLLOW_UP_SEVERITY_LABELS[fu.severity]}</Badge>
                      <Badge variant={STATUS_BADGE_VARIANT[fu.status]}>{FOLLOW_UP_STATUS_LABELS[fu.status]}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(fu.createdAt).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/student-follow-ups/${fu.id}`)}
                  >
                    Ver detalle
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
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
