import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSubject, useCreateSubject, useUpdateSubject } from '../hooks';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';
import type { SubjectStatus, CreateSubjectInput, UpdateSubjectInput } from '@/api/types';

export function SubjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingSubject, isLoading: isLoadingSubject } = useSubject(id ?? '');
  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<SubjectStatus>('ACTIVE');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (existingSubject) {
      setCode(existingSubject.code);
      setName(existingSubject.name);
      setDescription(existingSubject.description ?? '');
      setStatus(existingSubject.status);
    }
  }, [existingSubject]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!code.trim()) newErrors.code = 'El código es requerido';
    else if (code.length > 50) newErrors.code = 'Máximo 50 caracteres';
    if (!name.trim()) newErrors.name = 'El nombre es requerido';
    else if (name.length > 150) newErrors.name = 'Máximo 150 caracteres';
    if (description.length > 1000) newErrors.description = 'Máximo 1000 caracteres';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    try {
      if (isEditing && id) {
        const payload: UpdateSubjectInput = {
          code: code.trim(),
          name: name.trim(),
          status,
        };
        if (description.trim()) payload.description = description.trim();
        await updateMutation.mutateAsync({ id, data: payload });
        navigate(`/subjects/${id}`);
      } else {
        const payload: CreateSubjectInput = {
          code: code.trim(),
          name: name.trim(),
          status,
        };
        if (description.trim()) payload.description = description.trim();
        const created = await createMutation.mutateAsync(payload);
        navigate(`/subjects/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (isEditing && isLoadingSubject) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditing && !existingSubject) {
    return <ErrorState error={{ statusCode: 404, message: 'Asignatura no encontrada', timestamp: '', path: '' }} />;
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? 'Editar asignatura' : 'Nueva asignatura'}
        description={isEditing ? 'Actualizar información de la asignatura' : 'Registrar una nueva asignatura'}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {apiError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <Input
            label="Código *"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={errors.code}
            disabled={isSubmitting}
            maxLength={50}
            placeholder="Ej: MAT-S"
          />

          <Input
            label="Nombre *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            disabled={isSubmitting}
            maxLength={150}
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
              maxLength={1000}
              rows={3}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Estado *
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as SubjectStatus)}
              disabled={isSubmitting}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEditing ? `/subjects/${id}` : '/subjects')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Guardar cambios' : 'Crear asignatura'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
