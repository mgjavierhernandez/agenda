import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgenda } from '../hooks/useAgenda';
import type { AgendaEvent, AgendaEventType, AgendaView } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PermissionGate } from '@/permissions/PermissionGate';
import { PERMISSIONS } from '@/permissions/permission.constants';

const EVENT_TYPE_CONFIG: Record<AgendaEventType, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  SCHEDULE: { label: 'Horario', variant: 'info' },
  TASK: { label: 'Tarea', variant: 'warning' },
  COMMUNICATION: { label: 'Comunicacion', variant: 'success' },
  SIGNATURE: { label: 'Firma', variant: 'danger' },
};

function getDateRange(view: AgendaView, currentDate: Date): { start: string; end: string } {
  const d = new Date(currentDate);
  if (view === 'day') {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (view === 'week') {
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function navigateDate(view: AgendaView, currentDate: Date, direction: -1 | 1): Date {
  const d = new Date(currentDate);
  if (view === 'day') d.setDate(d.getDate() + direction);
  else if (view === 'week') d.setDate(d.getDate() + direction * 7);
  else d.setMonth(d.getMonth() + direction);
  return d;
}

function formatDateHeader(view: AgendaView, currentDate: Date): string {
  const opts: Intl.DateTimeFormatOptions = view === 'day'
    ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    : view === 'week'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'long' };
  return currentDate.toLocaleDateString('es-ES', opts);
}

function groupEventsByDate(events: AgendaEvent[]): Map<string, AgendaEvent[]> {
  const map = new Map<string, AgendaEvent[]>();
  for (const event of events) {
    const dateKey = new Date(event.start).toISOString().split('T')[0];
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey)!.push(event);
  }
  return map;
}

function EventCard({ event, onClick }: { event: AgendaEvent; onClick: () => void }) {
  const config = EVENT_TYPE_CONFIG[event.type] ?? EVENT_TYPE_CONFIG.TASK;
  const time = event.allDay
    ? 'Todo el dia'
    : new Date(event.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={config.variant}>{config.label}</Badge>
            <span className="text-xs text-gray-500">{time}</span>
          </div>
          <h4 className="text-sm font-medium text-gray-900 truncate">{event.title}</h4>
          {event.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
          )}
        </div>
      </div>
    </button>
  );
}

export function AgendaPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<AgendaView>('week');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activeTypes, setActiveTypes] = useState<AgendaEventType[]>([]);

  const { start, end } = useMemo(() => getDateRange(view, currentDate), [view, currentDate]);
  const { data, isLoading, error } = useAgenda({ start, end, view, eventTypes: activeTypes.length > 0 ? activeTypes : undefined });

  const events = useMemo(() => data?.data ?? [], [data]);
  const groupedEvents = useMemo(() => groupEventsByDate(events), [events]);

  const toggleType = (type: AgendaEventType) => {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleEventClick = (event: AgendaEvent) => {
    if (event.route) navigate(event.route);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Agenda" />
        <ErrorState error={error} title="Error al cargar la agenda" />
      </div>
    );
  }

  return (
    <PermissionGate permission={PERMISSIONS.AGENDA_READ}>
      <div className="space-y-6">
        <PageHeader title="Agenda" />

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>
                Hoy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(navigateDate(view, currentDate, -1))}>
                ←
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(navigateDate(view, currentDate, 1))}>
                →
              </Button>
              <h2 className="text-lg font-semibold text-gray-900 ml-2">
                {formatDateHeader(view, currentDate)}
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month'] as AgendaView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    view === v
                      ? 'bg-white text-gray-900 shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {(Object.keys(EVENT_TYPE_CONFIG) as AgendaEventType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  activeTypes.includes(type)
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {EVENT_TYPE_CONFIG[type].label}
              </button>
            ))}
          </div>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="Sin eventos"
            description="No hay eventos en el rango de fechas seleccionado."
          />
        ) : (
          <div className="space-y-4">
            {Array.from(groupedEvents.entries()).map(([dateKey, dayEvents]) => (
              <Card key={dateKey} className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  {new Date(dateKey + 'T12:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => handleEventClick(event)}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
