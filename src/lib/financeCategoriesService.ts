import { apiUrl } from "./api";
import { getToken } from "./auth";
import type { FinanceCategoryOption } from "../types/finance";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalize(raw: Record<string, unknown>): FinanceCategoryOption {
  return {
    id: String(raw.id ?? ""),
    type: raw.type === "RECEITA" ? "RECEITA" : "DESPESA",
    name: String(raw.name ?? "").trim(),
    icon: String(raw.icon ?? "💼").trim() || "💼",
    color: /^#[0-9a-fA-F]{6}$/.test(String(raw.color ?? "")) ? String(raw.color) : "#60a5fa",
    parentId: (raw.parentId as string | null) ?? null,
    level: Number(raw.level ?? 1),
  };
}

export async function listFinanceCategories(): Promise<FinanceCategoryOption[]> {
  const res = await fetch(apiUrl("/api/finance-categories"), {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`Erro ao carregar categorias: ${res.status}`);
  const raw = await res.json() as unknown[];
  return (Array.isArray(raw) ? raw : [])
    .map(r => normalize(r as Record<string, unknown>))
    .filter(c => c.id && c.name);
}

export async function createFinanceCategory(data: {
  type: "RECEITA" | "DESPESA";
  name: string;
  parentId?: string | null;
  icon?: string;
  color?: string;
}): Promise<FinanceCategoryOption> {
  const res = await fetch(apiUrl("/api/finance-categories"), {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? `Erro ao criar categoria: ${res.status}`);
  }
  return normalize(await res.json() as Record<string, unknown>);
}

export async function updateFinanceCategory(id: string, data: {
  name: string;
  icon?: string;
  color?: string;
}): Promise<FinanceCategoryOption> {
  const res = await fetch(apiUrl(`/api/finance-categories/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? `Erro ao atualizar categoria: ${res.status}`);
  }
  return normalize(await res.json() as Record<string, unknown>);
}

export async function deleteFinanceCategory(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/finance-categories/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? `Erro ao excluir categoria: ${res.status}`);
  }
}
