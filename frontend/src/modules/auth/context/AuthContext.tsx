import { createContext, useMemo, useState, type ReactNode } from "react";
import { httpClient } from "@/services/api/httpClient";
import { clearAuthStorage, getRefreshToken, getStoredUser, setAuthStorage, setStoredUser } from "@/services/auth/tokenStorage";
import type { AuthUser, LoginPayload, LoginResponse } from "@/modules/auth/types/auth.types";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<AuthUser>) => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser<AuthUser>());
  const [isBootstrapping] = useState(false);

  async function login(payload: LoginPayload): Promise<void> {
    const { data } = await httpClient.post<LoginResponse>("/api/v1/auth/login", payload);

    const nextUser: AuthUser = {
      id: data.userId,
      userName: data.userName,
      fullName: data.fullName,
      roles: data.roles,
      permissions: data.permissions
    };

    setAuthStorage(data.accessToken, data.refreshToken, nextUser);
    setUser(nextUser);
  }

  function updateUser(partial: Partial<AuthUser>): void {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      setStoredUser(next);
      return next;
    });
  }

  async function logout(): Promise<void> {
    const refreshToken = getRefreshToken();

    if (refreshToken) {
      await httpClient.post("/api/v1/auth/logout", { refreshToken }).catch(() => undefined);
    }

    clearAuthStorage();
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      logout,
      updateUser
    }),
    [isBootstrapping, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
