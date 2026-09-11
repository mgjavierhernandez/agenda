import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export type DashboardRole =
  | 'INSTITUTION_ADMIN'
  | 'SUPER_ADMIN'
  | 'RECTOR'
  | 'COORDINADOR_ACADEMICO'
  | 'COORDINADOR_CONVIVENCIA'
  | 'ORIENTADOR'
  | 'PSICOLOGO'
  | 'DIRECTOR_DE_GRUPO'
  | 'TEACHER'
  | 'PARENT'
  | 'STUDENT';

export interface RoleDashboard {
  role: DashboardRole;
  activePeriod: {
    id: string;
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    status: string;
  } | null;
  stats: Record<string, number>;
  children: Array<{ id: string; firstName: string; lastName: string; status: string }>;
  courses: Array<{ id: string; code: string; name: string; status: string }>;
  subjects: Array<{ id: string; code: string; name: string; status: string }>;
  recentNotifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    status: string;
    createdAt: string;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt: string;
    location: string | null;
  }>;
  recentCommunications: Array<{
    id: string;
    title: string;
    content: string;
    publishedAt: string | null;
  }>;
  pendingSignatures: Array<{
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
  }>;
  followUps: Array<{
    id: string;
    title: string;
    confidentiality: string;
    status: string;
    createdAt: string;
    studentId: string;
  }>;
  pendingCommitments: Array<{
    id: string;
    description: string;
    status: string;
    dueDate: string | null;
  }>;
}

export function useRoleDashboard(isReady: boolean, periodId?: string) {
  return useQuery<RoleDashboard>({
    queryKey: ['dashboard', 'role', periodId ?? ''],
    queryFn: () => {
      const params = periodId ? `?periodId=${encodeURIComponent(periodId)}` : '';
      return apiClient.get<RoleDashboard>(`/dashboard${params}`);
    },
    enabled: isReady,
    retry: false,
  });
}
