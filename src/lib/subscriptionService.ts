import { apiUrl } from "./api";
import { getToken } from "./auth";

// Erro marcador: usuário sem plano estourou o limite gratuito de lançamentos.
export class PlanLimitError extends Error {
  constructor(message = "Limite gratuito atingido.") {
    super(message);
    this.name = "PlanLimitError";
  }
}

// Verifica a resposta de um POST/PUT de lançamento. Se o backend devolveu o
// código de limite de plano, lança PlanLimitError; senão lança Error normal.
// Use no lugar do "if (!r.ok) throw new Error(...)" dos pontos de criação.
export async function throwFinanceError(res: Response): Promise<never> {
  const body = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
  if (res.status === 403 && body?.code === "PLAN_TRANSACTION_LIMIT_REACHED") {
    throw new PlanLimitError(body?.message ?? "Limite gratuito atingido.");
  }
  throw new Error(body?.message ?? `Erro ${res.status}`);
}

// Inicia o trial de 15 dias.
export async function startTrial(): Promise<{ ok: boolean; message?: string }> {
  try {
    const token = await getToken();
    const r = await fetch(apiUrl("/api/subscriptions/start-trial"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = (await r.json().catch(() => null)) as { message?: string } | null;
    return { ok: r.ok, message: body?.message };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha ao iniciar o trial." };
  }
}
