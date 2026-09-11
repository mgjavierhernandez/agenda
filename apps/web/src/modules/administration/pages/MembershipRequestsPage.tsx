import { useState } from 'react';
import { useAuth } from '@/auth/auth.store';
import { useMemberships, useApproveMembership, useRejectMembership } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { ROLE_LABELS } from '@/api/types';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

export function MembershipRequestsPage() {
  const { selectedInstitutionId } = useAuth();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.MEMBERSHIPS_MANAGE);

  const [page, setPage] = useState(1);
  const limit = 20;
  const [apiError, setApiError] = useState('');
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);

  const { data, isLoading, error } = useMemberships(selectedInstitutionId, {
    page,
    limit,
    status: 'PENDING',
  });
  const approve = useApproveMembership();
  const reject = useRejectMembership();

  const requests = data?.data ?? [];
  const meta = data?.meta;

  if (!canManage) {
    return (
      <Card>
        <p className="text-gray-600">No tienes permisos para gestionar solicitudes de acceso.</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  const handleApprove = async (membershipId: string) => {
    setApiError('');
    try {
      await approve.mutateAsync({ institutionId: selectedInstitutionId, membershipId });
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const handleReject = async (membershipId: string) => {
    setApiError('');
    try {
      await reject.mutateAsync({ institutionId: selectedInstitutionId, membershipId });
      setConfirmRejectId(null);
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de acceso"
        description="Aprueba o rechaza las solicitudes de autorregistro pendientes"
      />

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      {requests.length === 0 ? (
        <EmptyState
          title="Sin solicitudes pendientes"
          description="No hay solicitudes de acceso por revisar."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((m) => {
            const profile = m.user.profiles?.[0];
            return (
              <Card key={m.id}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="text-sm space-y-1">
                    <p className="text-base font-semibold text-gray-900">
                      {m.user.firstName} {m.user.lastName}
                    </p>
                    <p className="text-gray-500">{m.user.email}</p>
                    <p>
                      <span className="text-gray-500">Rol solicitado: </span>
                      <Badge variant="info">
                        {ROLE_LABELS[m.requestedRole ?? ''] ?? m.requestedRole ?? '—'}
                      </Badge>
                    </p>
                    {profile?.documentNumber && (
                      <p className="text-gray-600">
                        Documento: {profile.documentNumber}
                        {profile.phone ? ` · Tel: ${profile.phone}` : ''}
                        {profile.profession ? ` · ${profile.profession}` : ''}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs">
                      Solicitado el {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {confirmRejectId === m.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleReject(m.id)}
                          isLoading={reject.isPending}
                        >
                          Confirmar rechazo
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setConfirmRejectId(null)}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(m.id)}
                          isLoading={approve.isPending}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setConfirmRejectId(m.id)}
                        >
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-500">
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
