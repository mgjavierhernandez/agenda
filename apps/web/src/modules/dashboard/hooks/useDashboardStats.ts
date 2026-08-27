import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

function useCount(queryKey: string, endpoint: string, enabled: boolean, studentId?: string | null) {
  return useQuery<{ data: unknown[]; meta: { total: number } }>({
    queryKey: [queryKey, 'count', studentId],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '1' });
      if (studentId) params.set('studentId', studentId);
      return apiClient.get(`${endpoint}?${params.toString()}`);
    },
    enabled,
    select: (data) => ({ data: [], meta: data.meta }),
  });
}

export interface DashboardStatsPermissions {
  students?: boolean;
  courses?: boolean;
  subjects?: boolean;
  tasks?: boolean;
  enrollments?: boolean;
  signatures?: boolean;
  communications?: boolean;
}

export function useDashboardStats(isReady: boolean, permissions?: DashboardStatsPermissions, studentId?: string | null) {
  const show = permissions ?? { students: true, courses: true, subjects: true, tasks: true, enrollments: true, signatures: true, communications: true };

  const students = useCount('dashboard-students', '/students', isReady && !!show.students, studentId);
  const courses = useCount('dashboard-courses', '/courses', isReady && !!show.courses);
  const subjects = useCount('dashboard-subjects', '/subjects', isReady && !!show.subjects);
  const tasks = useCount('dashboard-tasks', '/tasks', isReady && !!show.tasks, studentId);
  const enrollments = useCount('dashboard-enrollments', '/enrollments', isReady && !!show.enrollments, studentId);
  const signatures = useCount('dashboard-signatures', '/signature-requests', isReady && !!show.signatures);
  const communications = useCount('dashboard-communications', '/communications', isReady && !!show.communications);

  const isLoading = students.isLoading || courses.isLoading || subjects.isLoading ||
    tasks.isLoading || enrollments.isLoading || signatures.isLoading || communications.isLoading;

  const hasError = students.isError || courses.isError || subjects.isError ||
    tasks.isError || enrollments.isError || signatures.isError || communications.isError;

  return {
    stats: {
      students: show.students ? (students.data?.meta.total ?? 0) : undefined,
      courses: show.courses ? (courses.data?.meta.total ?? 0) : undefined,
      subjects: show.subjects ? (subjects.data?.meta.total ?? 0) : undefined,
      tasks: show.tasks ? (tasks.data?.meta.total ?? 0) : undefined,
      enrollments: show.enrollments ? (enrollments.data?.meta.total ?? 0) : undefined,
      signatures: show.signatures ? (signatures.data?.meta.total ?? 0) : undefined,
      communications: show.communications ? (communications.data?.meta.total ?? 0) : undefined,
    },
    isLoading,
    hasError,
  };
}
