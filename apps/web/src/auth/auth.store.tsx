import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { apiClient } from '@/api/client';
import { queryClient } from '@/api/query-client';
import type { AuthUser, LoginResponse, RefreshResponse, Institution } from '@/api/types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  institutions: Institution[];
  selectedInstitutionId: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  fetchInstitutions: () => Promise<Institution[]>;
  selectInstitution: (institutionId: string) => Promise<void>;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEYS = {
  accessToken: 'agenda_access_token',
  refreshToken: 'agenda_refresh_token',
  selectedInstitutionId: 'agenda_institution_id',
} as const;

function loadStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  try {
    return {
      accessToken: sessionStorage.getItem(STORAGE_KEYS.accessToken),
      refreshToken: sessionStorage.getItem(STORAGE_KEYS.refreshToken),
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function storeTokens(accessToken: string, refreshToken: string) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    sessionStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  } catch {
    // storage unavailable
  }
}

function clearStoredTokens() {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.accessToken);
    sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
    sessionStorage.removeItem(STORAGE_KEYS.selectedInstitutionId);
  } catch {
    // storage unavailable
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.selectedInstitutionId);
    } catch {
      return null;
    }
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setInstitutions([]);
    setSelectedInstitutionId(null);
    apiClient.setAccessToken(null);
    apiClient.setInstitutionId(null);
    clearStoredTokens();
    queryClient.removeQueries({ queryKey: ['user-permissions'] });
  }, []);

  const fetchInstitutions = useCallback(async () => {
    try {
      const res = await apiClient.get<{ institutions: Institution[] }>('/auth/institutions');
      setInstitutions(res.institutions);
      return res.institutions;
    } catch {
      setInstitutions([]);
      return [];
    }
  }, []);

  const selectInstitution = useCallback(async (institutionId: string) => {
    const res = await apiClient.post<{ institution: Institution; membership: unknown }>(
      '/auth/tenant/select',
      { institutionId },
    );
    setSelectedInstitutionId(res.institution.id);
    apiClient.setInstitutionId(res.institution.id);
    try {
      sessionStorage.setItem(STORAGE_KEYS.selectedInstitutionId, res.institution.id);
    } catch {
      // storage unavailable
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }
    const promise = (async () => {
      try {
        const storedRefreshToken = refreshToken || (() => {
          try { return sessionStorage.getItem(STORAGE_KEYS.refreshToken); } catch { return null; }
        })();
        if (!storedRefreshToken) {
          clearSession();
          return false;
        }
        const res = await apiClient.post<RefreshResponse>('/auth/refresh', {
          refreshToken: storedRefreshToken,
        });
        setAccessToken(res.accessToken);
        setRefreshToken(res.refreshToken);
        apiClient.setAccessToken(res.accessToken);
        storeTokens(res.accessToken, res.refreshToken);
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();
    refreshPromiseRef.current = promise;
    return promise;
  }, [refreshToken, clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    setUser(res.user);
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    apiClient.setAccessToken(res.accessToken);
    storeTokens(res.accessToken, res.refreshToken);
    const insts = await fetchInstitutions();
    if (insts.length === 1) {
      await selectInstitution(insts[0].id);
    } else if (insts.length === 0) {
      throw new Error('No institutions available for this account');
    }
  }, [fetchInstitutions, selectInstitution]);

  const logout = useCallback(async () => {
    const storedRefresh = refreshToken || (() => {
      try { return sessionStorage.getItem(STORAGE_KEYS.refreshToken); } catch { return null; }
    })();
    if (storedRefresh) {
      try {
        await apiClient.post('/auth/logout', { refreshToken: storedRefresh });
      } catch {
        // ignore logout errors
      }
    }
    clearSession();
  }, [refreshToken, clearSession]);

  // Session restore on mount
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const stored = loadStoredTokens();
      if (!stored.accessToken || !stored.refreshToken) {
        setIsInitializing(false);
        return;
      }
      apiClient.setAccessToken(stored.accessToken);
      setAccessToken(stored.accessToken);
      setRefreshToken(stored.refreshToken);

      try {
        const profile = await apiClient.get<{ id: string; email: string; status: string }>('/auth/profile');
        if (cancelled) return;
        setUser({ id: profile.id, email: profile.email, status: profile.status as AuthUser['status'] });
        const storedInstId = (() => {
          try { return sessionStorage.getItem(STORAGE_KEYS.selectedInstitutionId); } catch { return null; }
        })();
        if (storedInstId) {
          apiClient.setInstitutionId(storedInstId);
          setSelectedInstitutionId(storedInstId);
        }
        await fetchInstitutions();
      } catch {
        if (cancelled) return;
        const refreshed = await refreshSession();
        if (!cancelled && refreshed) {
          try {
            const profile = await apiClient.get<{ id: string; email: string; status: string }>('/auth/profile');
            if (!cancelled) {
              setUser({ id: profile.id, email: profile.email, status: profile.status as AuthUser['status'] });
              await fetchInstitutions();
            }
          } catch {
            // refresh failed, clear session
          }
        }
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };
    restore();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up 401 handler
  useEffect(() => {
    apiClient.setOnUnauthorized(() => {
      refreshSession().then((ok) => {
        if (!ok) clearSession();
      });
    });
    return () => apiClient.setOnUnauthorized(null);
  }, [refreshSession, clearSession]);

  const value: AuthContextValue = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading: false,
    isInitializing,
    institutions,
    selectedInstitutionId,
    login,
    logout,
    refreshSession,
    fetchInstitutions,
    selectInstitution,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
