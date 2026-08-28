import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  useStudentFollowUp,
  useCloseStudentFollowUp,
  useEscalateStudentFollowUp,
  useFollowUpStudentFollowUp,
  useResolveStudentFollowUp,
  useReopenStudentFollowUp,
  useFollowUpEntries,
  useCreateFollowUpEntry,
  useUpdateFollowUpEntry,
  useFollowUpCommitments,
  useCreateCommitment,
  useUpdateCommitment,
  useFollowUpAttachments,
  useCreateFollowUpAttachment,
  useRemoveFollowUpAttachment,
  useUsers,
} from '../hooks';
import { useUploadFile } from '@/modules/files/hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { getErrorMessage } from '@/api/errors';
import type {
  FollowUpStatus,
  FollowUpEntryType,
  CommitmentResponsibleRole,
  CommitmentStatus,
} from '@/api/types';
import {
  FOLLOW_UP_TYPE_LABELS,
  FOLLOW_UP_SEVERITY_LABELS,
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_CONFIDENTIALITY_LABELS,
  FOLLOW_UP_ENTRY_TYPE_LABELS,
  COMMITMENT_STATUS_LABELS,
  COMMITMENT_ROLE_LABELS,
} from '@/api/types';

const STATUS_BADGE_VARIANT: Record<FollowUpStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  OPEN: 'info',
  IN_PROGRESS: 'success',
  ESCALATED: 'danger',
  PENDING_FOLLOW_UP: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

const COMMITMENT_STATUS_BADGE: Record<CommitmentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
  OVERDUE: 'danger',
};

