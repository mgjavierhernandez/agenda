import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSignature, useCreateSignature, useUpdateSignature } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';
import { PERMISSIONS } from '@/permissions/permission.constants';

export function SignatureFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { hasPermission } = usePermissions();
  const canRequest = hasPermission(PERMISSIONS.SIGNATURES_REQUEST);

  const { data: existingSignature, isLoading: isLoadingSignature } = useSignature(id ?? '');
  const createMutation = useCreateSignature();
  const updateMutation = useUpdateSignature();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recipientUserIds, setRecipientUserIds] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (existingSignature) {
      if (existingSignature.status !== 'DRAFT') {
        navigate(`/signatures/${id}`);
        return;
      }
      setTitle(existingSignature.title);
      setDescription(existingSignature.description ?? '');
      if (existingSignature.dueDate) {
        const dateObj = new Date(existingSignature.dueDate);
        const localDatetime = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setDueDate(localDatetime);
      }
      if (existingSignature.recipients) {
        setRecipientUserIds(existingSignature.recipients.map((r) => r.userId).join(', '));
      }
    }
  }, [existingSignature, id, navigate]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Mínimo 3 caracteres';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Máximo 200 caracteres';
    }
    if (description.length > 5000) newErrors.description = 'Máximo 5000 caracteres';
    if (!isEditing) {
      const ids = recipientUserIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length === 0) {
        newErrors.recipientUserIds = 'Debe agregar al menos un firmante';
      } else if (ids.length > 100) {
        newErrors.recipientUserIds = 'Máximo 100 firmantes';
      } else {
        const invalidIds = ids.filter(
          (uid) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid),
        );
        if (invalidIds.length > 0) {
          newErrors.recipientUserIds = 'Todos los IDs deben ser UUIDs válidos';
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      const ids = recipientUserIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      if (isEditing && id) {
        await updateMutation.mutateAsync({
          id,
          data: {
            title: title.trim(),
            description: description.trim() || undefined,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          },
        });
        navigate(`/signatures/${id}`);
      } else {
        const created = await createMutation.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          recipientUserIds: ids,
        });
        navigate(`/signatures/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (isEditing && isLoadingSignature) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditing && !existingSignature) {
    return (
      <ErrorState
        error={{ statusCode: 404, message: 'Solicitud no encontrada', timestamp: '', path: '' }}
      />
    );
  }

  if (isEditing && existingSignature && existingSignature.status !== 'DRAFT') {
    return (
      <ErrorState
        error={{
          statusCode: 400,
          message: 'Solo las solicitudes en borrador pueden editarse',
          timestamp: '',
          path: '',
        }}
      />
    );
  }

  if (!canRequest) {
    return (
      <ErrorState
        error={{
          statusCode: 403,
          message: 'No tienes permisos para gestionar solicitudes de firma',
          timestamp: '',
          path: '',
        }}
      />
    );
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? 'Editar solicitud' : 'Nueva solicitud de firma'}
        description={
          isEditing
            ? 'Actualizar información de la solicitud'
            : 'Crear una nueva solicitud de firma digital'
        }
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
            placeholder="Ej: Autorización de excursión"
          />

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              maxLength={5000}
              rows={4}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          <Input
            label="Fecha de vencimiento"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isSubmitting}
          />

          {!isEditing && (
            <div>
              <label
                htmlFor="recipientUserIds"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Firmantes (UUIDs separados por coma) *
              </label>
              <textarea
                id="recipientUserIds"
                value={recipientUserIds}
                onChange={(e) => setRecipientUserIds(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                placeholder="uuid-1, uuid-2, uuid-3"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 font-mono"
              />
              {errors.recipientUserIds && (
                <p className="mt-1 text-sm text-red-600">{errors.recipientUserIds}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                IDs de usuario UUID separados por coma. Mínimo 1, máximo 100.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEditing ? `/signatures/${id}` : '/signatures')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Guardar cambios' : 'Crear solicitud'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
