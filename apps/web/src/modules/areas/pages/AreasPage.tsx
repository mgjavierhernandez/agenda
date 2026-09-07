import { useState, useMemo, type FormEvent } from 'react';
import { useAreas } from '../hooks/useAreas';
import { useCreateArea } from '../hooks/useCreateArea';
import { useUpdateArea } from '../hooks/useUpdateArea';
import { useDeactivateArea } from '../hooks/useDeactivateArea';
import { useSubjects } from '@/modules/subjects/hooks/useSubjects';
import { usePermissions } from '@/permissions/usePermissions';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { getErrorMessage } from '@/api/errors';
import type { UpdateAreaInput } from '@/api/types';

export function AreasPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.AREAS_MANAGE);

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isOfficial, setIsOfficial] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const { data, isLoading, error } = useAreas({ search: search || undefined, limit: 100 });
  const { data: subjectsData } = useSubjects({ limit: 1000 });
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deactivateArea = useDeactivateArea();

  const areas = data?.data ?? [];
  const subjects = subjectsData?.data ?? [];

  const subjectCountByArea = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const subject of subjects) {
      if (subject.areaId) {
        counts[subject.areaId] = (counts[subject.areaId] || 0) + 1;
      }
    }
    return counts;
  }, [subjects]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!code.trim() || !name.trim()) {
      setFormError('Código y nombre son requeridos');
      return;
    }
    try {
      if (editingAreaId) {
        const payload: UpdateAreaInput = {
          code: code.trim(),
          name: name.trim(),
          isOfficial,
          sortOrder,
        };
        await updateArea.mutateAsync({ id: editingAreaId, data: payload });
        setFormSuccess('Área actualizada correctamente');
      } else {
        await createArea.mutateAsync({ code: code.trim(), name: name.trim(), isOfficial: true, sortOrder: 0 });
        setFormSuccess('Área creada correctamente');
      }
      setCode('');
      setName('');
      setIsOfficial(false);
      setSortOrder(0);
      setShowForm(false);
      setEditingAreaId(null);
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  const handleEdit = (area: typeof areas[0]) => {
    setEditingAreaId(area.id);
    setCode(area.code);
    setName(area.name);
    setIsOfficial(area.isOfficial);
    setSortOrder(area.sortOrder);
    setShowForm(true);
    setFormError('');
    setFormSuccess('');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAreaId(null);
    setCode('');
    setName('');
    setIsOfficial(false);
    setSortOrder(0);
    setFormError('');
    setFormSuccess('');
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateArea.mutateAsync(id);
      setFormSuccess('Área desactivada correctamente');
    } catch (err) {
      setFormError(getErrorMessage(err) || 'Ocurrió un error inesperado');
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={() => {}} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Áreas"
        description="Áreas académicas que agrupan las asignaturas"
        actions={
          canManage ? (
            <Button onClick={() => { handleCancel(); setShowForm(!showForm); }}>
              {showForm ? 'Cancelar' : 'Nueva área'}
            </Button>
          ) : undefined
        }
      />

      {formSuccess && (
        <div role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {formSuccess}
        </div>
      )}

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {formError && (
              <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Código *"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={20}
                placeholder="Ej: ARE-MAT"
                disabled={createArea.isPending || updateArea.isPending}
              />
              <Input
                label="Nombre *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={150}
                placeholder="Ej: Matemáticas"
                disabled={createArea.isPending || updateArea.isPending}
              />
              <div>
                <label htmlFor="isOfficial" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  id="isOfficial"
                  value={isOfficial.toString()}
                  onChange={(e) => setIsOfficial(e.target.value === 'true')}
                  disabled={createArea.isPending || updateArea.isPending}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="false">Complementaria</option>
                  <option value="true">Oficial</option>
                </select>
              </div>
              <div>
                <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                  Orden
                </label>
                <Input
                  id="sortOrder"
                  type="number"
                  label=""
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                  disabled={createArea.isPending || updateArea.isPending}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleCancel} disabled={createArea.isPending || updateArea.isPending}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={createArea.isPending || updateArea.isPending}>
                {editingAreaId ? 'Guardar cambios' : 'Crear área'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="w-full sm:w-72">
        <Input
          label="Buscar"
          placeholder="Buscar por código o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : areas.length === 0 ? (
        <EmptyState
          title={search ? 'No se encontraron áreas' : 'No hay áreas registradas'}
          description={
            search
              ? 'No encontramos áreas que coincidan con tu búsqueda.'
              : 'Comienza agregando áreas académicas a la institución.'
          }
        />
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Código</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Asignaturas</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Orden</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                {canManage && <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{area.code}</td>
                  <td className="px-4 py-3">{area.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {subjectCountByArea[area.id] || 0} {subjectCountByArea[area.id] === 1 ? 'asignatura' : 'asignaturas'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={area.isOfficial ? 'success' : 'default'}>
                      {area.isOfficial ? 'Oficial' : 'Complementaria'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{area.sortOrder}</td>
                  <td className="px-4 py-3">
                    <Badge variant={area.status === 'ACTIVE' ? 'success' : 'default'}>
                      {area.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(area)}
                        >
                          Editar
                        </Button>
                        {area.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(area.id)}
                          >
                            Desactivar
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}