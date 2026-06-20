import { apiUrl } from "./api";
import { getToken } from "./auth";
import type { CreditCard, CreateCreditCard, CreditCardTransaction, AddExpenseData } from "../types/creditCard";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export async function listCreditCards(): Promise<CreditCard[]> {
  const h = await authHeaders();
  const res = await fetch(apiUrl("/api/credit-cards"), { headers: h });
  if (!res.ok) return [];
  return res.json() as Promise<CreditCard[]>;
}

export async function createCreditCard(data: CreateCreditCard): Promise<CreditCard> {
  const h = await authHeaders();
  const res = await fetch(apiUrl("/api/credit-cards"), {
    method: "POST", headers: h, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao criar cartão.");
  return res.json() as Promise<CreditCard>;
}

export async function listCardTransactions(cardId: string): Promise<CreditCardTransaction[]> {
  const h = await authHeaders();
  const res = await fetch(apiUrl(`/api/credit-cards/${cardId}/transactions`), { headers: h });
  if (!res.ok) return [];
  return res.json() as Promise<CreditCardTransaction[]>;
}

export async function addCardExpense(cardId: string, data: AddExpenseData): Promise<void> {
  const h = await authHeaders();
  const res = await fetch(apiUrl(`/api/credit-cards/${cardId}/expense`), {
    method: "POST", headers: h, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao lançar gasto.");
}

export async function updateCreditCard(id: string, data: {
  nick?: string; limitCents?: number; closingDay?: number; dueDay?: number; bestDay?: number; face?: string | null;
}): Promise<CreditCard> {
  const h = await authHeaders();
  const res = await fetch(apiUrl(`/api/credit-cards/${id}`), {
    method: "PUT", headers: h, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao atualizar cartão.");
  return res.json() as Promise<CreditCard>;
}

export async function deleteCreditCard(id: string): Promise<void> {
  const h = await authHeaders();
  const res = await fetch(apiUrl(`/api/credit-cards/${id}`), {
    method: "DELETE", headers: h,
  });
  if (!res.ok) throw new Error("Erro ao excluir cartão.");
}

export async function payCardInvoice(
  cardId: string,
  amountCents: number,
  fromAccountId?: string,
): Promise<void> {
  const h = await authHeaders();
  const res = await fetch(apiUrl(`/api/credit-cards/${cardId}/pay`), {
    method: "POST",
    headers: h,
    body: JSON.stringify({ amountCents, ...(fromAccountId ? { fromAccountId } : {}) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? "Erro ao pagar fatura.");
  }
}
