import { useState, useCallback, createContext, useContext } from "react";

const DEFAULT_ADMIN_PASSWORD   = "police@123";
const DEFAULT_OFFICER_PASSWORD = "officer@123";
const ADMIN_PASSWORD_KEY       = "apl_password";
const OFFICER_PASSWORD_KEY     = "apl_officer_password";
const AUTH_KEY                 = "apl_authenticated";
const ROLE_KEY                 = "apl_role";

export type UserRole = "admin" | "officer";

export const FIXED_USERNAME   = "Ayodhya Police Line";
export const OFFICER_USERNAME = "Senior Officer";

export interface AuthContextValue {
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (password: string, role: UserRole) => boolean;
  logout: () => void;
  changePassword: (current: string, next: string, role?: UserRole) => { success: boolean; error?: string };
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAuthState(): AuthContextValue {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    localStorage.getItem(AUTH_KEY) === "true",
  );

  const [role, setRole] = useState<UserRole | null>(() => {
    const stored = localStorage.getItem(ROLE_KEY);
    return stored === "admin" || stored === "officer" ? stored : null;
  });

  const login = useCallback((password: string, loginRole: UserRole): boolean => {
    if (loginRole === "admin") {
      const stored = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
      if (password !== stored) return false;
    } else {
      const stored = localStorage.getItem(OFFICER_PASSWORD_KEY) || DEFAULT_OFFICER_PASSWORD;
      if (password !== stored) return false;
    }
    localStorage.setItem(AUTH_KEY, "true");
    localStorage.setItem(ROLE_KEY, loginRole);
    setIsAuthenticated(true);
    setRole(loginRole);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ROLE_KEY);
    setIsAuthenticated(false);
    setRole(null);
  }, []);

  const changePassword = useCallback(
    (current: string, next: string, targetRole?: UserRole): { success: boolean; error?: string } => {
      const r = targetRole ?? role ?? "admin";
      const key     = r === "admin" ? ADMIN_PASSWORD_KEY : OFFICER_PASSWORD_KEY;
      const def     = r === "admin" ? DEFAULT_ADMIN_PASSWORD : DEFAULT_OFFICER_PASSWORD;
      const stored  = localStorage.getItem(key) || def;
      if (current !== stored) return { success: false, error: "Current password is incorrect" };
      if (next.length < 6) return { success: false, error: "New password must be at least 6 characters" };
      localStorage.setItem(key, next);
      return { success: true };
    },
    [role],
  );

  return { isAuthenticated, role, login, logout, changePassword };
}
