import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: { value: number; label?: string };
}

export function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
          {description && <p className="text-xs text-gray-500 mt-1 truncate">{description}</p>}
          {trend && (
            <p className={`text-xs font-medium mt-2 ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
              {trend.label ? ` ${trend.label}` : ''}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4 w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
