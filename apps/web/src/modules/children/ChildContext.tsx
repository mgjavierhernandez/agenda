import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
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
  /** Hijo seleccionado. Nunca es un ID ajeno: siempre se valida contra `children`. */
  selectedChildId: string | null;
  selectedChild: Child | null;
  setSelectedChildId: (id: string | null) => void;
  selectChild: (id: string | null) => void;
  isLoading: boolean;
  isError: boolean;
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

const STORAGE_PREFIX = 'agenda_selected_child_id:';

function loadStoredChildId(institutionId: string | null): string | null {
  if (!institutionId) return null;
  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${institutionId}`);
  } catch {
    return null;
  }
}

function storeChildId(institutionId: string | null, childId: string | null) {
  if (!institutionId) return;
  try {
    if (childId) {
      sessionStorage.setItem(`${STORAGE_PREFIX}${institutionId}`, childId);
    } else {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${institutionId}`);
    }
  } catch {
    // almacenamiento no disponible
  }
}

export function ChildProvider({ children }: { children: ReactNode }) {
  const { selectedInstitutionId } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(() =>
    loadStoredChildId(selectedInstitutionId),
  );

  const { data, isLoading, isError } = useQuery<GuardianStudentResponse>({
    queryKey: ['guardian-children', selectedInstitutionId],
    queryFn: () => apiClient.get('/guardians/students?limit=50'),
    enabled: !!selectedInstitutionId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const childList: Child[] = useMemo(
    () =>
      (data?.data ?? []).map((gs) => ({
        studentId: gs.studentId,
        firstName: gs.student.firstName,
        lastName: gs.student.lastName,
        relationshipType: gs.relationshipType,
      })),
    [data],
  );

  const isParent = childList.length > 0;

  // Mantener la selección válida: primer hijo por defecto, almacenado válido
  // si pertenece a la lista, y reajuste si el hijo fue desvinculado.
  useEffect(() => {
    if (childList.length === 0) {
      if (selectedChildId !== null) setSelectedChildId(null);
      return;
    }
    const isValid = selectedChildId !== null && childList.some((c) => c.studentId === selectedChildId);
    if (!isValid) {
      const stored = loadStoredChildId(selectedInstitutionId);
      const next =
        stored && childList.some((c) => c.studentId === stored) ? stored : childList[0].studentId;
      setSelectedChildId(next);
      storeChildId(selectedInstitutionId, next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childList, selectedInstitutionId]);

  const handleSetSelectedChildId = useCallback(
    (id: string | null) => {
      // Validación: jamás aceptar un ID fuera de la lista de hijos vinculados
      // (el backend vuelve a validar el vínculo en cada endpoint).
      const next = id !== null && !childList.some((c) => c.studentId === id) ? null : id;
      setSelectedChildId(next);
      storeChildId(selectedInstitutionId, next);
    },
    [childList, selectedInstitutionId],
  );

  const selectedChild = useMemo(
    () => childList.find((c) => c.studentId === selectedChildId) ?? null,
    [childList, selectedChildId],
  );

  return (
    <ChildContext.Provider
      value={{
        children: childList,
        selectedChildId,
        selectedChild,
        setSelectedChildId: handleSetSelectedChildId,
        selectChild: handleSetSelectedChildId,
        isLoading,
        isError,
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
  selectedChild: null,
  setSelectedChildId: () => {},
  selectChild: () => {},
  isLoading: false,
  isError: false,
  isParent: false,
};

export function useChildContext(): ChildContextValue {
  return useContext(ChildContext) ?? EMPTY_CHILD_CONTEXT;
}
