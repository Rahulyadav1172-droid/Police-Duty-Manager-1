import { useState, useCallback, createContext, useContext } from "react";

const DEFAULT_PASSWORD = "police@123";
const PASSWORD_KEY = "apl_password";

export const FIXED_USERNAME = "Ayodhya Police Line";

export interface AuthContextValue {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  changePassword: (current: string, next: string) => { success: boolean; error?: string };
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAuthState(): AuthContextValue {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    localStorage.getItem("apl_authenticated") === "true",
  );

  const login = useCallback((password: string): boolean => {
    const stored = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
    if (password === stored) {
      localStorage.setItem("apl_authenticated", "true");
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("apl_authenticated");
    setIsAuthenticated(false);
  }, []);

  const changePassword = useCallback(
    (current: string, next: string): { success: boolean; error?: string } => {
      const stored = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
      if (current !== stored) return { success: false, error: "Current password is incorrect" };
      if (next.length < 6) return { success: false, error: "New password must be at least 6 characters" };
      localStorage.setItem(PASSWORD_KEY, next);
      return { success: true };
    },
    [],
  );

  return { isAuthenticated, login, logout, changePassword };
}
