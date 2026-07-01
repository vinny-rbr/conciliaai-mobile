import { apiUrl } from "./api";
import { getToken } from "./auth";
import type { FinanceItem } from "../types/finance";

type ApiItem = {
  id: string;
  type: string;
  title: string;
  category: string;
  amount_cents?: number;
  amountCents?: number;
  date?: string;
  dateISO?: string;
  payment_type?: string;
  paymentType?: string;
  status: string;
  account_id?: string;
  accountId?: string;
  note?: string;
  recurringGroupId?: string;
  recurringKind?: string;
  recurringTotal?: number;
  recurringStartDate?: string;
};

function normalize(raw: ApiItem): FinanceItem {
  const dateRaw = raw.dateISO ?? raw.date ?? "";
  const dateISO = dateRaw.length >= 10 ? dateRaw.slice(0, 10) : dateRaw;
  const accountId = raw.accountId ?? raw.account_id;
  return {
    id: raw.id,
    type: raw.type as "RECEITA" | "DESPESA",
    title: raw.title,
    category: raw.category,
    amountCents: raw.amountCents ?? raw.amount_cents ?? 0,
    dateISO,
    paymentType: raw.paymentType ?? raw.payment_type ?? "",
    status: raw.status,
    ...(accountId ? { accountId } : {}),
    note: raw.note,
    ...(raw.recurringGroupId ? {
      recurringGroupId: raw.recurringGroupId,
      recurringKind: raw.recurringKind,
      recurringTotal: raw.recurringTotal,
      ...(raw.recurringStartDate ? { recurringStartDate: raw.recurringStartDate.slice(0, 10) } : {}),
    } : {}),
  };
}

export async function fetchFinanceItems(): Promise<FinanceItem[]> {
  const token = await getToken();
  if (!token) return [];

  const res = await fetch(apiUrl("/api/finance"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];

  const data = await res.json() as ApiItem[] | { data: ApiItem[] } | { items: ApiItem[] };
  const raw = Array.isArray(data) ? data : ("data" in data ? data.data : "items" in data ? data.items : []);
  return raw.map(normalize).sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

export async function deleteFinanceItem(id: string): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const res = await fetch(apiUrl(`/api/finance/${id}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok || res.status === 204;
}

export function fmt(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function currentMonthRange(): { from: string; to: string } {
  const d = new Date();
  const y = d.getFullYear(), m = d.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const to = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}
