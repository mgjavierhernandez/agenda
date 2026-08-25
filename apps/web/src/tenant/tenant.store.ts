import { useAuth } from '@/auth/auth.store';

export function useTenant() {
  const { institutions, selectedInstitutionId, selectInstitution } = useAuth();
  const selectedInstitution = institutions.find((i) => i.id === selectedInstitutionId) || null;
  const hasMultipleInstitutions = institutions.length > 1;
  const needsInstitutionSelection = institutions.length > 1 && !selectedInstitutionId;

  return {
    institutions,
    selectedInstitution,
    selectedInstitutionId,
    hasMultipleInstitutions,
    needsInstitutionSelection,
    selectInstitution,
    isTenantReady: !!selectedInstitutionId,
  };
}
