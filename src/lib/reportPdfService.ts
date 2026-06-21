import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { FinanceItem, BankAccount } from "../types/finance";

// ── helpers ───────────────────────────────────────────────────────────────────

const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PAY_LABELS: Record<string, string> = {
  pix: "Pix", debit: "Débito", credit: "Crédito",
  cash: "Dinheiro", transfer: "TED/DOC", boleto: "Boleto",
};
const REPORT_TITLES: Record<string, string> = {
  "entradas-saidas":     "Entradas e Saídas",
  "gastos-categoria":    "Gastos por Categoria",
  "maiores-gastos":      "Maiores Gastos",
  "fluxo-caixa":         "Fluxo de Caixa",
  "por-conta":           "Por Conta / Carteira",
  "por-cartao":          "Por Cartão de Crédito",
  "comparativo-meses":   "Comparativo entre Meses",
  "orcamento-realizado": "Orçamento × Realizado",
  "dre":                 "DRE Simplificado",
  "por-grupo":           "Por Grupo (Semanal)",
  "relatorio-anual":     "Relatório Anual",
  "extrato-contador":    "Extrato para o Contador",
};

function isoToMonthKey(iso: string) { return iso.slice(0, 7); }
function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS_PT[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}
function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string) {
  return iso.slice(0, 10).split("-").reverse().join("/");
}
function signColor(v: number) {
  return v >= 0 ? "#16a34a" : "#dc2626";
}
function signStr(v: number) {
  return (v >= 0 ? "+" : "") + fmt(v);
}

// ── CSS base ──────────────────────────────────────────────────────────────────

const BASE_CSS = `
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,Arial,sans-serif; background:#f8fafc; color:#0f172a; padding:32px; font-size:13px; }
h1  { font-size:22px; font-weight:800; margin-bottom:2px; }
.sub { font-size:12px; color:#64748b; margin-bottom:24px; }
.cards { display:flex; gap:10px; margin-bottom:14px; }
.card  { flex:1; background:#fff; border-radius:12px; padding:14px; border:1px solid #e2e8f0; }
.lbl  { font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
.big  { font-size:26px; font-weight:900; }
.val  { font-size:16px; font-weight:800; }
.sec  { font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin:18px 0 8px; }
table { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; margin-bottom:12px; }
th { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; padding:9px 12px; text-align:left; background:#f8fafc; border-bottom:1px solid #e2e8f0; }
td { padding:10px 12px; border-bottom:1px solid #f1f5f9; color:#0f172a; }
tr:last-child td { border-bottom:none; }
.r  { text-align:right; }
.c  { text-align:center; }
.g  { color:#16a34a; font-weight:700; }
.rd { color:#dc2626; font-weight:700; }
.bl { color:#2563eb; font-weight:700; }
.gr { color:#64748b; }
.pct-bar { display:inline-block; height:8px; border-radius:4px; min-width:2px; vertical-align:middle; }
.footer { margin-top:32px; font-size:11px; color:#94a3b8; text-align:center; border-top:1px solid #e2e8f0; padding-top:12px; }
`;

function wrapHtml(title: string, period: string, body: string): string {
  const now = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" });
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title}</title>
<style>${BASE_CSS}</style></head>
<body>
<h1>${title}</h1>
<p class="sub">Período: ${period} &nbsp;·&nbsp; Gerado em ${now}</p>
${body}
<div class="footer">ConciliaAI &nbsp;·&nbsp; ${title} &nbsp;·&nbsp; ${now}</div>
</body></html>`;
}

// ── per-type builders ─────────────────────────────────────────────────────────

function buildEntradasSaidas(items: FinanceItem[], months: string[]): string {
  const filtered = items.filter(i => months.includes(isoToMonthKey(i.dateISO)));
  const rec  = filtered.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const desp = filtered.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const sal  = rec - desp;

  const rows = months.map(ym => {
    const mo = filtered.filter(i => isoToMonthKey(i.dateISO) === ym);
    const r = mo.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const d = mo.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    return `<tr><td>${monthLabel(ym)}</td><td class="r g">${fmt(r)}</td><td class="r rd">${fmt(d)}</td><td class="r" style="color:${signColor(r-d)};font-weight:700">${signStr(r-d)}</td><td class="r gr">${mo.length}</td></tr>`;
  }).reverse().join("");

  return `
