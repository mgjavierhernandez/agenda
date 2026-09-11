import type { SubjectAverage, PeriodAverage } from '../hooks/useAcademicSummary';

const BAR_COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#db2777', '#ea580c', '#16a34a'];

function formatAvg(n: number): string {
  return n.toFixed(2);
}

/** Barras horizontales SVG: promedio por materia (sin dependencias externas). */
export function SubjectBars({ data }: { data: SubjectAverage[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Sin calificaciones para graficar.</p>;
  }
  const max = Math.max(...data.map((d) => d.average), 5);
  return (
    <div
      className="space-y-3"
      role="img"
      aria-label={`Promedio por materia: ${data.map((d) => `${d.name} ${formatAvg(d.average)}`).join(', ')}`}
    >
      {data.map((d, i) => (
        <div key={d.subjectId}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-gray-700 truncate" title={d.name}>
              {d.name} <span className="text-gray-400">({d.count})</span>
            </span>
            <span className="font-semibold text-gray-900 ml-2">{formatAvg(d.average)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(4, (d.average / max) * 100)}%`,
                backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Línea de evolución SVG: promedio por período. */
export function PeriodTrend({ data }: { data: PeriodAverage[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Sin datos por período.</p>;
  }
  const W = 560;
  const H = 180;
  const PAD = 32;
  const max = Math.max(...data.map((d) => d.average), 5);
  const min = Math.min(...data.map((d) => d.average), 0);
  const span = Math.max(max - min, 0.5);
  const x = (i: number) =>
    data.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (data.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const points = data.map((d, i) => `${x(i)},${y(d.average)}`).join(' ');

  return (
    <div
      role="img"
      aria-label={`Evolución por período: ${data.map((d) => `${d.period} ${formatAvg(d.average)}`).join(', ')}`}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-hidden="true">
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + f * (H - PAD * 2)}
            y2={PAD + f * (H - PAD * 2)}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={d.period}>
            <circle cx={x(i)} cy={y(d.average)} r="4" fill="#2563eb" stroke="#fff" strokeWidth="2">
              <title>{`${d.period}: ${formatAvg(d.average)} (${d.count} notas)`}</title>
            </circle>
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
              {d.period}
            </text>
            <text x={x(i)} y={y(d.average) - 10} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#111827">
              {formatAvg(d.average)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
