import { useState } from 'react';
import { apiClient } from '@/api/client';

export type ScheduleExportFormat = 'pdf' | 'xlsx' | 'csv';

export function useExportSchedules() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const exportSchedules = async (opts: {
    format: ScheduleExportFormat;
    dayOfWeek?: string;
    courseId?: string;
    studentId?: string;
  }) => {
    setIsExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({ format: opts.format });
      if (opts.dayOfWeek) params.set('dayOfWeek', opts.dayOfWeek);
      if (opts.courseId) params.set('courseId', opts.courseId);
      if (opts.studentId) params.set('studentId', opts.studentId);
      await apiClient.download(`/schedules/export?${params.toString()}`, `horario.${opts.format}`);
    } catch {
      setError('No se pudo descargar el archivo');
    } finally {
      setIsExporting(false);
    }
  };

  return { exportSchedules, isExporting, error };
}