<div class="cards">
  <div class="card"><div class="lbl">Receitas</div><div class="big g">${fmt(rec)}</div></div>
  <div class="card"><div class="lbl">Despesas</div><div class="big rd">${fmt(desp)}</div></div>
  <div class="card"><div class="lbl">Saldo</div><div class="big" style="color:${signColor(sal)}">${signStr(sal)}</div></div>
</div>
<p class="sec">Mês a mês</p>
<table><thead><tr><th>Mês</th><th class="r">Receitas</th><th class="r">Despesas</th><th class="r">Saldo</th><th class="r">Lançamentos</th></tr></thead>
<tbody>${rows}</tbody></table>`;
}

function buildGastosCat(items: FinanceItem[], months: string[]): string {
  const desp = items.filter(i => months.includes(isoToMonthKey(i.dateISO)) && i.type === "DESPESA");
  const total = desp.reduce((s, i) => s + i.amountCents, 0);
  const catMap: Record<string, number> = {};
  desp.forEach(i => { const c = i.category || "Outros"; catMap[c] = (catMap[c] ?? 0) + i.amountCents; });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const rows = cats.map(([name, val]) => {
    const pct = total > 0 ? Math.round(val / total * 100) : 0;
    const barW = Math.max(pct, 1);
    return `<tr><td>${name}</td><td class="r rd">${fmt(val)}</td><td class="r">${pct}%</td><td><span class="pct-bar" style="width:${barW}%;background:#dc2626;opacity:.6"></span></td></tr>`;
  }).join("");

  return `
<div class="cards">
  <div class="card"><div class="lbl">Total gasto</div><div class="big rd">${fmt(total)}</div></div>
  <div class="card"><div class="lbl">Despesas</div><div class="val">${desp.length}</div></div>
  <div class="card"><div class="lbl">Categorias</div><div class="val">${cats.length}</div></div>
</div>
<p class="sec">Por categoria</p>
<table><thead><tr><th>Categoria</th><th class="r">Valor</th><th class="r">%</th><th>Proporção</th></tr></thead>
<tbody>${rows}</tbody></table>`;
}

function buildMaioresGastos(items: FinanceItem[], months: string[]): string {
  const desp = items.filter(i => months.includes(isoToMonthKey(i.dateISO)) && i.type === "DESPESA")
    .sort((a, b) => b.amountCents - a.amountCents).slice(0, 20);
  const total = desp.reduce((s, i) => s + i.amountCents, 0);

  const rows = desp.map((it, idx) => `
    <tr>
      <td class="c gr">${idx + 1}</td>
      <td>${it.title}</td>
      <td class="gr">${it.category}</td>
      <td class="gr">${fmtDate(it.dateISO)}</td>
      <td class="r rd">${fmt(it.amountCents)}</td>
    </tr>`).join("");

  return `
<div class="cards">
  <div class="card"><div class="lbl">Total (top ${desp.length})</div><div class="big rd">${fmt(total)}</div></div>
  <div class="card"><div class="lbl">Quantidade</div><div class="val">${desp.length}</div></div>
</div>
<p class="sec">Top ${desp.length} maiores despesas</p>
<table><thead><tr><th class="c">#</th><th>Descrição</th><th>Categoria</th><th>Data</th><th class="r">Valor</th></tr></thead>
<tbody>${rows}</tbody></table>`;
}

function buildFluxoCaixa(items: FinanceItem[], months: string[]): string {
  let cum = 0;
  const rows = months.map(ym => {
    const mo  = items.filter(i => isoToMonthKey(i.dateISO) === ym);
    const rec = mo.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const des = mo.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    const sal = rec - des;
    cum += sal;
    return `<tr>
      <td>${monthLabel(ym)}</td>
      <td class="r g">${fmt(rec)}</td>
      <td class="r rd">${fmt(des)}</td>
      <td class="r" style="color:${signColor(sal)};font-weight:700">${signStr(sal)}</td>
      <td class="r" style="color:${signColor(cum)};font-weight:700">${signStr(cum)}</td>
    </tr>`;
  }).join("");

  const totalRec = items.filter(i => months.includes(isoToMonthKey(i.dateISO)) && i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const totalDes = items.filter(i => months.includes(isoToMonthKey(i.dateISO)) && i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);

  return `
