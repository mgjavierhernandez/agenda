import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgenda, useYearAgenda } from '../hooks/useAgenda';
import { useChildContext } from '@/modules/children';
import type { AgendaEvent, AgendaEventType, AgendaView } from '@/api/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/feedback/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PermissionGate } from '@/permissions/PermissionGate';
import { PERMISSIONS } from '@/permissions/permission.constants';

const EVENT_TYPE_CONFIG: Record<
  AgendaEventType,
  {
    label: string;
    variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
    color: string;
    bg: string;
  }
> = {
  SCHEDULE: { label: 'Horario', variant: 'info', color: 'border-l-blue-500', bg: 'bg-blue-50' },
  TASK: { label: 'Tarea', variant: 'warning', color: 'border-l-orange-500', bg: 'bg-orange-50' },
  COMMUNICATION: {
    label: 'Comunicacion',
    variant: 'success',
    color: 'border-l-emerald-500',
    bg: 'bg-emerald-50',
  },
  SIGNATURE: {
    label: 'Firma',
    variant: 'danger',
    color: 'border-l-purple-500',
    bg: 'bg-purple-50',
  },
  EVENT: { label: 'Evento', variant: 'default', color: 'border-l-gray-400', bg: 'bg-gray-50' },
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
  if (view === 'year') {
    return {
      start: new Date(d.getFullYear(), 0, 1).toISOString(),
      end: new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString(),
    };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function navigateDate(view: AgendaView, currentDate: Date, direction: -1 | 1): Date {
  const d = new Date(currentDate);
  if (view === 'day') d.setDate(d.getDate() + direction);
  else if (view === 'week') d.setDate(d.getDate() + direction * 7);
  else if (view === 'year') d.setFullYear(d.getFullYear() + direction);
  else d.setMonth(d.getMonth() + direction);
  return d;
}

function formatDateHeader(view: AgendaView, currentDate: Date): string {
  if (view === 'year') return String(currentDate.getFullYear());
  const opts: Intl.DateTimeFormatOptions =
    view === 'day'
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
    ? 'Todo el día'
    : new Date(event.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const endTime =
    event.end && !event.allDay
      ? new Date(event.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border-l-4 ${config.color} ${config.bg} border border-gray-200 hover:shadow-sm transition-all cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={config.variant}>{config.label}</Badge>
            <span className="text-xs text-gray-500">
              {time}
              {endTime ? ` – ${endTime}` : ''}
            </span>
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

function WeekView({
  events,
  currentDate,
  onEventClick,
}: {
  events: AgendaEvent[];
  currentDate: Date;
  onEventClick: (e: AgendaEvent) => void;
}) {
  const dayOfWeek = currentDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + mondayOffset + i);
    return d;
  });
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 - 22:00

  const eventsByDateHour = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.start);
      const key = `${d.toISOString().split('T')[0]}-${d.getHours()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header: days */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
          <div className="p-2" />
          {days.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`p-2 text-center border-l border-gray-200 ${isToday ? 'bg-blue-50' : ''}`}
              >
                <p className="text-xs text-gray-500">{dayNames[i]}</p>
                <p
                  className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}
                >
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>
        {/* Body: hours × days */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="p-2 text-xs text-gray-400 text-right border-b border-gray-100">
                {String(hour).padStart(2, '0')}:00
              </div>
              {days.map((d, di) => {
                const dateKey = d.toISOString().split('T')[0];
                const cellEvents = eventsByDateHour.get(`${dateKey}-${hour}`) ?? [];
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={di}
                    className={`border-l border-b border-gray-100 p-1 min-h-[48px] ${isToday ? 'bg-blue-50/30' : ''}`}
                  >
                    {cellEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onEventClick(ev)}
                        className={`w-full text-left text-xs p-1.5 rounded border-l-2 ${EVENT_TYPE_CONFIG[ev.type]?.color ?? 'border-l-gray-400'} ${EVENT_TYPE_CONFIG[ev.type]?.bg ?? 'bg-gray-50'} truncate mb-0.5 hover:shadow-sm transition-all cursor-pointer`}
                        title={ev.title}
                      >
                        <span className="font-medium text-gray-900 truncate block">{ev.title}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthView({
  events,
  currentDate,
  onEventClick,
}: {
  events: AgendaEvent[];
  currentDate: Date;
  onEventClick: (e: AgendaEvent) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDay.getDate();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const ev of events) {
      const key = new Date(ev.start).toISOString().split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const cells: Array<{ day: number | null; date?: Date; isCurrentMonth: boolean }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, isCurrentMonth: false });
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, date: new Date(year, month, d), isCurrentMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, isCurrentMonth: false });

  return (
    <div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {dayNames.map((n) => (
          <div key={n} className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-600">
            {n}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell.day) return <div key={i} className="bg-gray-50 p-2 min-h-[80px]" />;
          const dateKey = cell.date!.toISOString().split('T')[0];
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          const isToday = cell.date!.toDateString() === new Date().toDateString();
          return (
            <div key={i} className={`bg-white p-2 min-h-[80px] ${isToday ? 'bg-blue-50' : ''}`}>
              <p
                className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}`}
              >
                {cell.day}
              </p>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onEventClick(ev)}
                    className={`w-full text-left text-[10px] p-1 rounded truncate border-l-2 ${EVENT_TYPE_CONFIG[ev.type]?.color ?? 'border-l-gray-400'} ${EVENT_TYPE_CONFIG[ev.type]?.bg ?? 'bg-gray-50'} hover:shadow-sm transition-all cursor-pointer`}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 3} más</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AgendaPage() {
  const navigate = useNavigate();
  // Requisito: abrir por defecto en el día actual.
  const [view, setView] = useState<AgendaView>('day');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activeTypes, setActiveTypes] = useState<AgendaEventType[]>([]);
  const { isParent, selectedChildId, selectedChild } = useChildContext();
  // Padres: agenda del hijo seleccionado (el backend valida el vínculo).
  const childFilter = isParent ? (selectedChildId ?? undefined) : undefined;

  const { start, end } = useMemo(() => getDateRange(view, currentDate), [view, currentDate]);
  const { data, isLoading, error } = useAgenda({
    start,
    end,
    view,
    eventTypes: activeTypes.length > 0 ? activeTypes : undefined,
    studentId: childFilter,
  });
  const yearAgenda = useYearAgenda(currentDate.getFullYear(), {
    eventTypes: activeTypes.length > 0 ? activeTypes : undefined,
    studentId: childFilter,
  });
  const countsByMonth: number[] = yearAgenda?.countsByMonth ?? Array.from({ length: 12 }, () => 0);
  const isYearLoading = yearAgenda?.isLoading ?? false;
  const yearError = yearAgenda?.error ?? null;

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

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  return (
    <PermissionGate permission={PERMISSIONS.AGENDA_READ}>
      <div className="space-y-6">
        <PageHeader
          title="Agenda"
          description={
            isParent && selectedChild
              ? `Agenda de ${selectedChild.firstName} ${selectedChild.lastName}`
              : undefined
          }
          actions={
            <PermissionGate permission={PERMISSIONS.AGENDA_CREATE}>
              <Button onClick={() => navigate('/agenda/events/new')}>Nuevo evento</Button>
            </PermissionGate>
          }
        />

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>
                Hoy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(navigateDate(view, currentDate, -1))}
              >
                ←
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(navigateDate(view, currentDate, 1))}
              >
                →
              </Button>
              <h2 className="text-lg font-semibold text-gray-900 ml-2">
                {formatDateHeader(view, currentDate)}
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month', 'year'] as AgendaView[]).map((v) => (
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
                  {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Año'}
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

        {view === 'year' ? (
          isYearLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-gray-200 bg-white animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
              ))}
            </div>
          ) : yearError ? (
            <ErrorState error={yearError} title="Error al cargar la agenda anual" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {monthNames.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setCurrentDate(new Date(currentDate.getFullYear(), i, 1));
                    setView('month');
                  }}
                  className="p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {countsByMonth[i] === 0
                      ? 'Sin eventos'
                      : `${countsByMonth[i]} evento${countsByMonth[i] === 1 ? '' : 's'}`}
                  </p>
                </button>
              ))}
            </div>
          )
        ) : isLoading ? (
          <Card className="p-4 animate-pulse">
            {view === 'week' ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded" />
                ))}
              </div>
            ) : view === 'month' ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded" />
                ))}
              </div>
            )}
          </Card>
        ) : events.length === 0 ? (
          <EmptyState
            title="Sin eventos"
            description="No hay eventos en el rango de fechas seleccionado."
          />
        ) : view === 'week' ? (
          <Card className="p-0 overflow-hidden">
            <WeekView events={events} currentDate={currentDate} onEventClick={handleEventClick} />
          </Card>
        ) : view === 'month' ? (
          <MonthView events={events} currentDate={currentDate} onEventClick={handleEventClick} />
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