const VALID_TRANSITIONS: Record<FollowUpStatus, FollowUpStatus[]> = {
  OPEN: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
  IN_PROGRESS: ['ESCALATED', 'PENDING_FOLLOW_UP', 'RESOLVED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'PENDING_FOLLOW_UP', 'CLOSED'],
  PENDING_FOLLOW_UP: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

type TabKey = 'timeline' | 'commitments' | 'attachments';

export function StudentFollowUpDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const canUpdate = hasPermission(PERMISSIONS.STUDENT_FOLLOW_UPS_UPDATE);
  const canClose = hasPermission(PERMISSIONS.STUDENT_FOLLOW_UPS_CLOSE);
  const canEscalate = hasPermission(PERMISSIONS.STUDENT_FOLLOW_UPS_ESCALATE);
  const canFollowUp = hasPermission(PERMISSIONS.STUDENT_FOLLOW_UPS_FOLLOW_UP);
  const canCommit = hasPermission(PERMISSIONS.STUDENT_FOLLOW_UPS_COMMIT);
  const canAttach = hasPermission(PERMISSIONS.STUDENT_FOLLOW_UPS_ATTACH);
  const canManage = hasPermission(PERMISSIONS.STUDENT_FOLLOW_UPS_MANAGE);

  const { data: followUp, isLoading, error } = useStudentFollowUp(id ?? '');
  const closeMutation = useCloseStudentFollowUp();
  const escalateMutation = useEscalateStudentFollowUp();
  const followUpMutation = useFollowUpStudentFollowUp();
  const resolveMutation = useResolveStudentFollowUp();
  const reopenMutation = useReopenStudentFollowUp();

  const { data: entriesData, isLoading: isLoadingEntries } = useFollowUpEntries(id ?? '');
  const entries = entriesData?.data ?? [];
  const createEntryMutation = useCreateFollowUpEntry();
  const updateEntryMutation = useUpdateFollowUpEntry();

  const { data: commitmentsData, isLoading: isLoadingCommitments } = useFollowUpCommitments(id ?? '');
  const commitments = commitmentsData?.data ?? [];
  const createCommitmentMutation = useCreateCommitment();
  const updateCommitmentMutation = useUpdateCommitment();

  const { data: usersData } = useUsers();
  const users = usersData?.data ?? [];

  const { data: attachments = [], isLoading: isLoadingAttachments } = useFollowUpAttachments(id ?? '');
  const createAttachmentMutation = useCreateFollowUpAttachment();
  const removeAttachmentMutation = useRemoveFollowUpAttachment();
  const uploadMutation = useUploadFile();

  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const [confirmAction, setConfirmAction] = useState<'close' | 'escalate' | 'followUp' | 'resolve' | 'reopen' | null>(null);

  // Entry form state
  const [entryType, setEntryType] = useState<FollowUpEntryType>('NOTE');
  const [entryContent, setEntryContent] = useState('');
  const [entryError, setEntryError] = useState('');

  // Commitment form state
  const [showCommitmentForm, setShowCommitmentForm] = useState(false);
  const [commitmentDescription, setCommitmentDescription] = useState('');
  const [commitmentRole, setCommitmentRole] = useState<CommitmentResponsibleRole>('TEACHER');
  const [commitmentResponsibleUserId, setCommitmentResponsibleUserId] = useState('');
  const [commitmentDueDate, setCommitmentDueDate] = useState('');
  const [commitmentError, setCommitmentError] = useState('');

  // Entry edit state
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryType, setEditEntryType] = useState<FollowUpEntryType>('NOTE');
  const [editEntryContent, setEditEntryContent] = useState('');
  const [editEntryError, setEditEntryError] = useState('');

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

  if (!followUp) {
    return <ErrorState error={{ statusCode: 404, message: 'Seguimiento no encontrado', timestamp: '', path: '' }} />;
  }

  const isClosed = followUp.status === 'CLOSED';
  const transitions = VALID_TRANSITIONS[followUp.status];

  const handleConfirmAction = async () => {
    if (!id || !confirmAction) return;
    try {
      if (confirmAction === 'close') await closeMutation.mutateAsync(id);
      else if (confirmAction === 'escalate') await escalateMutation.mutateAsync(id);
      else if (confirmAction === 'followUp') await followUpMutation.mutateAsync(id);
      else if (confirmAction === 'resolve') await resolveMutation.mutateAsync(id);
      else if (confirmAction === 'reopen') await reopenMutation.mutateAsync(id);
      setConfirmAction(null);
    } catch {
      setConfirmAction(null);
    }
  };

  const handleCreateEntry = async () => {
    if (!id) return;
    setEntryError('');
    if (!entryContent.trim()) {
      setEntryError('El contenido es requerido');
      return;
    }
    try {
      await createEntryMutation.mutateAsync({
        followUpId: id,
        data: { entryType, content: entryContent.trim() },
      });
      setEntryContent('');
      setEntryType('NOTE');
    } catch (err) {
      setEntryError(getErrorMessage(err) || 'Error al crear la entrada');
    }
  };

  const handleCreateCommitment = async () => {
    if (!id) return;
    setCommitmentError('');
    if (!commitmentDescription.trim()) {
      setCommitmentError('La descripción es requerida');
      return;
    }
    const responsibleUserId = commitmentResponsibleUserId || followUp.createdById;
    try {
      await createCommitmentMutation.mutateAsync({
        followUpId: id,
        data: {
          responsibleUserId,
          responsibleRole: commitmentRole,
          description: commitmentDescription.trim(),
          dueDate: commitmentDueDate ? new Date(commitmentDueDate).toISOString() : undefined,
        },
      });
      setCommitmentDescription('');
      setCommitmentRole('TEACHER');
      setCommitmentResponsibleUserId('');
      setCommitmentDueDate('');
      setShowCommitmentForm(false);
    } catch (err) {
      setCommitmentError(getErrorMessage(err) || 'Error al crear el compromiso');
    }
  };

  const handleToggleCommitmentStatus = async (commitmentId: string, currentStatus: CommitmentStatus) => {
    if (!id) return;
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await updateCommitmentMutation.mutateAsync({
        followUpId: id,
        commitmentId,
        data: { status: newStatus },
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handleStartEditEntry = (entry: { id: string; entryType: FollowUpEntryType; content: string }) => {
    setEditingEntryId(entry.id);
    setEditEntryType(entry.entryType);
    setEditEntryContent(entry.content);
    setEditEntryError('');
  };

  const handleCancelEditEntry = () => {
    setEditingEntryId(null);
    setEditEntryType('NOTE');
    setEditEntryContent('');
    setEditEntryError('');
  };

  const handleSaveEditEntry = async (entryId: string) => {
    if (!id) return;
    setEditEntryError('');
    if (!editEntryContent.trim()) {
      setEditEntryError('El contenido es requerido');
      return;
    }
    try {
      await updateEntryMutation.mutateAsync({
        followUpId: id,
        entryId,
        data: { entryType: editEntryType, content: editEntryContent.trim() },
      });
      setEditingEntryId(null);
      setEditEntryType('NOTE');
      setEditEntryContent('');
    } catch (err) {
      setEditEntryError(getErrorMessage(err) || 'Error al actualizar la entrada');
    }
  };

  const handleUploadComplete = async (fileAsset: { id: string }) => {
    if (!id) return;
    await createAttachmentMutation.mutateAsync({
      followUpId: id,
      data: { fileAssetId: fileAsset.id },
    });
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!id) return;
    if (!confirm('¿Estás seguro de desvincular este archivo?')) return;
    try {
      await removeAttachmentMutation.mutateAsync({ followUpId: id, attachmentId });
    } catch {
      // Error handled by mutation
    }
  };

  const isTransitionPending = closeMutation.isPending || escalateMutation.isPending || followUpMutation.isPending || resolveMutation.isPending || reopenMutation.isPending;

  const getConfirmMessage = () => {
    if (confirmAction === 'close') return '¿Deseas cerrar este seguimiento? No se podrán agregar más entradas.';
    if (confirmAction === 'escalate') return '¿Deseas escalar este seguimiento?';
    if (confirmAction === 'followUp') return '¿Deseas marcar este seguimiento como "En progreso"?';
    if (confirmAction === 'resolve') return '¿Deseas marcar este seguimiento como resuelto?';
    if (confirmAction === 'reopen') return '¿Deseas reabrir este seguimiento?';
    return '';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={followUp.title}
        description={`${followUp.student.firstName} ${followUp.student.lastName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canUpdate && !isClosed && (
              <Button variant="secondary" onClick={() => navigate(`/student-follow-ups/${id}/edit`)}>
                Editar
              </Button>
            )}
            {canEscalate && transitions.includes('ESCALATED') && (
              <Button variant="danger" onClick={() => setConfirmAction('escalate')}>
                Escalar
              </Button>
            )}
            {canFollowUp && transitions.includes('IN_PROGRESS') && (
              <Button onClick={() => setConfirmAction('followUp')}>
                Seguimiento
              </Button>
            )}
            {canUpdate && transitions.includes('RESOLVED') && (
              <Button variant="secondary" onClick={() => setConfirmAction('resolve')}>
                Resolver
              </Button>
            )}
            {canClose && transitions.includes('CLOSED') && (
              <Button variant="secondary" onClick={() => setConfirmAction('close')}>
                Cerrar
              </Button>
            )}
            {canManage && followUp.status === 'CLOSED' && (
              <Button onClick={() => setConfirmAction('reopen')}>
                Reabrir
              </Button>
            )}
          </div>
        }
      />

      {/* Main info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Seguimiento</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Estudiante</dt>
              <dd className="text-gray-900">{followUp.student.firstName} {followUp.student.lastName}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Tipo</dt>
              <dd className="text-gray-900">{FOLLOW_UP_TYPE_LABELS[followUp.type]}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Severidad</dt>
              <dd className="text-gray-900">{FOLLOW_UP_SEVERITY_LABELS[followUp.severity]}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd>
                <Badge variant={STATUS_BADGE_VARIANT[followUp.status]}>
                  {FOLLOW_UP_STATUS_LABELS[followUp.status]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Confidencialidad</dt>
              <dd className="text-gray-900">{FOLLOW_UP_CONFIDENTIALITY_LABELS[followUp.confidentiality]}</dd>
            </div>
            {followUp.category && (
              <div>
                <dt className="text-sm text-gray-500">Categoría</dt>
                <dd className="text-gray-900">{followUp.category.name}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles</h3>
          <dl className="space-y-3">
            {followUp.summary && (
              <div>
                <dt className="text-sm text-gray-500">Resumen</dt>
                <dd className="text-gray-900 whitespace-pre-wrap">{followUp.summary}</dd>
              </div>
            )}
            {followUp.description && (
              <div>
                <dt className="text-sm text-gray-500">Descripción</dt>
                <dd className="text-gray-900 whitespace-pre-wrap">{followUp.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500">Creado por</dt>
              <dd className="text-gray-900">{followUp.createdBy.firstName} {followUp.createdBy.lastName}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fecha de creación</dt>
              <dd className="text-gray-900">{new Date(followUp.createdAt).toLocaleString('es-CO')}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Última actualización</dt>
              <dd className="text-gray-900">{new Date(followUp.updatedAt).toLocaleString('es-CO')}</dd>
            </div>
            {followUp.closedAt && followUp.closedBy && (
              <>
                <div>
                  <dt className="text-sm text-gray-500">Cerrado por</dt>
                  <dd className="text-gray-900">{followUp.closedBy.firstName} {followUp.closedBy.lastName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Fecha de cierre</dt>
                  <dd className="text-gray-900">{new Date(followUp.closedAt).toLocaleString('es-CO')}</dd>
                </div>
              </>
            )}
          </dl>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4" aria-label="Tabs">
          {(['timeline', 'commitments', 'attachments'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {tab === 'timeline' && 'Cronología'}
              {tab === 'commitments' && `Compromisos (${commitments.length})`}
              {tab === 'attachments' && `Archivos (${attachments.length})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Timeline tab */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {canFollowUp && !isClosed && (
            <Card>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Agregar entrada</h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="entryType" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de entrada
                  </label>
                  <select
                    id="entryType"
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value as FollowUpEntryType)}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="NOTE">Nota</option>
                    <option value="MEETING">Reunión</option>
                    <option value="OBSERVATION">Observación</option>
                    <option value="ACTION">Acción</option>
                    <option value="FOLLOW_UP">Seguimiento</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="entryContent" className="block text-sm font-medium text-gray-700 mb-1">
                    Contenido *
                  </label>
                  <textarea
                    id="entryContent"
                    value={entryContent}
                    onChange={(e) => setEntryContent(e.target.value)}
                    rows={3}
                    maxLength={5000}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Describe la observación, reunión o acción realizada..."
                  />
                  {entryError && <p className="mt-1 text-sm text-red-600">{entryError}</p>}
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleCreateEntry}
                    isLoading={createEntryMutation.isPending}
                  >
                    Agregar entrada
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {isLoadingEntries ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : entries.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-500 text-center py-4">No hay entradas en la cronología.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card key={entry.id}>
                  {editingEntryId === entry.id ? (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor={`editEntryType-${entry.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de entrada
                        </label>
                        <select
                          id={`editEntryType-${entry.id}`}
                          value={editEntryType}
                          onChange={(e) => setEditEntryType(e.target.value as FollowUpEntryType)}
                          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="NOTE">Nota</option>
                          <option value="MEETING">Reunión</option>
                          <option value="OBSERVATION">Observación</option>
                          <option value="ACTION">Acción</option>
                          <option value="FOLLOW_UP">Seguimiento</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`editEntryContent-${entry.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Contenido *
                        </label>
                        <textarea
                          id={`editEntryContent-${entry.id}`}
                          value={editEntryContent}
                          onChange={(e) => setEditEntryContent(e.target.value)}
                          rows={3}
                          maxLength={5000}
                          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {editEntryError && <p className="mt-1 text-sm text-red-600">{editEntryError}</p>}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={handleCancelEditEntry}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveEditEntry(entry.id)}
                          isLoading={updateEntryMutation.isPending}
                        >
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="default">{FOLLOW_UP_ENTRY_TYPE_LABELS[entry.entryType]}</Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleString('es-CO')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{entry.content}</p>
                        {entry.createdBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            Por: {entry.createdBy.firstName} {entry.createdBy.lastName}
                          </p>
                        )}
                      </div>
                      {canFollowUp && !isClosed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEditEntry(entry)}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Commitments tab */}
      {activeTab === 'commitments' && (
        <div className="space-y-4">
          {canCommit && !isClosed && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowCommitmentForm(!showCommitmentForm)}>
                {showCommitmentForm ? 'Cancelar' : 'Nuevo compromiso'}
              </Button>
            </div>
          )}

          {showCommitmentForm && (
            <Card>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Crear compromiso</h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="commitmentRole" className="block text-sm font-medium text-gray-700 mb-1">
                    Rol del responsable
                  </label>
                  <select
                    id="commitmentRole"
                    value={commitmentRole}
                    onChange={(e) => setCommitmentRole(e.target.value as CommitmentResponsibleRole)}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="TEACHER">Docente</option>
                    <option value="PARENT">Acudiente</option>
                    <option value="STUDENT">Estudiante</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="commitmentResponsible" className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario responsable
                  </label>
                  <select
                    id="commitmentResponsible"
                    value={commitmentResponsibleUserId}
                    onChange={(e) => setCommitmentResponsibleUserId(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Por defecto (creador del seguimiento)</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="commitmentDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                  </label>
                  <textarea
                    id="commitmentDescription"
                    value={commitmentDescription}
                    onChange={(e) => setCommitmentDescription(e.target.value)}
                    rows={2}
                    maxLength={5000}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Describe el compromiso..."
                  />
                  {commitmentError && <p className="mt-1 text-sm text-red-600">{commitmentError}</p>}
                </div>
                <Input
                  label="Fecha objetivo"
                  type="date"
                  value={commitmentDueDate}
                  onChange={(e) => setCommitmentDueDate(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleCreateCommitment}
                    isLoading={createCommitmentMutation.isPending}
                  >
                    Crear compromiso
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {isLoadingCommitments ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : commitments.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-500 text-center py-4">No hay compromisos registrados.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {commitments.map((commitment) => {
                const displayStatus = commitment.effectiveStatus || commitment.status;
                return (
                <Card key={commitment.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={COMMITMENT_STATUS_BADGE[displayStatus]}>
                          {COMMITMENT_STATUS_LABELS[displayStatus]}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {COMMITMENT_ROLE_LABELS[commitment.responsibleRole]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{commitment.description}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        {commitment.dueDate && (
                          <span>Vence: {new Date(commitment.dueDate).toLocaleDateString('es-CO')}</span>
                        )}
                        {commitment.completedAt && (
                          <span>Completado: {new Date(commitment.completedAt).toLocaleDateString('es-CO')}</span>
                        )}
                      </div>
                      {commitment.responsibleUser && (
                        <p className="text-xs text-gray-500 mt-1">
                          Responsable: {commitment.responsibleUser.firstName} {commitment.responsibleUser.lastName}
                        </p>
                      )}
                    </div>
                    {canCommit && !isClosed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleCommitmentStatus(commitment.id, commitment.status)}
                        disabled={updateCommitmentMutation.isPending}
                      >
                        {commitment.status === 'COMPLETED' ? 'Reabrir' : 'Completar'}
                      </Button>
                    )}
                  </div>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Attachments tab */}
      {activeTab === 'attachments' && (
        <div className="space-y-4">
          {isLoadingAttachments ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : attachments.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-500 text-center py-4">No hay archivos adjuntos.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">📎</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.fileAsset.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(attachment.fileAsset.sizeBytes / 1024).toFixed(1)} KB
                        {' · '}
                        {attachment.fileAsset.mimeType}
                      </p>
                    </div>
                  </div>
                  {canAttach && !isClosed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      disabled={removeAttachmentMutation.isPending}
                    >
                      Desvincular
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canAttach && !isClosed && (
            <Card>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Adjuntar archivo</h4>
              <div
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    uploadMutation.mutate(file, {
                      onSuccess: (result) => handleUploadComplete(result),
                    });
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed rounded-lg p-4 text-center border-gray-300 hover:border-gray-400 cursor-pointer"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      uploadMutation.mutate(file, {
                        onSuccess: (result) => handleUploadComplete(result),
                      });
                    }
                  };
                  input.click();
                }}
              >
                {uploadMutation.isPending || createAttachmentMutation.isPending ? (
                  <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                    <Spinner size="sm" /> Subiendo archivo...
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Arrastra un archivo aquí o{' '}
                    <span className="text-blue-600 font-medium">selecciona</span>
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="flex justify-start">
        <Button variant="ghost" onClick={() => navigate('/student-follow-ups')}>
          Volver a seguimientos
        </Button>
      </div>

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmAction === 'close' && 'Confirmar cierre'}
              {confirmAction === 'escalate' && 'Confirmar escalación'}
              {confirmAction === 'followUp' && 'Confirmar seguimiento'}
              {confirmAction === 'resolve' && 'Confirmar resolución'}
              {confirmAction === 'reopen' && 'Confirmar reapertura'}
            </h3>
            <p className="text-gray-600 mb-6">{getConfirmMessage()}</p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>
                Cancelar
              </Button>
              <Button
                variant={confirmAction === 'close' ? 'danger' : 'primary'}
                isLoading={isTransitionPending}
                onClick={handleConfirmAction}
              >
                {confirmAction === 'close' && 'Cerrar'}
                {confirmAction === 'escalate' && 'Escalar'}
                {confirmAction === 'followUp' && 'Seguimiento'}
                {confirmAction === 'resolve' && 'Resolver'}
                {confirmAction === 'reopen' && 'Reabrir'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
