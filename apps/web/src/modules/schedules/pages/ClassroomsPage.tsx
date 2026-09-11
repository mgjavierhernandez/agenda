import { useState, type FormEvent } from 'react';
import { useClassrooms, useCreateClassroom, useDeactivateClassroom } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { getErrorMessage } from '@/api/errors';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { CLASSROOM_TYPE_LABELS, type ClassroomType } from '@/api/types';

export function ClassroomsPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SCHEDULES_MANAGE);

  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [type, setType] = useState<ClassroomType>('AULA');
  const [error, setError] = useState('');

  const { data, isLoading } = useClassrooms({ limit: 100, ...(search ? { search } : {}) });
  const createClassroom = useCreateClassroom();
  const deactivateClassroom = useDeactivateClassroom();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createClassroom.mutateAsync({
        code: code.trim(),
        name: name.trim(),
        type,
        ...(capacity ? { capacity: Number(capacity) } : {}),
      });
      setCode('');
      setName('');
      setCapacity('');
    } catch (err) {
      setError(getErrorMessage(err) || 'No fue posible crear el aula');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aulas y espacios"
        description="Administra los espacios físicos utilizables en los horarios"
      />

      {canManage && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nueva aula</h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
          >
            <Input
              label="Código"
              placeholder="A-101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Input
              label="Nombre"
              placeholder="Aula 101"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Capacidad"
              type="number"
              min={1}
              placeholder="30"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
            <div>
              <label htmlFor="roomType" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                id="roomType"
                value={type}
                onChange={(e) => setType(e.target.value as ClassroomType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {(Object.keys(CLASSROOM_TYPE_LABELS) as ClassroomType[]).map((t) => (
                  <option key={t} value={t}>
                    {CLASSROOM_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" isLoading={createClassroom.isPending}>
              Crear
            </Button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-4 max-w-sm">
          <Input
            label="Buscar"
            placeholder="Código o nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (data?.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No hay aulas registradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Código</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Capacidad</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                  {canManage && (
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{r.code}</td>
                    <td className="px-4 py-2">{r.name}</td>
                    <td className="px-4 py-2">{CLASSROOM_TYPE_LABELS[r.type]}</td>
                    <td className="px-4 py-2">{r.capacity ?? '—'}</td>
                    <td className="px-4 py-2">
                      <Badge variant={r.status === 'ACTIVE' ? 'success' : 'default'}>
                        {r.status}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="px-4 py-2 text-right">
                        {r.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => deactivateClassroom.mutate(r.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Desactivar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
