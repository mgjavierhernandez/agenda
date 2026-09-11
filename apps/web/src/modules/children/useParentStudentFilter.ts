import { useChildContext } from './ChildContext';

/**
 * Filtro centralizado por hijo seleccionado para módulos PARENT.
 * - `studentId` es `undefined` para no-padres (el backend aplica su scope).
 * - Para padres siempre resuelve a un hijo vinculado (seleccionado o primero).
 */
export function useParentStudentFilter() {
  const { isParent, children, selectedChildId, selectedChild } = useChildContext();
  const studentId = isParent
    ? (selectedChildId ?? children[0]?.studentId ?? undefined)
    : undefined;
  const resolvedChild = selectedChild ?? children[0] ?? null;
  return { isParent, studentId, selectedChild: resolvedChild, children };
}
