import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCommunication, useCreateCommunication, useUpdateCommunication } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { COMMUNICATION_AUDIENCE_LABELS } from '@/api/types';
import type { CommunicationAudience } from '@/api/types';

const AUDIENCE_OPTIONS: { value: CommunicationAudience; label: string }[] = [
  { value: 'ALL', label: COMMUNICATION_AUDIENCE_LABELS.ALL },
  { value: 'TEACHERS', label: COMMUNICATION_AUDIENCE_LABELS.TEACHERS },
  { value: 'PARENTS', label: COMMUNICATION_AUDIENCE_LABELS.PARENTS },
  { value: 'STUDENTS', label: COMMUNICATION_AUDIENCE_LABELS.STUDENTS },
];

export function CommunicationFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.COMMUNICATIONS_MANAGE);

  const { data: existingCommunication, isLoading: isLoadingCommunication } = useCommunication(id ?? '');
  const createMutation = useCreateCommunication();
  const updateMutation = useUpdateCommunication();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<CommunicationAudience>('ALL');
  const [expiresAt, setExpiresAt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (existingCommunication) {
      if (existingCommunication.status !== 'DRAFT') {
        navigate(`/communications/${id}`);
        return;
      }
      setTitle(existingCommunication.title);
      setContent(existingCommunication.content);
      setAudience(existingCommunication.audience);
      if (existingCommunication.expiresAt) {
        const dateObj = new Date(existingCommunication.expiresAt);
        const localDatetime = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setExpiresAt(localDatetime);
      }
    }
  }, [existingCommunication, id, navigate]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Mínimo 3 caracteres';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Máximo 200 caracteres';
    }
    if (!content.trim()) {
      newErrors.content = 'El contenido es requerido';
    } else if (content.trim().length > 5000) {
      newErrors.content = 'Máximo 5000 caracteres';
    }
    if (!audience) {
      newErrors.audience = 'La audiencia es requerida';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        audience,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      };

      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        navigate(`/communications/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        navigate(`/communications/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (isEditing && isLoadingCommunication) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditing && !existingCommunication) {
    return <ErrorState error={{ statusCode: 404, message: 'Comunicación no encontrada', timestamp: '', path: '' }} />;
  }

  if (isEditing && existingCommunication && existingCommunication.status !== 'DRAFT') {
    return <ErrorState error={{ statusCode: 400, message: 'Solo las comunicaciones en borrador pueden editarse', timestamp: '', path: '' }} />;
  }

  if (!canManage) {
    return <ErrorState error={{ statusCode: 403, message: 'No tienes permisos para gestionar comunicaciones', timestamp: '', path: '' }} />;
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? 'Editar comunicación' : 'Nueva comunicación'}
        description={isEditing ? 'Actualizar información de la comunicación' : 'Crear una nueva comunicación institucional'}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {apiError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <Input
            label="Título *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            disabled={isSubmitting}
            maxLength={200}
            placeholder="Ej: Comunicado importante sobre horarios"
          />

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Contenido *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              maxLength={5000}
              rows={6}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Escribe el contenido de la comunicación..."
            />
            {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
          </div>

          <div>
            <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-1">
              Audiencia *
            </label>
            <select
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as CommunicationAudience)}
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              {AUDIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.audience && <p className="mt-1 text-sm text-red-600">{errors.audience}</p>}
          </div>

          <Input
            label="Fecha de expiración"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-sm text-gray-500">Opcional. La comunicación expirará en esta fecha.</p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEditing ? `/communications/${id}` : '/communications')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Guardar cambios' : 'Crear comunicación'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
