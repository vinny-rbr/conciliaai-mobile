import { apiUrl } from "./api";
import { getToken } from "./auth";

// ── Types ──────────────────────────────────────────────────────────────
export type GroupDto = {
  id: string;
  name: string;
  ownerUserId?: string;
  createdAtUtc?: string;
  isArchived?: boolean;
};

export type GroupMember = {
  id: string;
  groupId: string;
  userId: string;
  role: string;
  defaultSharePercent?: number | null;
  salaryCents?: number;
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
};

export type GroupMembersResponse = {
  groupId: string;
  groupName: string;
  ownerUserId: string;
  members: GroupMember[];
};

export type GroupExpenseParticipant = {
  userId: string;
  name: string;
  email: string;
  shareCents: number;
  isExcluded: boolean;
};

export type GroupExpense = {
  id: string;
  groupId: string;
  description: string;
  amountCents: number;
  date: string;
  paidByUserId: string;
  paidByName: string;
  paidByEmail: string;
  createdAtUtc: string;
  participants: GroupExpenseParticipant[];
};

export type GroupExpensesResponse = {
  groupId: string;
  totalCount: number;
  items: GroupExpense[];
};

export type GroupMemberBalance = {
  userId: string;
  name: string;
  email: string;
  totalPaidCents: number;
  totalOwesCents: number;
  settlementsSentCents: number;
  settlementsReceivedCents: number;
  balanceCents: number;
};

export type GroupBalancesResponse = {
  groupId: string;
  asOfUtcDate: string;
  consideredExpensesCount: number;
  members: GroupMemberBalance[];
};

// ── Helpers ────────────────────────────────────────────────────────────
async function authHeader(): Promise<Record<string, string>> {
  const token = await getToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

async function apiErr(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    if (!text || text.includes("<html")) return fallback;
    const j = JSON.parse(text) as { message?: string; error?: string };
    return j.message ?? j.error ?? fallback;
  } catch { return fallback; }
}

// ── API calls ──────────────────────────────────────────────────────────
export async function listGroups(): Promise<GroupDto[]> {
  const h = await authHeader();
  const r = await fetch(apiUrl("/api/groups"), { headers: h });
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao buscar grupos."));
  return r.json() as Promise<GroupDto[]>;
}

export async function createGroup(name: string): Promise<GroupDto> {
  const h = await authHeader();
  const r = await fetch(apiUrl("/api/groups"), {
    method: "POST", headers: h, body: JSON.stringify({ name }),
  });
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao criar grupo."));
  return r.json() as Promise<GroupDto>;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const h = await authHeader();
  let r = await fetch(apiUrl(`/api/groups/${groupId}`), { method: "DELETE", headers: h });
  if (r.status === 404) {
    r = await fetch(apiUrl(`/api/groups/${groupId}/archive`), { method: "PATCH", headers: h });
  }
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao excluir grupo."));
}

export async function fetchMembers(groupId: string): Promise<GroupMembersResponse> {
  const h = await authHeader();
  const r = await fetch(apiUrl(`/api/groups/${groupId}/members`), { headers: h });
  if (r.status === 404) return { groupId, groupName: "", ownerUserId: "", members: [] };
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao buscar membros."));
  return r.json() as Promise<GroupMembersResponse>;
}

