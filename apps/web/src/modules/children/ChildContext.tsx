import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuth } from '@/auth/auth.store';

export interface Child {
  studentId: string;
  firstName: string;
  lastName: string;
  relationshipType: string;
}

interface ChildContextValue {
  children: Child[];
  selectedChildId: string | null;
  setSelectedChildId: (id: string | null) => void;
  isLoading: boolean;
  isParent: boolean;
}

const ChildContext = createContext<ChildContextValue | null>(null);

interface GuardianStudentResponse {
  data: {
    studentId: string;
    relationshipType: string;
    student: {
      firstName: string;
      lastName: string;
    };
  }[];
}

export function ChildProvider({ children }: { children: ReactNode }) {
  const { selectedInstitutionId } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<GuardianStudentResponse>({
    queryKey: ['guardian-children', selectedInstitutionId],
    queryFn: () => apiClient.get('/guardians/students?limit=50'),
    enabled: !!selectedInstitutionId,
    staleTime: 10 * 60 * 1000,
  });

  const childList: Child[] = (data?.data ?? []).map((gs) => ({
    studentId: gs.studentId,
    firstName: gs.student.firstName,
    lastName: gs.student.lastName,
    relationshipType: gs.relationshipType,
  }));

  const isParent = childList.length > 0;

  const handleSetSelectedChildId = useCallback((id: string | null) => {
    setSelectedChildId(id);
  }, []);

  return (
    <ChildContext.Provider
      value={{
        children: childList,
        selectedChildId,
        setSelectedChildId: handleSetSelectedChildId,
        isLoading,
        isParent,
      }}
    >
      {children}
    </ChildContext.Provider>
  );
}

const EMPTY_CHILD_CONTEXT: ChildContextValue = {
  children: [],
  selectedChildId: null,
  setSelectedChildId: () => {},
  isLoading: false,
  isParent: false,
};

export function useChildContext(): ChildContextValue {
  return useContext(ChildContext) ?? EMPTY_CHILD_CONTEXT;
}