<div class="cards">
  <div class="card"><div class="lbl">Total Receitas</div><div class="big g">${fmt(totalRec)}</div></div>
  <div class="card"><div class="lbl">Total Despesas</div><div class="big rd">${fmt(totalDes)}</div></div>
  <div class="card"><div class="lbl">Saldo Acumulado</div><div class="big" style="color:${signColor(cum)}">${signStr(cum)}</div></div>
</div>
<p class="sec">Mês a mês</p>
<table><thead><tr><th>Mês</th><th class="r">Receitas</th><th class="r">Despesas</th><th class="r">Saldo Mês</th><th class="r">Acumulado</th></tr></thead>
<tbody>${rows}</tbody></table>`;
}

function buildPorConta(items: FinanceItem[], months: string[], accounts: BankAccount[]): string {
  const filtered = items.filter(i => months.includes(isoToMonthKey(i.dateISO)));
  const rows = accounts.map(acc => {
    const ai  = filtered.filter(i => i.accountId === acc.id);
    const rec = ai.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const des = ai.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    return `<tr>
      <td>${acc.nick || acc.bank}</td>
      <td class="gr">${acc.bank}</td>
      <td class="r bl">${fmt(acc.balanceCents)}</td>
      <td class="r g">${fmt(rec)}</td>
      <td class="r rd">${fmt(des)}</td>
      <td class="r">${ai.length}</td>
    </tr>`;
  }).join("");

  return `
<p class="sec">Contas</p>
<table><thead><tr><th>Conta</th><th>Banco</th><th class="r">Saldo atual</th><th class="r">Entradas</th><th class="r">Saídas</th><th class="r">Lançamentos</th></tr></thead>
<tbody>${rows.length ? rows : '<tr><td colspan="6" class="c gr">Nenhuma conta cadastrada.</td></tr>'}</tbody></table>`;
}

function buildPorCartao(items: FinanceItem[], months: string[], accounts: BankAccount[]): string {
  const cartoes  = accounts.filter(a => a.accountType === "credito");
  const filtered = items.filter(i => months.includes(isoToMonthKey(i.dateISO)) && i.type === "DESPESA");

  if (!cartoes.length) return `<p class="gr" style="text-align:center;padding:32px">Nenhum cartão de crédito cadastrado.</p>`;

  const sections = cartoes.map(acc => {
    const ai  = filtered.filter(i => i.accountId === acc.id);
    const tot = ai.reduce((s, i) => s + i.amountCents, 0);
    const catMap: Record<string, number> = {};
    ai.forEach(i => { const c = i.category || "Outros"; catMap[c] = (catMap[c] ?? 0) + i.amountCents; });
    const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const catRows = cats.map(([n, v]) => `<tr><td>${n}</td><td class="r rd">${fmt(v)}</td><td class="r gr">${tot > 0 ? Math.round(v/tot*100) : 0}%</td></tr>`).join("");
    return `
<p class="sec">${acc.nick || acc.bank} •••• ${acc.last4 || "----"} — <span class="rd">${fmt(tot)}</span></p>
<table><thead><tr><th>Categoria</th><th class="r">Valor</th><th class="r">%</th></tr></thead>
<tbody>${catRows || `<tr><td colspan="3" class="c gr">Sem gastos no período.</td></tr>`}</tbody></table>`;
  }).join("");

  return sections;
}

function buildComparativo(items: FinanceItem[]): string {
  const available = Array.from(new Set(items.map(i => isoToMonthKey(i.dateISO)))).sort().reverse().slice(0, 12);
  const ma = available[1] ?? available[0] ?? "";
  const mb = available[0] ?? "";

  function stats(ym: string) {
    const mi  = items.filter(i => isoToMonthKey(i.dateISO) === ym);
    const rec = mi.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const des = mi.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    const catMap: Record<string, number> = {};
    mi.filter(i => i.type === "DESPESA").forEach(i => { const c = i.category || "Outros"; catMap[c] = (catMap[c] ?? 0) + i.amountCents; });
    return { rec, des, sal: rec - des, cats: Object.entries(catMap).sort((a, b) => b[1] - a[1]) };
  }

  const sA = stats(ma), sB = stats(mb);
  const allCats = Array.from(new Set([...sA.cats.map(c => c[0]), ...sB.cats.map(c => c[0])]));

  const catRows = allCats.map(cat => {
    const vA = sA.cats.find(c => c[0] === cat)?.[1] ?? 0;
    const vB = sB.cats.find(c => c[0] === cat)?.[1] ?? 0;
    const diff = vB - vA;
    return `<tr>
      <td>${cat}</td>
      <td class="r">${vA ? fmt(vA) : "—"}</td>
      <td class="r">${vB ? fmt(vB) : "—"}</td>
      <td class="r" style="color:${diff > 0 ? "#dc2626" : diff < 0 ? "#16a34a" : "#64748b"};font-weight:700">${diff !== 0 ? (diff > 0 ? "▲ " : "▼ ") + fmt(Math.abs(diff)) : "="}</td>
    </tr>`;
  }).join("");

  return `
