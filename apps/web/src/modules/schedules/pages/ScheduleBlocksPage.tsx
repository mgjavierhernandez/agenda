import { useState, type FormEvent } from 'react';
import { useScheduleBlocks, useCreateScheduleBlock, useDeactivateScheduleBlock } from '../hooks';
import { usePermissions } from '@/permissions/usePermissions';
import { getErrorMessage } from '@/api/errors';
import { PageHeader } from '@/components/feedback/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { PERMISSIONS } from '@/permissions/permission.constants';
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER, type DayOfWeek } from '@/api/types';

export function formatBlockTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function ScheduleBlocksPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SCHEDULES_MANAGE);

  const [dayFilter, setDayFilter] = useState<DayOfWeek | ''>('');
  const [name, setName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('MONDAY');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:00');
  const [error, setError] = useState('');

  const { data, isLoading } = useScheduleBlocks({
    limit: 100,
    ...(dayFilter ? { dayOfWeek: dayFilter } : {}),
  });
  const createBlock = useCreateScheduleBlock();
  const deactivateBlock = useDeactivateScheduleBlock();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createBlock.mutateAsync({ name: name.trim(), dayOfWeek, startTime, endTime });
      setName('');
    } catch (err) {
      setError(getErrorMessage(err) || 'No fue posible crear la franja');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Franjas horarias"
        description="Configura las franjas (bloques de tiempo) reutilizables en los horarios"
      />

      {canManage && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nueva franja</h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
          >
            <Input
              label="Nombre"
              placeholder="Bloque 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div>
              <label htmlFor="blockDay" className="block text-sm font-medium text-gray-700 mb-1">
                Día
              </label>
              <select
                id="blockDay"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {DAY_OF_WEEK_ORDER.map((d) => (
                  <option key={d} value={d}>
                    {DAY_OF_WEEK_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Inicio"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              label="Fin"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
            <Button type="submit" isLoading={createBlock.isPending}>
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Franjas configuradas</h3>
          <select
            aria-label="Filtrar por día"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value as DayOfWeek | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los días</option>
            {DAY_OF_WEEK_ORDER.map((d) => (
              <option key={d} value={d}>
                {DAY_OF_WEEK_LABELS[d]}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (data?.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No hay franjas configuradas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Día</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Horario</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                  {canManage && (
                    <th className="px-4 py-2 text-right font-medium text-gray-600">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((b) => (
                  <tr key={b.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{b.name}</td>
                    <td className="px-4 py-2">{DAY_OF_WEEK_LABELS[b.dayOfWeek]}</td>
                    <td className="px-4 py-2">
                      {formatBlockTime(b.startTime)} – {formatBlockTime(b.endTime)}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={b.status === 'ACTIVE' ? 'success' : 'default'}>
                        {b.status}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="px-4 py-2 text-right">
                        {b.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => deactivateBlock.mutate(b.id)}
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
