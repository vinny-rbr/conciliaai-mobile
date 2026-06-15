import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "conciliaai_token";
const USER_KEY = "conciliaai_user";
const PLAN_KEY = "conciliaai_plan";

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

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(PLAN_KEY);
}