<div class="cards">
  <div class="card" style="border-color:#bfdbfe"><div class="lbl">${monthLabel(ma)}</div>
    <div style="margin-top:4px"><span class="g">${fmt(sA.rec)}</span> / <span class="rd">${fmt(sA.des)}</span></div>
    <div class="val" style="color:${signColor(sA.sal)};margin-top:4px">${signStr(sA.sal)}</div>
  </div>
  <div class="card" style="border-color:#ddd6fe"><div class="lbl">${monthLabel(mb)}</div>
    <div style="margin-top:4px"><span class="g">${fmt(sB.rec)}</span> / <span class="rd">${fmt(sB.des)}</span></div>
    <div class="val" style="color:${signColor(sB.sal)};margin-top:4px">${signStr(sB.sal)}</div>
  </div>
</div>
<p class="sec">Categorias comparadas</p>
<table><thead><tr><th>Categoria</th><th class="r">${monthLabel(ma)}</th><th class="r">${monthLabel(mb)}</th><th class="r">Diferença</th></tr></thead>
<tbody>${catRows || `<tr><td colspan="4" class="c gr">Sem dados para comparar.</td></tr>`}</tbody></table>`;
}

function buildOrcamento(items: FinanceItem[], months: string[]): string {
  const filtered  = items.filter(i => months.includes(isoToMonthKey(i.dateISO)));
  const totalRec  = filtered.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const totalDesp = filtered.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const taxaPoupa = totalRec > 0 ? Math.max(0, (totalRec - totalDesp) / totalRec) : 0;
  const taxaPct   = Math.round(taxaPoupa * 100);

  const catMap: Record<string, number> = {};
  filtered.filter(i => i.type === "DESPESA").forEach(i => { const c = i.category || "Outros"; catMap[c] = (catMap[c] ?? 0) + i.amountCents; });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const rows = cats.map(([cat, val]) => {
    const pctRenda = totalRec > 0 ? val / totalRec : 0;
    const pctPct   = Math.round(pctRenda * 100);
    const status   = pctRenda < 0.10 ? "✓ Dentro do ideal" : pctRenda < 0.25 ? "⚠ Moderado" : "⚠ Alto";
    const col      = pctRenda < 0.10 ? "#16a34a" : pctRenda < 0.25 ? "#d97706" : "#dc2626";
    return `<tr><td>${cat}</td><td class="r rd">${fmt(val)}</td><td class="r" style="color:${col};font-weight:700">${pctPct}%</td><td style="color:${col}">${status}</td></tr>`;
  }).join("");

  const taxaColor = taxaPoupa >= 0.2 ? "#16a34a" : taxaPoupa >= 0.1 ? "#d97706" : "#dc2626";
  const taxaMsg   = taxaPoupa >= 0.2 ? "Excelente! Acima de 20% ✓" : taxaPoupa >= 0.1 ? "Razoável — meta: 20%" : "Atenção: abaixo do ideal";

  return `
<div class="cards">
  <div class="card" style="text-align:center"><div class="lbl">Taxa de poupança</div><div class="big" style="color:${taxaColor}">${taxaPct}%</div><div class="gr" style="font-size:11px;margin-top:4px">${taxaMsg}</div></div>
  <div class="card"><div class="lbl">Receitas</div><div class="val g">${fmt(totalRec)}</div></div>
  <div class="card"><div class="lbl">Despesas</div><div class="val rd">${fmt(totalDesp)}</div></div>
