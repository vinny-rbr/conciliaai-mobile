import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getToken, saveToken, saveUser, savePlanName, logout as authLogout } from "../lib/auth";

type AuthContextType = {
  isLoggedIn: boolean;
  signIn: (token: string, user?: Record<string, unknown>, planName?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    getToken().then(t => setIsLoggedIn(!!t));
  }, []);

  async function signIn(token: string, user?: Record<string, unknown>, planName?: string) {
    await saveToken(token);
    if (user) await saveUser(user);
    if (planName) await savePlanName(planName);
    setIsLoggedIn(true);
  }

  async function signOut() {
    await authLogout();
    setIsLoggedIn(false);
  }

  if (isLoggedIn === null) return null;

  return (
    <AuthContext.Provider value={{ isLoggedIn, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
