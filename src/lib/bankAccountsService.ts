import { apiUrl } from "./api";
import { getToken } from "./auth";
import type { BankAccount } from "../types/finance";

export async function listBankAccounts(): Promise<BankAccount[]> {
  const token = await getToken();
  if (!token) return [];
  const res = await fetch(apiUrl("/api/bank-accounts"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json() as Promise<BankAccount[]>;
}

export async function createBankAccount(data: {
  bank: string; nick: string; accountType: string; face?: string; balanceCents?: number;
}): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const res = await fetch(apiUrl("/api/bank-accounts"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}

export async function updateBankAccount(id: string, data: {
  nick?: string; balanceCents?: number; face?: string; accountType?: string;
}): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const res = await fetch(apiUrl(`/api/bank-accounts/${id}`), {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}

export async function deleteBankAccount(id: string): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const res = await fetch(apiUrl(`/api/bank-accounts/${id}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function transferBetweenAccounts(fromId: string, toId: string, amountCents: number): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error("Não autenticado.");
  const res = await fetch(apiUrl("/api/bank-accounts/transfer"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fromId, toId, amountCents }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Erro ${res.status}`);
  }
}