</div>
<p class="sec">Gastos por categoria (% da renda)</p>
<table><thead><tr><th>Categoria</th><th class="r">Valor</th><th class="r">% Renda</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="sec">Regra 50-30-20</p>
<table><thead><tr><th>Categoria</th><th class="r">Sugerido</th></tr></thead>
<tbody>
  <tr><td>Necessidades (50%)</td><td class="r bl">${fmt(Math.round(totalRec * 0.5))}</td></tr>
  <tr><td>Desejos (30%)</td><td class="r" style="color:#7c3aed;font-weight:700">${fmt(Math.round(totalRec * 0.3))}</td></tr>
  <tr><td>Poupança (20%)</td><td class="r g">${fmt(Math.round(totalRec * 0.2))}</td></tr>
</tbody></table>`;
}

function buildDre(items: FinanceItem[], months: string[]): string {
  const filtered  = items.filter(i => months.includes(isoToMonthKey(i.dateISO)));
  const totalRec  = filtered.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const totalDesp = filtered.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const resultado = totalRec - totalDesp;
  const margem    = totalRec > 0 ? Math.round(resultado / totalRec * 100) : 0;

  const catRec:  Record<string, number> = {};
  const catDesp: Record<string, number> = {};
  filtered.filter(i => i.type === "RECEITA").forEach(i => { const c = i.category || "Outros"; catRec[c]  = (catRec[c]  ?? 0) + i.amountCents; });
  filtered.filter(i => i.type === "DESPESA").forEach(i => { const c = i.category || "Outros"; catDesp[c] = (catDesp[c] ?? 0) + i.amountCents; });

  const recRows  = Object.entries(catRec).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<tr><td style="padding-left:24px">${c}</td><td class="r g">${fmt(v)}</td></tr>`).join("");
  const despRows = Object.entries(catDesp).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<tr><td style="padding-left:24px">${c}</td><td class="r rd">(${fmt(v)})</td></tr>`).join("");

  const byMonth = months.map(ym => {
    const mo  = filtered.filter(i => isoToMonthKey(i.dateISO) === ym);
    const rec = mo.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const des = mo.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    return `<tr><td>${monthLabel(ym)}</td><td class="r g">${fmt(rec)}</td><td class="r rd">(${fmt(des)})</td><td class="r" style="color:${signColor(rec-des)};font-weight:700">${signStr(rec-des)}</td></tr>`;
  }).reverse().join("");

  return `
<div class="cards">
  <div class="card"><div class="lbl">Margem</div><div class="big" style="color:${signColor(resultado)}">${margem}%</div></div>
  <div class="card"><div class="lbl">Receitas</div><div class="val g">${fmt(totalRec)}</div></div>
  <div class="card"><div class="lbl">Despesas</div><div class="val rd">${fmt(totalDesp)}</div></div>
