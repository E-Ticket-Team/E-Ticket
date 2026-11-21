import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setUnauthorizedHandler } from '../services/api';
import {
  authService,
  type GoogleLoginPayload,
  type LoginPayload,
  type RegisterCustomerPayload,
  type RegisterOrganizationPayload,
} from '../services/auth.service';
import type { UserProfile } from '../types/api';

export interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  login: (payload: LoginPayload) => Promise<UserProfile>;
  googleLogin: (payload: GoogleLoginPayload) => Promise<UserProfile>;
  registerCustomer: (payload: RegisterCustomerPayload) => Promise<UserProfile>;
  registerOrganization: (
    payload: RegisterOrganizationPayload,
  ) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearSessionExpired: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.me();
      setUser(profile);
      setSessionExpired(false);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser((prev) => {
        if (prev) {
          setSessionExpired(true);
        }
        return null;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    setUser(res.user);
    setSessionExpired(false);
    return res.user;
  }, []);

  const googleLogin = useCallback(async (payload: GoogleLoginPayload) => {
    const res = await authService.googleLogin(payload);
    setUser(res.user);
    setSessionExpired(false);
    return res.user;
  }, []);

  const registerCustomer = useCallback(
    async (payload: RegisterCustomerPayload) => {
      const res = await authService.registerCustomer(payload);
      setUser(res.user);
      setSessionExpired(false);
      return res.user;
    },
    [],
  );

  const registerOrganization = useCallback(
    async (payload: RegisterOrganizationPayload) => {
      const res = await authService.registerOrganization(payload);
      setUser(res.user);
      setSessionExpired(false);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setSessionExpired(false);
    }
  }, []);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      sessionExpired,
      login,
      googleLogin,
      registerCustomer,
      registerOrganization,
      logout,
      refreshUser,
      clearSessionExpired,
    }),
    [
      user,
      loading,
      sessionExpired,
      login,
      googleLogin,
      registerCustomer,
      registerOrganization,
      logout,
      refreshUser,
      clearSessionExpired,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
