import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, type AuthUser, type Wallet } from '../api/client';

const TOKEN_STORAGE_KEY = 'digicasino.authToken';

export interface AuthContextValue {
  user: AuthUser | null;
  wallet: Wallet | null;
  token: string | null;
  /** True while the initial /auth/me check on load is in flight. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Updates the locally-held wallet balance, e.g. after a game session settles. */
  setWallet: (wallet: Wallet) => void;
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
  const [wallet, setWallet] = useState<Wallet | null>(null);
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
      .then((result) => {
        if (!cancelled) {
          setUser(result.user);
          setWallet(result.wallet);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Token is invalid/expired — clear local auth state.
          setUser(null);
          setWallet(null);
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
    // POST /auth/login returns { token, user } but not the wallet balance,
    // so fetch /auth/me right after to hydrate wallet state too.
    const result = await apiClient.login({ email, password });
    const me = await apiClient.me(result.token);
    setToken(result.token);
    setUser(me.user);
    setWallet(me.wallet);
    storeToken(result.token);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    // POST /auth/register creates the user + starting wallet but does NOT
    // issue a token (by backend design) -- log in immediately afterwards
    // with the same credentials so registration still feels like one step.
    const { user: registeredUser, wallet: startingWallet } = await apiClient.register({
      email,
      password,
    });
    const loginResult = await apiClient.login({ email, password });
    setToken(loginResult.token);
    setUser(registeredUser);
    setWallet(startingWallet);
    storeToken(loginResult.token);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setWallet(null);
    storeToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, wallet, token, isLoading, login, register, logout, setWallet }),
    [user, wallet, token, isLoading, login, register, logout, setWallet],
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