</div>
<p class="sec">Demonstrativo de Resultado</p>
<table>
<thead><tr><th>Conta</th><th class="r">Valor</th></tr></thead>
<tbody>
<tr style="background:#f0fdf4"><td><strong>(+) RECEITAS</strong></td><td class="r g"><strong>${fmt(totalRec)}</strong></td></tr>
${recRows}
<tr style="background:#fef2f2"><td><strong>(−) DESPESAS</strong></td><td class="r rd"><strong>(${fmt(totalDesp)})</strong></td></tr>
${despRows}
<tr style="background:#f8fafc;border-top:2px solid #0f172a"><td><strong>(=) RESULTADO LÍQUIDO</strong></td><td class="r" style="color:${signColor(resultado)};font-weight:900;font-size:16px">${signStr(resultado)}</td></tr>
</tbody></table>
<p class="sec">DRE por mês</p>
<table><thead><tr><th>Mês</th><th class="r">Receitas</th><th class="r">Despesas</th><th class="r">Resultado</th></tr></thead>
<tbody>${byMonth}</tbody></table>`;
}

function buildPorGrupo(items: FinanceItem[], months: string[]): string {
  const filtered = items.filter(i => months.includes(isoToMonthKey(i.dateISO)) && i.type === "DESPESA");

  function weekKey(iso: string) {
    const d   = new Date(iso);
    const day = d.getDay() === 0 ? 7 : d.getDay();
    const thu = new Date(d); thu.setDate(d.getDate() + 4 - day);
    const y   = thu.getFullYear();
    const jan = new Date(y, 0, 1);
    const wk  = Math.ceil(((thu.getTime() - jan.getTime()) / 86400000 + 1) / 7);
    const [yr, mo, da] = iso.split("-");
    return `${yr}/${String(wk).padStart(2,"0")} — semana de ${da}/${mo}`;
  }

  const weekMap: Record<string, { items: FinanceItem[]; total: number }> = {};
  filtered.forEach(i => {
    const k = weekKey(i.dateISO);
    if (!weekMap[k]) weekMap[k] = { items: [], total: 0 };
    weekMap[k].items.push(i);
    weekMap[k].total += i.amountCents;
  });
  const weeks       = Object.entries(weekMap).sort((a, b) => b[0].localeCompare(a[0]));
  const totalPeriod = filtered.reduce((s, i) => s + i.amountCents, 0);
  const mediaWeek   = weeks.length > 0 ? Math.round(totalPeriod / weeks.length) : 0;

  const rows = weeks.map(([wk, data]) => {
    const titles = data.items.slice(0, 3).map(i => i.title).join(", ") + (data.items.length > 3 ? ` +${data.items.length - 3}` : "");
    return `<tr><td>${wk.split("—")[1]?.trim() ?? wk}</td><td class="r rd">${fmt(data.total)}</td><td class="r gr">${data.items.length}</td><td class="gr">${titles}</td></tr>`;
  }).join("");

  return `
<div class="cards">
  <div class="card"><div class="lbl">Semanas</div><div class="val">${weeks.length}</div></div>
  <div class="card"><div class="lbl">Total período</div><div class="val rd">${fmt(totalPeriod)}</div></div>
  <div class="card"><div class="lbl">Média/semana</div><div class="val rd">${fmt(mediaWeek)}</div></div>
</div>
<p class="sec">Gastos por semana</p>
<table><thead><tr><th>Semana</th><th class="r">Total</th><th class="r">Itens</th><th>Principais</th></tr></thead>
<tbody>${rows || `<tr><td colspan="4" class="c gr">Sem despesas no período.</td></tr>`}</tbody></table>`;
}

function buildAnual(items: FinanceItem[]): string {
  const year      = new Date().getFullYear();
  const yearItems = items.filter(i => i.dateISO.startsWith(String(year)));
  const totalRec  = yearItems.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const totalDesp = yearItems.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const saldo     = totalRec - totalDesp;

  const rows = Array.from({ length: 12 }, (_, idx) => {
    const ym  = `${year}-${String(idx + 1).padStart(2, "0")}`;
    const mo  = yearItems.filter(i => isoToMonthKey(i.dateISO) === ym);
    const rec = mo.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const des = mo.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    const sal = rec - des;
    if (mo.length === 0) return "";
    return `<tr><td>${MONTHS_PT[idx]}</td><td class="r g">${fmt(rec)}</td><td class="r rd">${fmt(des)}</td><td class="r" style="color:${signColor(sal)};font-weight:700">${signStr(sal)}</td><td class="r gr">${mo.length}</td></tr>`;
  }).join("");

  return `
<div class="cards">
  <div class="card"><div class="lbl">Receitas ${year}</div><div class="big g">${fmt(totalRec)}</div><div class="gr" style="font-size:11px">~${fmt(Math.round(totalRec/12))}/mês</div></div>
  <div class="card"><div class="lbl">Despesas ${year}</div><div class="big rd">${fmt(totalDesp)}</div><div class="gr" style="font-size:11px">~${fmt(Math.round(totalDesp/12))}/mês</div></div>
  <div class="card"><div class="lbl">Resultado ${year}</div><div class="big" style="color:${signColor(saldo)}">${signStr(saldo)}</div></div>
