import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSubject, useCreateSubject, useUpdateSubject } from '../hooks';
import { useAreas } from '@/modules/areas/hooks/useAreas';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { getErrorMessage } from '@/api/errors';
import type { SubjectStatus, CreateSubjectInput, UpdateSubjectInput, SubjectType, EducationLevel } from '@/api/types';
import { EDUCATION_LEVEL_LABELS, SUBJECT_TYPE_LABELS } from '@/api/types';

export function SubjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingSubject, isLoading: isLoadingSubject } = useSubject(id ?? '');
  const { data: areasData } = useAreas({ limit: 100 });
  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [areaId, setAreaId] = useState('');
  const [subjectType, setSubjectType] = useState<SubjectType>('OBLIGATORIA');
  const [minimumLevel, setMinimumLevel] = useState<EducationLevel | ''>('');
  const [maximumLevel, setMaximumLevel] = useState<EducationLevel | ''>('');
  const [status, setStatus] = useState<SubjectStatus>('ACTIVE');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (existingSubject) {
      setCode(existingSubject.code);
      setName(existingSubject.name);
      setDescription(existingSubject.description ?? '');
      setAreaId(existingSubject.areaId ?? '');
      setSubjectType(existingSubject.subjectType);
      setMinimumLevel(existingSubject.minimumLevel ?? '');
      setMaximumLevel(existingSubject.maximumLevel ?? '');
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
    const levelOrder: EducationLevel[] = ['PREESCOLAR', 'PRIMARIA', 'SECUNDARIA', 'MEDIA'];
    if (minimumLevel && maximumLevel) {
      const minIndex = levelOrder.indexOf(minimumLevel as EducationLevel);
      const maxIndex = levelOrder.indexOf(maximumLevel as EducationLevel);
      if (minIndex > maxIndex) {
        newErrors.maximumLevel = 'El nivel máximo no puede ser inferior al nivel mínimo';
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
      if (isEditing && id) {
        const payload: UpdateSubjectInput = {
          code: code.trim(),
          name: name.trim(),
          status,
          subjectType,
        };
        if (description.trim()) payload.description = description.trim();
        payload.areaId = areaId || null;
        payload.minimumLevel = (minimumLevel as EducationLevel) || null;
        payload.maximumLevel = (maximumLevel as EducationLevel) || null;
        await updateMutation.mutateAsync({ id, data: payload });
        navigate(`/subjects/${id}`);
      } else {
        const payload: CreateSubjectInput = {
          code: code.trim(),
          name: name.trim(),
          status,
          subjectType,
        };
        if (description.trim()) payload.description = description.trim();
        if (areaId) payload.areaId = areaId;
        if (minimumLevel) payload.minimumLevel = minimumLevel as EducationLevel;
        if (maximumLevel) payload.maximumLevel = maximumLevel as EducationLevel;
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
  const hasAreas = areasData?.data && areasData.data.length > 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? 'Editar asignatura' : 'Nueva asignatura'}
        description={isEditing ? 'Actualizar información de la asignatura' : 'Registrar una nueva asignatura dentro de la estructura académica'}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {apiError && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          {/* SECCIÓN 1 — IDENTIFICACIÓN */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-gray-900 mb-4">Identificación</legend>
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
          </fieldset>

          {/* SECCIÓN 2 — CLASIFICACIÓN ACADÉMICA */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-gray-900 mb-4">Clasificación académica</legend>
            
            <div>
              <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                Área curricular *
              </label>
              {hasAreas ? (
                <select
                  id="area"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  disabled={isSubmitting}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar área curricular</option>
                  {areasData?.data.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <select
                    id="area"
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    disabled
                    className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm shadow-sm text-gray-400"
                  >
                    <option value="">No hay áreas curriculares configuradas</option>
                  </select>
                  <p className="text-sm text-gray-500">
                    Para asignar un área, primero debe 
                    <button
                      type="button"
                      onClick={() => navigate('/areas')}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      crear un área curricular
                    </button>.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="subjectType" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de asignatura *
              </label>
              <select
                id="subjectType"
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value as SubjectType)}
                disabled={isSubmitting}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                {(Object.keys(SUBJECT_TYPE_LABELS) as SubjectType[]).map((t) => (
                  <option key={t} value={t}>
                    {SUBJECT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          {/* SECCIÓN 3 — NIVEL EDUCATIVO */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-gray-900 mb-4">Nivel educativo</legend>
            <p className="text-sm text-gray-500">
              Define el rango educativo en el que puede utilizarse esta asignatura.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="minimumLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel mínimo
                </label>
                <select
                  id="minimumLevel"
                  value={minimumLevel}
                  onChange={(e) => setMinimumLevel(e.target.value as EducationLevel | '')}
                  disabled={isSubmitting}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar nivel</option>
                  {(Object.keys(EDUCATION_LEVEL_LABELS) as EducationLevel[]).map((l) => (
                    <option key={l} value={l}>
                      {EDUCATION_LEVEL_LABELS[l]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="maximumLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel máximo
                </label>
                <select
                  id="maximumLevel"
                  value={maximumLevel}
                  onChange={(e) => setMaximumLevel(e.target.value as EducationLevel | '')}
                  disabled={isSubmitting}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar nivel</option>
                  {(Object.keys(EDUCATION_LEVEL_LABELS) as EducationLevel[]).map((l) => (
                    <option key={l} value={l}>
                      {EDUCATION_LEVEL_LABELS[l]}
                    </option>
                  ))}
                </select>
                {errors.maximumLevel && <p className="mt-1 text-sm text-red-600">{errors.maximumLevel}</p>}
              </div>
            </div>
          </fieldset>

          {/* SECCIÓN 4 — ESTADO */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-gray-900 mb-4">Estado</legend>
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
          </fieldset>

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
