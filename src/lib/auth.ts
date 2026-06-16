import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "conciliaai_token";
const USER_KEY  = "conciliaai_user";
const PLAN_KEY  = "conciliaai_plan";
const EMAIL_KEY = "conciliaai_email";

export type PlanName = "Basico" | "Pro" | "Premium";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveUser(user: Record<string, unknown>): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<Record<string, unknown> | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
}

export async function savePlanName(name: string): Promise<void> {
  await SecureStore.setItemAsync(PLAN_KEY, name);
}

export async function getPlanName(): Promise<PlanName | null> {
  const v = await SecureStore.getItemAsync(PLAN_KEY);
  if (v === "Basico" || v === "Pro" || v === "Premium") return v;
  return null;
}

export async function saveEmail(email: string): Promise<void> {
  await SecureStore.setItemAsync(EMAIL_KEY, email.toLowerCase());
}

export async function getEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(EMAIL_KEY);
}

// Tries every source to find the logged-in user's email.
// Works even before the user re-logs in.
export async function getEmailFromAnySource(): Promise<string | null> {
  // 1. Directly saved email (available after login with new code)
  const saved = await SecureStore.getItemAsync(EMAIL_KEY);
  if (saved) return saved.toLowerCase();

  // 2. Decode JWT payload (always available from original login)
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      const parts = token.split(".");
      if (parts.length >= 2) {
        let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        const payload = JSON.parse(atob(b64)) as Record<string, unknown>;
        for (const key of ["email", "Email", "sub", "username", "user_email", "mail"]) {
          const v = payload[key];
          if (typeof v === "string" && v.includes("@")) return v.toLowerCase();
        }
      }
    }
  } catch { /* atob or parse failed */ }

  // 3. Scan all string values in the stored user object
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (raw) {
      const user = JSON.parse(raw) as Record<string, unknown>;
      for (const v of Object.values(user)) {
        if (typeof v === "string" && v.includes("@")) return v.toLowerCase();
      }
    }
  } catch { /* ignore */ }

  return null;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(PLAN_KEY);
  await SecureStore.deleteItemAsync(EMAIL_KEY);
}
