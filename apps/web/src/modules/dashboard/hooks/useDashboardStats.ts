import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

function useCount(queryKey: string, endpoint: string, enabled: boolean) {
  return useQuery<{ data: unknown[]; meta: { total: number } }>({
    queryKey: [queryKey, 'count'],
    queryFn: () => apiClient.get(`${endpoint}?limit=1`),
    enabled,
    select: (data) => ({ data: [], meta: data.meta }),
  });
}

export function useDashboardStats(isReady: boolean) {
  const students = useCount('dashboard-students', '/students', isReady);
  const courses = useCount('dashboard-courses', '/courses', isReady);
  const subjects = useCount('dashboard-subjects', '/subjects', isReady);
  const tasks = useCount('dashboard-tasks', '/tasks', isReady);
  const enrollments = useCount('dashboard-enrollments', '/enrollments', isReady);
  const signatures = useCount('dashboard-signatures', '/signature-requests', isReady);
  const communications = useCount('dashboard-communications', '/communications', isReady);

  const isLoading = students.isLoading || courses.isLoading || subjects.isLoading ||
    tasks.isLoading || enrollments.isLoading || signatures.isLoading || communications.isLoading;

  const hasError = students.isError || courses.isError || subjects.isError ||
    tasks.isError || enrollments.isError || signatures.isError || communications.isError;

  return {
    stats: {
      students: students.data?.meta.total ?? 0,
      courses: courses.data?.meta.total ?? 0,
      subjects: subjects.data?.meta.total ?? 0,
      tasks: tasks.data?.meta.total ?? 0,
      enrollments: enrollments.data?.meta.total ?? 0,
      signatures: signatures.data?.meta.total ?? 0,
      communications: communications.data?.meta.total ?? 0,
    },
    isLoading,
    hasError,
  };
}
