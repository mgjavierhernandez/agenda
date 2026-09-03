import { apiClient } from '@/api/client';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function withFormat(academicPeriodId: string | undefined, format: 'pdf' | 'csv'): string {
  const base = academicPeriodId ? `?academicPeriodId=${academicPeriodId}` : '';
  return `${base}${base ? '&' : '?'}format=${format}`;
}

export function downloadStudentReportPdf(studentId: string, label: string, academicPeriodId?: string) {
  const query = academicPeriodId ? `?academicPeriodId=${academicPeriodId}` : '';
  return apiClient.download(`/reports/students/${studentId}/export${query}`, `reporte-${slugify(label)}.pdf`);
}

export function downloadStudentReportCsv(studentId: string, label: string, academicPeriodId?: string) {
  const query = withFormat(academicPeriodId, 'csv');
  return apiClient.download(`/reports/students/${studentId}/export${query}`, `reporte-${slugify(label)}.csv`);
}

export function downloadBulletinPdf(studentId: string, label: string, academicPeriodId?: string) {
  const query = academicPeriodId ? `?academicPeriodId=${academicPeriodId}` : '';
  return apiClient.download(`/reports/students/${studentId}/bulletin/export${query}`, `boletin-${slugify(label)}.pdf`);
}

export function downloadBulletinCsv(studentId: string, label: string, academicPeriodId?: string) {
  const query = withFormat(academicPeriodId, 'csv');
  return apiClient.download(`/reports/students/${studentId}/bulletin/export${query}`, `boletin-${slugify(label)}.csv`);
}

export function downloadCourseReportCsv(courseId: string, label: string, academicPeriodId?: string) {
  const query = academicPeriodId ? `?academicPeriodId=${academicPeriodId}` : '';
  return apiClient.download(`/reports/courses/${courseId}/export${query}`, `reporte-curso-${slugify(label)}.csv`);
}