import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, type AuthUser } from '../api/client';

const TOKEN_STORAGE_KEY = 'digicasino.authToken';

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** True while the initial /auth/me check on load is in flight. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (e.g. private browsing mode).
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(readStoredToken()));

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    apiClient
      .me(token)
      .then((fetchedUser) => {
        if (!cancelled) {
          setUser(fetchedUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Token is invalid/expired — clear local auth state.
          setUser(null);
          setToken(null);
          storeToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // Only re-run when the token itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiClient.login({ email, password });
    setToken(result.token);
    setUser(result.user);
    storeToken(result.token);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const result = await apiClient.register({ email, password });
    setToken(result.token);
    setUser(result.user);
    storeToken(result.token);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    storeToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
