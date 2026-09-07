import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLinkGuardian } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { RELATIONSHIP_TYPE_LABELS } from '@/api/types';
import type { RelationshipType, LinkGuardianInput } from '@/api/types';

interface FormErrors {
  guardianUserId?: string;
  studentId?: string;
  relationshipType?: string;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: string }).message);
  }
  return 'Ocurrió un error inesperado.';
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function GuardiansFormPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.GUARDIANS_MANAGE);

  const linkMutation = useLinkGuardian();

  const [studentId, setStudentId] = useState('');
  const [guardianUserId, setGuardianUserId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType | ''>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState('');

  if (!canManage) {
    return (
      <Card>
        <p className="text-gray-600">No tienes permisos para administrar vinculaciones de acudientes.</p>
      </Card>
    );
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (guardianUserId.trim() && !UUID_REGEX.test(guardianUserId.trim())) {
      newErrors.guardianUserId = 'El ID del acudiente debe ser un UUID válido';
    }

    if (!studentId.trim()) {
      newErrors.studentId = 'El ID del estudiante es requerido';
    } else if (!UUID_REGEX.test(studentId.trim())) {
      newErrors.studentId = 'El ID del estudiante debe ser un UUID válido';
    }

    if (!relationshipType) {
      newErrors.relationshipType = 'El tipo de relación es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    const payload: LinkGuardianInput = {
      studentId: studentId.trim(),
      relationshipType: relationshipType as RelationshipType,
      isPrimary,
      ...(guardianUserId.trim() ? { guardianUserId: guardianUserId.trim() } : {}),
    };

    try {
      await linkMutation.mutateAsync({ studentId: payload.studentId, data: payload });
      navigate('/guardians');
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva vinculación"
        description="Vincular un acudiente a un estudiante"
      />

      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos de la vinculación</h3>
          <div className="space-y-4">
            <Input
              label="ID del Acudiente (opcional)"
              placeholder="UUID del usuario acudiente (vacío = tu propio usuario)"
              value={guardianUserId}
              onChange={(e) => setGuardianUserId(e.target.value)}
            />
            {errors.guardianUserId && <p className="text-sm text-red-600">{errors.guardianUserId}</p>}

            <Input
              label="ID del Estudiante"
              placeholder="UUID del estudiante"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
            {errors.studentId && <p className="text-sm text-red-600">{errors.studentId}</p>}

            <div>
              <label htmlFor="relationshipType" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de relación
              </label>
              <select
                id="relationshipType"
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value as RelationshipType | '')}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar relación</option>
                {(Object.entries(RELATIONSHIP_TYPE_LABELS) as [RelationshipType, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ),
                )}
              </select>
              {errors.relationshipType && <p className="text-sm text-red-600 mt-1">{errors.relationshipType}</p>}
            </div>

            <div className="flex items-center gap-3">
              <input
                id="isPrimary"
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isPrimary" className="text-sm text-gray-700">
                Acudiente principal
              </label>
            </div>
            <p className="text-xs text-gray-500 -mt-2 ml-7">
              Marca esta casilla si este acudiente es el contacto principal del estudiante.
            </p>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate('/guardians')}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={linkMutation.isPending}>
            Vincular acudiente
          </Button>
        </div>
      </form>
    </div>
  );
}
