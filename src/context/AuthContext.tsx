import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getToken, saveToken, saveUser, savePlanName, logout as authLogout } from "../lib/auth";
import { registerExpoTokenWithBackend } from "../lib/notificationService";
import { registerTokenExpiredHandler } from "../lib/authEvents";

type AuthContextType = {
  isLoggedIn: boolean;
  tokenExpired: boolean;
  signIn: (token: string, user?: Record<string, unknown>, planName?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const payload = JSON.parse(atob(b64)) as Record<string, unknown>;
    const exp = typeof payload.exp === "number" ? payload.exp : null;
    return exp !== null && exp * 1000 < Date.now();
  } catch { return false; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn,    setIsLoggedIn]    = useState<boolean | null>(null);
  const [tokenExpired,  setTokenExpired]  = useState(false);

  useEffect(() => {
    registerTokenExpiredHandler(() => setTokenExpired(true));

    getToken().then(t => {
      if (t && isJwtExpired(t)) {
        setIsLoggedIn(true);
        setTokenExpired(true);
      } else {
        setIsLoggedIn(!!t);
      }
    });
  }, []);

  async function signIn(token: string, user?: Record<string, unknown>, planName?: string) {
    await saveToken(token);
    if (user) await saveUser(user);
    if (planName) await savePlanName(planName);
    setTokenExpired(false);
    setIsLoggedIn(true);
    void registerExpoTokenWithBackend();
  }

  async function signOut() {
    await authLogout();
    setTokenExpired(false);
    setIsLoggedIn(false);
  }

  if (isLoggedIn === null) return null;

  return (
    <AuthContext.Provider value={{ isLoggedIn, tokenExpired, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