export async function addMember(groupId: string, email: string): Promise<void> {
  const h = await authHeader();
  const r = await fetch(apiUrl(`/api/groups/${groupId}/members`), {
    method: "POST", headers: h, body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao adicionar membro."));
}

export async function removeMember(groupId: string, memberId: string): Promise<void> {
  const h = await authHeader();
  const r = await fetch(apiUrl(`/api/groups/${groupId}/members/${memberId}`), {
    method: "DELETE", headers: h,
  });
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao remover membro."));
}

export async function fetchExpenses(groupId: string): Promise<GroupExpensesResponse> {
  const h = await authHeader();
  const r = await fetch(apiUrl(`/api/GroupExpenses/group/${groupId}`), { headers: h });
  if (r.status === 404) return { groupId, totalCount: 0, items: [] };
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao buscar despesas."));
  return r.json() as Promise<GroupExpensesResponse>;
}

export async function fetchBalances(groupId: string): Promise<GroupBalancesResponse> {
  const h = await authHeader();
  const r = await fetch(apiUrl(`/api/GroupExpenses/group/${groupId}/balances`), { headers: h });
  if (r.status === 404) return { groupId, asOfUtcDate: new Date().toISOString(), consideredExpensesCount: 0, members: [] };
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao buscar saldos."));
  return r.json() as Promise<GroupBalancesResponse>;
}

export type ExpenseParticipantInput = {
  userId: string; shareCents: number; isExcluded: boolean;
};

export async function createExpense(payload: {
  groupId: string; description: string; amountCents: number;
  date: string; paidByUserId: string;
  participants?: ExpenseParticipantInput[];
}): Promise<void> {
  const h = await authHeader();
  const r = await fetch(apiUrl("/api/GroupExpenses"), {
    method: "POST", headers: h, body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao criar despesa."));
}

export async function updateExpense(expenseId: string, payload: {
  description: string; amountCents: number; date: string; paidByUserId: string;
  participants?: ExpenseParticipantInput[];
}): Promise<void> {
  const h = await authHeader();
  const r = await fetch(apiUrl(`/api/GroupExpenses/${expenseId}`), {
    method: "PUT", headers: h, body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao atualizar despesa."));
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const h = await authHeader();
  const r = await fetch(apiUrl(`/api/GroupExpenses/${expenseId}`), {
    method: "DELETE", headers: h,
  });
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao excluir despesa."));
}

export async function recordSettlement(groupId: string, payload: {
  fromUserId: string; toUserId: string; amountCents: number; date: string;
}): Promise<void> {
  const h = await authHeader();
  // Try primary endpoint first, fall back to alternate
  const r = await fetch(apiUrl("/api/GroupExpenses/settlement"), {
    method: "POST", headers: h, body: JSON.stringify({ ...payload, groupId }),
  });
  if (!r.ok) {
    const r2 = await fetch(apiUrl(`/api/groups/${groupId}/settlements`), {
      method: "POST", headers: h, body: JSON.stringify(payload),
    });
    if (!r2.ok) throw new Error(await apiErr(r2, "Erro ao registrar acerto."));
  }
}

export async function createPersonalExpense(payload: {
  title: string; amountCents: number; date: string; category?: string; accountId?: string;
}): Promise<{ id: string }> {
  const h = await authHeader();
  const r = await fetch(apiUrl("/api/finance"), {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      type: "DESPESA",
      title: payload.title,
      category: payload.category ?? "Transferências",
      amountCents: payload.amountCents,
      date: payload.date,
      paymentType: "transfer",
      status: "paid",
      ...(payload.accountId ? { accountId: payload.accountId } : {}),
    }),
  });
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao criar lançamento pessoal."));
  const json = await r.json() as { id: string };
  return json;
}

export async function fetchPersonalExpenseAmount(expenseId: string): Promise<number | null> {
  const h = await authHeader();
  const r = await fetch(apiUrl(`/api/finance/${encodeURIComponent(expenseId)}`), { headers: h });
  if (!r.ok) return null;
  const json = await r.json() as { amountCents?: number; amount_cents?: number };
  const amt = json.amountCents ?? json.amount_cents;
  return typeof amt === "number" ? amt : null;
}

export async function deletePersonalExpense(expenseId: string): Promise<void> {
  const h = await authHeader();
  const r = await fetch(apiUrl(`/api/finance/${encodeURIComponent(expenseId)}`), { method: "DELETE", headers: h });
  if (r.status === 404) return; // already gone — treat as success
  if (!r.ok) throw new Error(await apiErr(r, "Erro ao estornar lançamento."));
}

export async function cleanupLegacyExpenseType(): Promise<number> {
  const h = await authHeader();
  const r = await fetch(apiUrl("/api/finance"), { headers: h });
  if (!r.ok) return 0;
  const raw = await r.json() as unknown;
  const items: Array<{ id: string; type: string }> = Array.isArray(raw)
    ? (raw as Array<{ id: string; type: string }>)
    : ((raw as { data?: unknown; items?: unknown }).data ?? (raw as { items?: unknown }).items ?? []) as Array<{ id: string; type: string }>;
  const stale = items.filter(it => it.type === "expense" || it.type === "income");
  await Promise.all(stale.map(it =>
    fetch(apiUrl(`/api/finance/${encodeURIComponent(it.id)}`), { method: "DELETE", headers: h }).catch(() => {})
  ));
  return stale.length;
}
