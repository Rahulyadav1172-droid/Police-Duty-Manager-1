import { useState, useCallback, useEffect, createContext, useContext } from "react";

const DEFAULT_ADMIN_PASSWORD      = "police@123";
const DEFAULT_SMART_CELL_PASSWORD = "smartcell@123";
const ADMIN_PASSWORD_KEY          = "apl_password";
const SMART_CELL_PASSWORD_KEY     = "apl_smartcell_password";
const AUTH_KEY                    = "apl_authenticated";
const ROLE_KEY                    = "apl_role";
const LAST_ACTIVITY_KEY           = "apl_last_activity";
const SESSION_EXPIRED_KEY         = "apl_session_expired";

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS     = 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

export type UserRole = "admin" | "smart-cell";

export const FIXED_USERNAME      = "Ayodhya Police Line";
export const SMART_CELL_USERNAME = "Smart Cell";

export interface AuthContextValue {
  isAuthenticated: boolean;
  role: UserRole | null;
  login: (password: string, role: UserRole) => boolean;
  logout: (expired?: boolean) => void;
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
    return stored === "admin" || stored === "smart-cell" ? stored : null;
  });

  const login = useCallback((password: string, loginRole: UserRole): boolean => {
    if (loginRole === "admin") {
      const stored = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
      if (password !== stored) return false;
    } else {
      const stored = localStorage.getItem(SMART_CELL_PASSWORD_KEY) || DEFAULT_SMART_CELL_PASSWORD;
      if (password !== stored) return false;
    }
    localStorage.setItem(AUTH_KEY, "true");
    localStorage.setItem(ROLE_KEY, loginRole);
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    localStorage.removeItem(SESSION_EXPIRED_KEY);
    setIsAuthenticated(true);
    setRole(loginRole);
    return true;
  }, []);

  const logout = useCallback((expired = false) => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (expired) localStorage.setItem(SESSION_EXPIRED_KEY, "1");
    setIsAuthenticated(false);
    setRole(null);
  }, []);

  const changePassword = useCallback(
    (current: string, next: string, targetRole?: UserRole): { success: boolean; error?: string } => {
      const r = targetRole ?? role ?? "admin";
      const key  = r === "admin" ? ADMIN_PASSWORD_KEY : SMART_CELL_PASSWORD_KEY;
      const def  = r === "admin" ? DEFAULT_ADMIN_PASSWORD : DEFAULT_SMART_CELL_PASSWORD;
      const stored = localStorage.getItem(key) || def;
      if (current !== stored) return { success: false, error: "Current password is incorrect" };
      if (next.length < 6) return { success: false, error: "New password must be at least 6 characters" };
      localStorage.setItem(key, next);
      return { success: true };
    },
    [role],
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }

    function refreshActivity() {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, refreshActivity, { passive: true }));

    const timer = setInterval(() => {
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? 0);
      if (Date.now() - last > INACTIVITY_TIMEOUT_MS) {
        logout(true);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, refreshActivity));
      clearInterval(timer);
    };
  }, [isAuthenticated, logout]);

  return { isAuthenticated, role, login, logout, changePassword };
}

export { SESSION_EXPIRED_KEY };
