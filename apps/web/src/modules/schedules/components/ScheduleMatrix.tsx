import { useMemo } from 'react';
import type { Schedule, DayOfWeek } from '@/api/types';

const DAY_ORDER: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY: 'Jue',
  FRIDAY: 'Vie',
  SATURDAY: 'Sáb',
  SUNDAY: 'Dom',
};

export interface NamedSchedule extends Schedule {
  courseName?: string;
  subjectName?: string;
  classroomName?: string;
}

function parseHour(value: string): number | null {
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.getUTCHours() + d.getUTCMinutes() / 60;
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return null;
  return Number(m[1]) + Number(m[2]) / 60;
}

function formatRange(s: Schedule): string {
  const f = (v: string) => {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }
    return v.slice(0, 5);
  };
  return `${f(s.startTime)}–${f(s.endTime)}`;
}

/**
 * Matriz premium de horarios: filas = horas, columnas = días de la semana.
 */
export function ScheduleMatrix({ schedules }: { schedules: NamedSchedule[] }) {
  const days = useMemo(
    () => DAY_ORDER.filter((d) => schedules.some((s) => s.dayOfWeek === d)),
    [schedules],
  );

  const hours = useMemo(() => {
    let min = 24;
    let max = 0;
    for (const s of schedules) {
      const h0 = parseHour(s.startTime);
      const h1 = parseHour(s.endTime);
      if (h0 !== null) min = Math.min(min, Math.floor(h0));
      if (h1 !== null) max = Math.max(max, Math.ceil(h1));
    }
    if (min > max) return [];
    const range: number[] = [];
    for (let h = Math.max(0, min); h < Math.min(24, Math.max(max, min + 1)); h++) range.push(h);
    return range;
  }, [schedules]);

  const cellFor = (day: DayOfWeek, hour: number): NamedSchedule[] =>
    schedules.filter((s) => {
      if (s.dayOfWeek !== day) return false;
      const h0 = parseHour(s.startTime);
      if (h0 === null) return false;
      return h0 >= hour && h0 < hour + 1;
    });

  if (schedules.length === 0 || hours.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        Sin horarios para mostrar en la matriz.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-sm border-collapse"
        aria-label="Matriz de horarios por hora y día"
      >
        <thead>
          <tr>
            <th className="border border-gray-200 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600 w-20">
              Hora
            </th>
            {days.map((d) => (
              <th
                key={d}
                className="border border-gray-200 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600"
              >
                {DAY_SHORT[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h}>
              <td className="border border-gray-200 px-2 py-2 font-mono text-xs text-gray-500 align-top">
                {String(h).padStart(2, '0')}:00
              </td>
              {days.map((d) => {
                const items = cellFor(d, h);
                return (
                  <td
                    key={d}
                    className="border border-gray-200 px-1.5 py-1.5 align-top min-w-[140px]"
                  >
                    {items.map((s) => (
                      <div
                        key={s.id}
                        className="mb-1 last:mb-0 rounded-md bg-blue-50 border border-blue-100 px-2 py-1"
                      >
                        <p className="text-xs font-semibold text-blue-900 leading-tight">
                          {s.courseName ?? s.courseId.slice(0, 8)}
                        </p>
                        <p className="text-[11px] text-blue-800 leading-tight">
                          {s.subjectName ?? s.subjectId.slice(0, 8)}
                        </p>
                        <p className="text-[11px] text-gray-600 font-mono">{formatRange(s)}</p>
                        {s.classroomName && (
                          <p className="text-[11px] text-gray-600">{s.classroomName}</p>
                        )}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
