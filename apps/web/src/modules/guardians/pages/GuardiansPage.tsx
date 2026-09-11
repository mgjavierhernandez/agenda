import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuardianStudents, useUnlinkGuardian } from '../hooks';
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
import { RELATIONSHIP_TYPE_LABELS, GUARDIAN_STUDENT_STATUS_LABELS } from '@/api/types';
import type { GuardianStudentStatus } from '@/api/types';

const STATUS_BADGE_VARIANT: Record<GuardianStudentStatus, 'success' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

export function GuardiansPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.GUARDIANS_MANAGE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmUnlink, setConfirmUnlink] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error } = useGuardianStudents({
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const unlinkMutation = useUnlinkGuardian();

  const links = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  const handleUnlink = async () => {
    if (!confirmUnlink) return;
    try {
      await unlinkMutation.mutateAsync(confirmUnlink.studentId);
      setConfirmUnlink(null);
    } catch {
      setConfirmUnlink(null);
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acudientes"
        description={
          canManage
            ? 'Vinculaciones entre acudientes y estudiantes'
            : 'Tus vinculaciones familiares: estudiantes a tu cargo y tipo de parentesco'
        }
        actions={
          canManage ? (
            <Button onClick={() => navigate('/guardians/new')}>Nueva vinculación</Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            label="Buscar"
            placeholder="Buscar por nombre del estudiante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {debouncedSearch && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 self-end mb-1"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : links.length === 0 ? (
        <EmptyState
          title={
            debouncedSearch
              ? 'No se encontraron vinculaciones'
              : 'No hay vinculaciones de acudientes'
          }
          description={
            debouncedSearch
              ? 'No encontramos vinculaciones que coincidan con la búsqueda.'
              : 'Comienza vinculando un acudiente a un estudiante.'
          }
          action={
            canManage && !debouncedSearch ? (
              <Button onClick={() => navigate('/guardians/new')}>Nueva vinculación</Button>
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
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Relación</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Principal</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <tr key={link.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {link.student.firstName} {link.student.lastName}
                          </p>
                          {link.student.documentNumber && (
                            <p className="text-xs text-gray-500">
                              Doc: {link.student.documentNumber}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {RELATIONSHIP_TYPE_LABELS[link.relationshipType]}
                      </td>
                      <td className="px-4 py-3">
                        {link.isPrimary ? (
                          <Badge variant="success">Sí</Badge>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[link.status]}>
                          {GUARDIAN_STUDENT_STATUS_LABELS[link.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/students/${link.studentId}`)}
                          >
                            Ver estudiante
                          </Button>
                          {canManage && link.status === 'ACTIVE' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() =>
                                setConfirmUnlink({
                                  studentId: link.studentId,
                                  studentName: `${link.student.firstName} ${link.student.lastName}`,
                                })
                              }
                            >
                              Desvincular
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="md:hidden space-y-3">
            {links.map((link) => (
              <Card key={link.id}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">
                        {link.student.firstName} {link.student.lastName}
                      </p>
                      {link.student.documentNumber && (
                        <p className="text-sm text-gray-500">Doc: {link.student.documentNumber}</p>
                      )}
                    </div>
                    <Badge variant={STATUS_BADGE_VARIANT[link.status]}>
                      {GUARDIAN_STUDENT_STATUS_LABELS[link.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>{RELATIONSHIP_TYPE_LABELS[link.relationshipType]}</span>
                    {link.isPrimary && <Badge variant="success">Principal</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/students/${link.studentId}`)}
                  >
                    Ver estudiante
                  </Button>
                  {canManage && link.status === 'ACTIVE' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setConfirmUnlink({
                          studentId: link.studentId,
                          studentName: `${link.student.firstName} ${link.student.lastName}`,
                        })
                      }
                    >
                      Desvincular
                    </Button>
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

      {confirmUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar desvinculación</h3>
            <p className="text-gray-600 mb-6">
              ¿Deseas desvincular al estudiante "{confirmUnlink.studentName}"? Esta acción cambiará
              el estado de la vinculación a Inactivo.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmUnlink(null)}>
                Cancelar
              </Button>
              <Button variant="danger" isLoading={unlinkMutation.isPending} onClick={handleUnlink}>
                Desvincular
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