</div>
<p class="sec">Meses de ${year}</p>
<table><thead><tr><th>Mês</th><th class="r">Receitas</th><th class="r">Despesas</th><th class="r">Saldo</th><th class="r">Lançamentos</th></tr></thead>
<tbody>${rows || `<tr><td colspan="5" class="c gr">Sem lançamentos em ${year}.</td></tr>`}</tbody></table>`;
}

function buildExtrato(items: FinanceItem[], months: string[]): string {
  const filtered  = items.filter(i => months.includes(isoToMonthKey(i.dateISO))).sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  const totalRec  = filtered.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const totalDesp = filtered.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);

  const monthGroups: { ym: string; items: FinanceItem[] }[] = [];
  filtered.forEach(i => {
    const ym = isoToMonthKey(i.dateISO);
    const g  = monthGroups.find(g => g.ym === ym);
    if (g) g.items.push(i);
    else monthGroups.push({ ym, items: [i] });
  });

  const groups = monthGroups.map(group => {
    const gRec  = group.items.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const gDesp = group.items.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    const rows  = group.items.map(it => `<tr>
      <td>${fmtDate(it.dateISO)}</td>
      <td>${it.title}</td>
      <td class="gr">${it.category}</td>
      <td class="gr">${PAY_LABELS[it.paymentType] ?? it.paymentType}</td>
      <td class="r" style="color:${it.type === "RECEITA" ? "#16a34a" : "#dc2626"};font-weight:700">${it.type === "RECEITA" ? "+" : "-"}${fmt(it.amountCents)}</td>
    </tr>`).join("");

    return `<p class="sec">${monthLabel(group.ym)} &nbsp;·&nbsp; <span class="g">+${fmt(gRec)}</span> &nbsp; <span class="rd">-${fmt(gDesp)}</span></p>
<table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th class="r">Valor</th></tr></thead>
<tbody>${rows}</tbody></table>`;
  }).join("");

  return `
<div class="cards">
  <div class="card"><div class="lbl">Receitas</div><div class="val g">${fmt(totalRec)}</div></div>
  <div class="card"><div class="lbl">Despesas</div><div class="val rd">${fmt(totalDesp)}</div></div>
  <div class="card"><div class="lbl">Resultado</div><div class="val" style="color:${signColor(totalRec-totalDesp)}">${signStr(totalRec-totalDesp)}</div></div>
  <div class="card"><div class="lbl">Lançamentos</div><div class="val">${filtered.length}</div></div>
</div>
${groups || `<p class="gr" style="text-align:center;padding:32px">Sem lançamentos no período.</p>`}`;
}

// ── dispatch ──────────────────────────────────────────────────────────────────

function buildBody(type: string, items: FinanceItem[], accounts: BankAccount[], months: string[]): string {
  switch (type) {
    case "entradas-saidas":    return buildEntradasSaidas(items, months);
    case "gastos-categoria":   return buildGastosCat(items, months);
    case "maiores-gastos":     return buildMaioresGastos(items, months);
    case "fluxo-caixa":        return buildFluxoCaixa(items, months);
    case "por-conta":          return buildPorConta(items, months, accounts);
    case "por-cartao":         return buildPorCartao(items, months, accounts);
    case "comparativo-meses":  return buildComparativo(items);
    case "orcamento-realizado":return buildOrcamento(items, months);
    case "dre":                return buildDre(items, months);
    case "por-grupo":          return buildPorGrupo(items, months);
    case "relatorio-anual":    return buildAnual(items);
    case "extrato-contador":   return buildExtrato(items, months);
    default:                   return `<p class="gr">Relatório "${type}" não suporta exportação.</p>`;
  }
}

function periodLabel(months: string[]): string {
  if (!months.length) return "";
  if (months.length === 1) return monthLabel(months[0]);
  return `${monthLabel(months[0])} a ${monthLabel(months[months.length - 1])}`;
}

// ── public API ────────────────────────────────────────────────────────────────

export async function exportReportPdf(
  type: string,
  items: FinanceItem[],
  accounts: BankAccount[],
  months: string[],
): Promise<void> {
  const title  = REPORT_TITLES[type] ?? type;
  const period = type === "relatorio-anual"
    ? String(new Date().getFullYear())
    : periodLabel(months);

  const html = wrapHtml(title, period, buildBody(type, items, accounts, months));

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: `Exportar ${title}`,
    UTI: "com.adobe.pdf",
  });
}
