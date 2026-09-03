import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAcademicPeriod, useCreateAcademicPeriod, useUpdateAcademicPeriod } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { CreateAcademicPeriodInput } from '@/api/types';

interface FormErrors {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

export function AcademicPeriodFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.ACADEMIC_PERIODS_MANAGE);
  const isEditMode = !!id;

  const { data: existingPeriod, isLoading: isLoadingPeriod } = useAcademicPeriod(id ?? '');
  const createMutation = useCreateAcademicPeriod();
  const updateMutation = useUpdateAcademicPeriod();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isEditMode && existingPeriod) {
      setName(existingPeriod.name);
      setCode(existingPeriod.code);
      setStartDate(existingPeriod.startDate.split('T')[0]);
      setEndDate(existingPeriod.endDate.split('T')[0]);
    }
  }, [isEditMode, existingPeriod]);

  if (!canManage) {
    return (
      <Card>
        <p className="text-gray-600">No tienes permisos para administrar periodos académicos.</p>
      </Card>
    );
  }

  if (isEditMode && isLoadingPeriod) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditMode && !existingPeriod) {
    return <ErrorState error={{ statusCode: 404, message: 'Periodo no encontrado', timestamp: '', path: '' }} />;
  }

  if (isEditMode && existingPeriod && existingPeriod.status === 'CLOSED') {
    return (
      <Card>
        <p className="text-gray-600 mb-3">
          Este periodo académico está <strong>cerrado</strong> y no puede editarse.
        </p>
        <Button variant="secondary" onClick={() => navigate(`/academic-periods/${id}`)}>
          Volver al periodo
        </Button>
      </Card>
    );
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (name.trim().length > 100) {
      newErrors.name = 'El nombre no puede exceder 100 caracteres';
    }

    if (!code.trim()) {
      newErrors.code = 'El código es requerido';
    } else if (code.trim().length > 20) {
      newErrors.code = 'El código no puede exceder 20 caracteres';
    }

    if (!startDate) {
      newErrors.startDate = 'La fecha de inicio es requerida';
    }

    if (!endDate) {
      newErrors.endDate = 'La fecha de fin es requerida';
    }

    if (startDate && endDate && startDate >= endDate) {
      newErrors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    const payload: CreateAcademicPeriodInput = {
      name: name.trim(),
      code: code.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    };

    try {
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        navigate(`/academic-periods/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        navigate(`/academic-periods/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditMode ? 'Editar periodo académico' : 'Nuevo periodo académico'}
        description={isEditMode ? 'Actualizar la información del periodo' : 'Crear un nuevo periodo académico'}
      />

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información básica</h3>
          <div className="space-y-4">
            <Input
              label="Nombre"
              placeholder="Ej: 2026 - Periodo 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}

            <Input
              label="Código"
              placeholder="Ej: 2026-P1"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {errors.code && <p className="text-sm text-red-600">{errors.code}</p>}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fechas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de inicio
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.startDate && <p className="text-sm text-red-600 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de finalización
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>}
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/academic-periods')}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEditMode ? 'Guardar cambios' : 'Crear periodo'}
          </Button>
        </div>
      </form>
    </div>
  );
}
