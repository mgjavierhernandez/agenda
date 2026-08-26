import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSchoolGrade, useCreateSchoolGrade, useUpdateSchoolGrade } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import type { CreateSchoolGradeInput } from '@/api/types';

interface FormErrors {
  name?: string;
  code?: string;
  sortOrder?: string;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

export function SchoolGradeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SCHOOL_GRADES_MANAGE);
  const isEditMode = !!id;

  const { data: existingGrade, isLoading: isLoadingGrade } = useSchoolGrade(id ?? '');
  const createMutation = useCreateSchoolGrade();
  const updateMutation = useUpdateSchoolGrade();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isEditMode && existingGrade) {
      setName(existingGrade.name);
      setCode(existingGrade.code);
      setSortOrder(String(existingGrade.sortOrder));
    }
  }, [isEditMode, existingGrade]);

  if (!canManage) {
    return (
      <Card>
        <p className="text-gray-600">No tienes permisos para administrar grados académicos.</p>
      </Card>
    );
  }

  if (isEditMode && isLoadingGrade) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditMode && !existingGrade) {
    return <ErrorState error={{ statusCode: 404, message: 'Grado no encontrado', timestamp: '', path: '' }} />;
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

    const parsedSortOrder = parseInt(sortOrder, 10);
    if (sortOrder !== '' && (isNaN(parsedSortOrder) || parsedSortOrder < 0)) {
      newErrors.sortOrder = 'El orden debe ser un número entero positivo o cero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    const parsedSortOrder = parseInt(sortOrder, 10) || 0;

    const payload: CreateSchoolGradeInput = {
      name: name.trim(),
      code: code.trim(),
      sortOrder: parsedSortOrder,
    };

    try {
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, data: payload });
        navigate(`/school-grades/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        navigate(`/school-grades/${created.id}`);
      }
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditMode ? 'Editar grado académico' : 'Nuevo grado académico'}
        description={isEditMode ? 'Actualizar la información del grado' : 'Crear un nuevo grado académico'}
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
              placeholder="Ej: Preescolar, Primer Grado"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}

            <Input
              label="Código"
              placeholder="Ej: PRE, 01, 02"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {errors.code && <p className="text-sm text-red-600">{errors.code}</p>}

            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                Orden de visualización
              </label>
              <input
                id="sortOrder"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.sortOrder && <p className="text-sm text-red-600 mt-1">{errors.sortOrder}</p>}
              <p className="text-xs text-gray-500 mt-1">Determina el orden en que se muestran los grados. Menor número = mayor prioridad.</p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/school-grades')}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEditMode ? 'Guardar cambios' : 'Crear grado'}
          </Button>
        </div>
      </form>
    </div>
  );
}
