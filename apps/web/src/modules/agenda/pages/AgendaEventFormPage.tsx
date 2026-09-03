import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useAgendaEvent,
  useCreateAgendaEvent,
  useUpdateAgendaEvent,
} from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { COMMUNICATION_AUDIENCE_LABELS } from '@/api/types';
import type { AgendaEventVisibility, CreateAgendaEventInput } from '@/api/types';

const AUDIENCE_OPTIONS: { value: AgendaEventVisibility; label: string }[] = [
  { value: 'ALL', label: COMMUNICATION_AUDIENCE_LABELS.ALL },
  { value: 'TEACHERS', label: COMMUNICATION_AUDIENCE_LABELS.TEACHERS },
  { value: 'PARENTS', label: COMMUNICATION_AUDIENCE_LABELS.PARENTS },
  { value: 'STUDENTS', label: COMMUNICATION_AUDIENCE_LABELS.STUDENTS },
];

interface FormErrors {
  title?: string;
  description?: string;
  location?: string;
  startAt?: string;
  endAt?: string;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AgendaEventFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.AGENDA_CREATE) || hasPermission(PERMISSIONS.AGENDA_UPDATE);
  const isEditMode = !!id;

  const { data: existingEvent, isLoading: isLoadingEvent } = useAgendaEvent(id ?? '');
  const createMutation = useCreateAgendaEvent();
  const updateMutation = useUpdateAgendaEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [audience, setAudience] = useState<AgendaEventVisibility>('ALL');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isEditMode && existingEvent) {
      setTitle(existingEvent.title);
      setDescription(existingEvent.description ?? '');
      setLocation(existingEvent.location ?? '');
      setAudience(existingEvent.audience);
      setStartAt(toLocalInputValue(existingEvent.startAt));
      setEndAt(toLocalInputValue(existingEvent.endAt));
    }
  }, [isEditMode, existingEvent]);

  if (!canManage) {
    return (
      <Card>
        <p className="text-gray-600">No tienes permisos para administrar eventos de la agenda.</p>
      </Card>
    );
  }

  if (isEditMode && isLoadingEvent) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditMode && !existingEvent) {
    return <ErrorState error={{ statusCode: 404, message: 'Evento no encontrado', timestamp: '', path: '' }} />;
  }

  if (isEditMode && existingEvent && existingEvent.status === 'CANCELLED') {
    return (
      <Card>
        <p className="text-gray-600 mb-3">
          Este evento fue <strong>cancelado</strong> y no puede editarse.
        </p>
        <Button variant="secondary" onClick={() => navigate(`/agenda/events/${id}`)}>
          Volver al evento
        </Button>
      </Card>
    );
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (title.trim().length > 200) {
      newErrors.title = 'El título no puede exceder 200 caracteres';
    }

    if (description.length > 2000) {
      newErrors.description = 'La descripción no puede exceder 2000 caracteres';
    }

    if (location.length > 255) {
      newErrors.location = 'La ubicación no puede exceder 255 caracteres';
    }

    if (!startAt) {
      newErrors.startAt = 'La fecha de inicio es requerida';
    }

    if (!endAt) {
      newErrors.endAt = 'La fecha de fin es requerida';
    }

    if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      newErrors.endAt = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    const payload = isEditMode
      ? {
          title: title.trim(),
          description: description.trim() === '' ? null : description.trim(),
          location: location.trim() === '' ? null : location.trim(),
          audience,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        }
      : {
          title: title.trim(),
          description: description.trim() === '' ? null : description.trim(),
          location: location.trim() === '' ? null : location.trim(),
          audience,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
        } satisfies CreateAgendaEventInput;

    try {
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        navigate(`/agenda/events/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        navigate(`/agenda/events/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditMode ? 'Editar evento' : 'Nuevo evento'}
        description={isEditMode ? 'Actualizar la información del evento' : 'Crear un nuevo evento en la agenda'}
      />

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del evento</h3>
          <div className="space-y-4">
            <Input
              label="Título"
              placeholder="Ej: Reunión de padres"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                id="description"
                value={description}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles del evento (opcional)"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
            </div>

            <Input
              label="Ubicación"
              placeholder="Ej: Salón de actos"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            {errors.location && <p className="text-sm text-red-600">{errors.location}</p>}

            <div>
              <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-1">
                Audiencia
              </label>
              <select
                id="audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value as AgendaEventVisibility)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fecha y hora</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startAt" className="block text-sm font-medium text-gray-700 mb-1">
                Inicio
              </label>
              <input
                id="startAt"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.startAt && <p className="text-sm text-red-600 mt-1">{errors.startAt}</p>}
            </div>
            <div>
              <label htmlFor="endAt" className="block text-sm font-medium text-gray-700 mb-1">
                Fin
              </label>
              <input
                id="endAt"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.endAt && <p className="text-sm text-red-600 mt-1">{errors.endAt}</p>}
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(isEditMode && id ? `/agenda/events/${id}` : '/agenda')}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEditMode ? 'Guardar cambios' : 'Crear evento'}
          </Button>
        </div>
      </form>
    </div>
  );
}