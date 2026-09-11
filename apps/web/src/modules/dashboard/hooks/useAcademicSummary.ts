import { useMemo } from 'react';
import { useGrades } from '@/modules/grades/hooks';
import { useTasks } from '@/modules/tasks/hooks';
import { useSubjects } from '@/modules/subjects/hooks';

export interface SubjectAverage {
  subjectId: string;
  name: string;
  average: number;
  count: number;
}

export interface PeriodAverage {
  period: string;
  average: number;
  count: number;
}

export interface AcademicSummary {
  average: number | null;
  gradesCount: number;
  bySubject: SubjectAverage[];
  byPeriod: PeriodAverage[];
  periods: string[];
  pendingTasks: number;
  overdueTasks: number;
  isLoading: boolean;
}

function toNumber(value: string): number | null {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function useAcademicSummary(opts: {
  studentId?: string;
  period?: string;
  subjectId?: string;
}): AcademicSummary {
  const { studentId, period, subjectId } = opts;

  // El scope por estudiante lo aplica el backend (hijo seleccionado o propio).
  // Los filtros de período/materia se aplican localmente sobre ese conjunto.
  const gradesQuery = useGrades({ studentId, limit: 200 });

  const tasksQuery = useTasks({ studentId, limit: 200 });
  const subjectsQuery = useSubjects({ limit: 100 });

  const subjectNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subjectsQuery.data?.data ?? []) map.set(s.id, s.name);
    return map;
  }, [subjectsQuery.data]);

  const grades = useMemo(() => {
    let list = gradesQuery.data?.data ?? [];
    if (period) list = list.filter((g) => g.period === period);
    if (subjectId) list = list.filter((g) => g.subjectId === subjectId);
    return list;
  }, [gradesQuery.data, period, subjectId]);

  const periods = useMemo(() => {
    const set = new Set<string>();
    for (const g of gradesQuery.data?.data ?? []) set.add(g.period);
    return [...set].sort();
  }, [gradesQuery.data]);

  const values = useMemo(
    () => grades.map((g) => toNumber(g.value)).filter((n): n is number => n !== null),
    [grades],
  );

  const bySubject = useMemo<SubjectAverage[]>(() => {
    const groups = new Map<string, number[]>();
    for (const g of grades) {
      const n = toNumber(g.value);
      if (n === null) continue;
      if (!groups.has(g.subjectId)) groups.set(g.subjectId, []);
      groups.get(g.subjectId)!.push(n);
    }
    return [...groups.entries()].map(([subjectIdKey, vals]) => ({
      subjectId: subjectIdKey,
      name: subjectNames.get(subjectIdKey) ?? subjectIdKey.slice(0, 8),
      average: avg(vals) ?? 0,
      count: vals.length,
    }));
  }, [grades, subjectNames]);

  const byPeriod = useMemo<PeriodAverage[]>(() => {
    const groups = new Map<string, number[]>();
    for (const g of grades) {
      const n = toNumber(g.value);
      if (n === null) continue;
      if (!groups.has(g.period)) groups.set(g.period, []);
      groups.get(g.period)!.push(n);
    }
    return [...groups.entries()]
      .map(([p, vals]) => ({ period: p, average: avg(vals) ?? 0, count: vals.length }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [grades]);

  const { pendingTasks, overdueTasks } = useMemo(() => {
    const now = new Date();
    let pending = 0;
    let overdue = 0;
    for (const t of tasksQuery.data?.data ?? []) {
      if (t.status !== 'PUBLISHED') continue;
      const due = new Date(t.dueDate);
      if (Number.isNaN(due.getTime()) || due >= now) pending += 1;
      else overdue += 1;
    }
    return { pendingTasks: pending, overdueTasks: overdue };
  }, [tasksQuery.data]);

  return {
    average: avg(values),
    gradesCount: values.length,
    bySubject,
    byPeriod,
    periods,
    pendingTasks,
    overdueTasks,
    isLoading: gradesQuery.isLoading || tasksQuery.isLoading || subjectsQuery.isLoading,
  };
}
