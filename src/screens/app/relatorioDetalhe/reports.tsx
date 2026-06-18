import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { fmt } from "../../../lib/financeService";
import type { FinanceItem } from "../../../types/finance";
import type { BankAccount } from "../../../types/finance";
import {
  CAT_COLORS, PAY_LABELS, MONTHS_PT,
  isoToMonthKey, monthLabel, lastNMonths,
  AnimBar, HBar, SectionTitle,
  c, c2,
} from "./shared";

// ── Report: Entradas e saídas ─────────────────────────────────────────
export function EntradasSaidas({ items, months }: { items: FinanceItem[]; months: string[] }) {
  const filtered = items.filter(i => months.includes(isoToMonthKey(i.dateISO)));
  const totalRec  = filtered.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const totalDesp = filtered.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const saldo = totalRec - totalDesp;

  const byMonth = months.map(ym => {
    const mi = filtered.filter(i => isoToMonthKey(i.dateISO) === ym);
    return { ym, rec: mi.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0), desp: mi.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0) };
  });
  const maxBar = Math.max(...byMonth.map(m => Math.max(m.rec, m.desp)), 1);

  return (
    <View style={{ gap: 16 }}>
      {/* Totals */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[["Receitas", totalRec, "#22C55E"], ["Despesas", totalDesp, "#EF4444"]].map(([l, v, c]) => (
          <View key={l as string} style={[c2.card, { borderColor: (c as string) + "33" }]}>
            <Text style={c2.cardLabel}>{l as string}</Text>
            <Text style={[c2.cardVal, { color: c as string }]}>{fmt(v as number)}</Text>
          </View>
        ))}
      </View>

      <View style={[c2.balCard, { borderColor: saldo >= 0 ? "#22C55E44" : "#EF444444" }]}>
        <Text style={c2.balLabel}>Saldo do período</Text>
        <Text style={[c2.balVal, { color: saldo >= 0 ? "#4ADE80" : "#F87171" }]}>
          {saldo >= 0 ? "+" : ""}{fmt(saldo)}
        </Text>
        <Text style={c2.balSub}>{filtered.length} lançamentos</Text>
      </View>

      {/* Bar chart */}
      <SectionTitle title="Mês a mês" />
      <View style={{ flexDirection: "row", height: 140, gap: 4, alignItems: "flex-end" }}>
        {byMonth.map((m, i) => (
          <View key={m.ym} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View style={{ flex: 1, width: "100%", flexDirection: "row", gap: 2, alignItems: "flex-end" }}>
              <View style={{ flex: 1, flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <AnimBar ratio={m.rec / maxBar} color="#22C55E" delay={i * 60} />
              </View>
              <View style={{ flex: 1, flexDirection: "column", justifyContent: "flex-end", height: "100%" }}>
                <AnimBar ratio={m.desp / maxBar} color="#EF4444" delay={i * 60 + 30} />
              </View>
            </View>
            <Text style={{ color: "#475569", fontSize: 9, fontWeight: "700" }}>{monthLabel(m.ym)}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 16, justifyContent: "center" }}>
        {[["#22C55E","Receitas"],["#EF4444","Despesas"]].map(([col, lbl]) => (
          <View key={lbl} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col }} />
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* Month table */}
      <SectionTitle title="Detalhes por mês" />
      {[...byMonth].reverse().map(m => {
        const sal = m.rec - m.desp;
        return (
          <View key={m.ym} style={c2.monthRow}>
            <Text style={c2.monthName}>{monthLabel(m.ym)}</Text>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <HBar ratio={maxBar > 0 ? m.rec / maxBar : 0} color="#22C55E44" />
                <Text style={[c2.monthVal, { color: "#22C55E" }]}>{fmt(m.rec)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <HBar ratio={maxBar > 0 ? m.desp / maxBar : 0} color="#EF444444" />
                <Text style={[c2.monthVal, { color: "#EF4444" }]}>{fmt(m.desp)}</Text>
              </View>
            </View>
            <Text style={[c2.monthSaldo, { color: sal >= 0 ? "#4ADE80" : "#F87171" }]}>{sal >= 0 ? "+" : ""}{fmt(sal)}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Report: Gastos por categoria ──────────────────────────────────────
export function GastosCat({ items, months }: { items: FinanceItem[]; months: string[] }) {
  const despesas = items.filter(i => months.includes(isoToMonthKey(i.dateISO)) && i.type === "DESPESA");
  const total    = despesas.reduce((s, i) => s + i.amountCents, 0);
  const catMap: Record<string, number> = {};
  despesas.forEach(i => { catMap[i.category || "Outros"] = (catMap[i.category || "Outros"] ?? 0) + i.amountCents; });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  return (
    <View style={{ gap: 10 }}>
      <View style={[c2.balCard, { borderColor: "#EF444444" }]}>
        <Text style={c2.balLabel}>Total gasto</Text>
        <Text style={[c2.balVal, { color: "#EF4444" }]}>{fmt(total)}</Text>
        <Text style={c2.balSub}>{despesas.length} despesas · {cats.length} categorias</Text>
      </View>

      <SectionTitle title="Por categoria" />
      {cats.length === 0 && <Text style={c.empty}>Sem despesas no período.</Text>}
      {cats.map(([name, cents], i) => {
        const ratio = total > 0 ? cents / total : 0;
        const pct   = Math.round(ratio * 100);
        return (
          <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
            <Text style={{ color: "#CBD5E1", fontSize: 13, fontWeight: "600", width: 100 }} numberOfLines={1}>{name}</Text>
            <HBar ratio={ratio} color={CAT_COLORS[i % CAT_COLORS.length]} delay={i * 60} />
            <Text style={{ color: "#64748B", fontSize: 11, width: 26, textAlign: "right" }}>{pct}%</Text>
            <Text style={{ color: "#F1F5F9", fontSize: 12, fontWeight: "700", width: 72, textAlign: "right" }}>{fmt(cents)}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Report: Maiores gastos ────────────────────────────────────────────
export function MaioresGastos({ items, months }: { items: FinanceItem[]; months: string[] }) {
  const despesas = items
    .filter(i => months.includes(isoToMonthKey(i.dateISO)) && i.type === "DESPESA")
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 20);
  const total = despesas.reduce((s, i) => s + i.amountCents, 0);
  const maxVal = despesas[0]?.amountCents ?? 1;

  return (
    <View style={{ gap: 10 }}>
      <View style={[c2.balCard, { borderColor: "#EF444444" }]}>
        <Text style={c2.balLabel}>Total (top {despesas.length})</Text>
        <Text style={[c2.balVal, { color: "#EF4444" }]}>{fmt(total)}</Text>
      </View>

      <SectionTitle title={`Top ${despesas.length} maiores despesas`} />
      {despesas.length === 0 && <Text style={c.empty}>Sem despesas no período.</Text>}
      {despesas.map((it, i) => (
        <View key={it.id} style={c2.topRow}>
          <Text style={c2.topRank}>{i + 1}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "700" }} numberOfLines={1}>{it.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: "#475569", fontSize: 11 }}>{it.category}</Text>
              <Text style={{ color: "#334155", fontSize: 10 }}>·</Text>
              <Text style={{ color: "#475569", fontSize: 11 }}>{it.dateISO.split("-").reverse().join("/").slice(0, 5)}</Text>
            </View>
            <HBar ratio={it.amountCents / maxVal} color="#EF4444" delay={i * 40} />
          </View>
          <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "800", minWidth: 80, textAlign: "right" }}>{fmt(it.amountCents)}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Report: Fluxo de caixa ────────────────────────────────────────────
export function FluxoCaixa({ items, months }: { items: FinanceItem[]; months: string[] }) {
  let cumulative = 0;
  const data = months.map(ym => {
    const mi   = items.filter(i => isoToMonthKey(i.dateISO) === ym);
    const rec  = mi.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const desp = mi.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    cumulative += rec - desp;
    return { ym, rec, desp, saldo: rec - desp, cumulative };
  });
  const maxAbs = Math.max(...data.map(d => Math.abs(d.cumulative)), 1);

  return (
    <View style={{ gap: 16 }}>
      <SectionTitle title="Saldo acumulado" />
      <View style={{ gap: 6 }}>
        {data.map((d, i) => {
          const ratio = Math.abs(d.cumulative) / maxAbs;
          const color = d.cumulative >= 0 ? "#22C55E" : "#EF4444";
          return (
            <View key={d.ym} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700", width: 44 }}>{monthLabel(d.ym)}</Text>
              <HBar ratio={ratio} color={color} delay={i * 80} />
              <Text style={{ color, fontSize: 12, fontWeight: "800", width: 80, textAlign: "right" }}>
                {d.cumulative >= 0 ? "+" : ""}{fmt(d.cumulative)}
              </Text>
            </View>
          );
        })}
      </View>

      <SectionTitle title="Mês a mês" />
      {data.map(d => {
        const sal = d.rec - d.desp;
        return (
          <View key={d.ym} style={c2.monthRow}>
            <Text style={c2.monthName}>{monthLabel(d.ym)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#22C55E", fontSize: 11 }}>↑ {fmt(d.rec)}</Text>
              <Text style={{ color: "#EF4444", fontSize: 11 }}>↓ {fmt(d.desp)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[c2.monthSaldo, { color: sal >= 0 ? "#4ADE80" : "#F87171" }]}>{sal >= 0 ? "+" : ""}{fmt(sal)}</Text>
              <Text style={{ color: "#334155", fontSize: 10 }}>acum. {d.cumulative >= 0 ? "+" : ""}{fmt(d.cumulative)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Report: Por conta ─────────────────────────────────────────────────
export function PorConta({ items, months, accounts }: { items: FinanceItem[]; months: string[]; accounts: BankAccount[] }) {
  const filtered = items.filter(i => months.includes(isoToMonthKey(i.dateISO)));
  const totalDesp = filtered.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);

  return (
    <View style={{ gap: 12 }}>
      {accounts.length === 0 && <Text style={c.empty}>Nenhuma conta cadastrada.</Text>}
      {accounts.map((acc, i) => {
        const accItems = filtered.filter(it => it.accountId === acc.id);
        const rec  = accItems.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
        const desp = accItems.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
        const ratio = totalDesp > 0 ? desp / totalDesp : 0;
        return (
          <View key={acc.id} style={c2.accCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] + "33", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>{acc.face ?? "🏦"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>{acc.nick || acc.bank}</Text>
                <Text style={{ color: "#64748B", fontSize: 11 }}>{acc.bank}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#60A5FA", fontSize: 13, fontWeight: "800" }}>{fmt(acc.balanceCents)}</Text>
                <Text style={{ color: "#475569", fontSize: 10 }}>saldo atual</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#94A3B8", fontSize: 10, marginBottom: 2 }}>Entradas</Text>
                <Text style={{ color: "#22C55E", fontSize: 13, fontWeight: "700" }}>{fmt(rec)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#94A3B8", fontSize: 10, marginBottom: 2 }}>Saídas</Text>
                <Text style={{ color: "#EF4444", fontSize: 13, fontWeight: "700" }}>{fmt(desp)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#94A3B8", fontSize: 10, marginBottom: 2 }}>Lançamentos</Text>
                <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "700" }}>{accItems.length}</Text>
              </View>
            </View>
            <HBar ratio={ratio} color={CAT_COLORS[i % CAT_COLORS.length]} />
          </View>
        );
      })}
    </View>
  );
}

// ── Report: Por cartão ────────────────────────────────────────────────
export function PorCartao({ items, months, accounts }: { items: FinanceItem[]; months: string[]; accounts: BankAccount[] }) {
  const cartoes = accounts.filter(a => a.accountType === "credito");
  const filtered = items.filter(i => months.includes(isoToMonthKey(i.dateISO)) && i.type === "DESPESA");

  if (cartoes.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 40 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>💳</Text>
        <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "700", marginBottom: 6 }}>Nenhum cartão cadastrado</Text>
        <Text style={{ color: "#64748B", fontSize: 13, textAlign: "center" }}>Adicione um cartão de crédito pelo FAB +.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {cartoes.map((acc, i) => {
        const accItems = filtered.filter(it => it.accountId === acc.id);
        const total = accItems.reduce((s, i) => s + i.amountCents, 0);
        const catMap: Record<string, number> = {};
        accItems.forEach(it => { catMap[it.category || "Outros"] = (catMap[it.category || "Outros"] ?? 0) + it.amountCents; });
        const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
        return (
          <View key={acc.id} style={c2.accCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#831843", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16 }}>💳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#F1F5F9", fontSize: 14, fontWeight: "700" }}>{acc.nick || acc.bank}</Text>
                <Text style={{ color: "#64748B", fontSize: 11 }}>•••• {acc.last4 || "----"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "800" }}>{fmt(total)}</Text>
                <Text style={{ color: "#475569", fontSize: 10 }}>no período</Text>
              </View>
            </View>
            {cats.map(([name, cents], j) => (
              <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: CAT_COLORS[j % CAT_COLORS.length] }} />
                <Text style={{ color: "#94A3B8", fontSize: 12, flex: 1 }} numberOfLines={1}>{name}</Text>
                <HBar ratio={total > 0 ? cents / total : 0} color={CAT_COLORS[j % CAT_COLORS.length]} delay={j * 50} />
                <Text style={{ color: "#F1F5F9", fontSize: 11, fontWeight: "700", width: 64, textAlign: "right" }}>{fmt(cents)}</Text>
              </View>
            ))}
            {accItems.length === 0 && <Text style={{ color: "#475569", fontSize: 12, textAlign: "center" }}>Sem gastos neste período.</Text>}
          </View>
        );
      })}
    </View>
  );
}

// ── Report: Comparativo entre meses ──────────────────────────────────
export function ComparativoMeses({ items }: { items: FinanceItem[] }) {
  const available = useMemo(() => {
    const set = new Set(items.map(i => isoToMonthKey(i.dateISO)));
    return Array.from(set).sort().reverse().slice(0, 12);
  }, [items]);

  const [ma, setMa] = useState(available[1] ?? available[0] ?? "");
  const [mb, setMb] = useState(available[0] ?? "");

  function stats(ym: string) {
    const mi   = items.filter(i => isoToMonthKey(i.dateISO) === ym);
    const rec  = mi.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const desp = mi.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    const catMap: Record<string, number> = {};
    mi.filter(i => i.type === "DESPESA").forEach(i => { catMap[i.category || "Outros"] = (catMap[i.category || "Outros"] ?? 0) + i.amountCents; });
    const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    return { rec, desp, saldo: rec - desp, cats, count: mi.length };
  }

  const sA = stats(ma), sB = stats(mb);
  const allCats = Array.from(new Set([...sA.cats.map(c => c[0]), ...sB.cats.map(c => c[0])]));
  const maxVal  = Math.max(sA.rec, sA.desp, sB.rec, sB.desp, 1);

  return (
    <View style={{ gap: 16 }}>
      {/* Month pickers */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[["A", ma, setMa], ["B", mb, setMb]].map(([lbl, sel, setSel]) => (
          <View key={lbl as string} style={{ flex: 1 }}>
            <Text style={[c.secTitle, { marginBottom: 6 }]}>Período {lbl as string}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {available.map(ym => (
                <TouchableOpacity
                  key={ym}
                  onPress={() => (setSel as (v: string) => void)(ym)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
                    backgroundColor: sel === ym ? "#1D4ED8" : "#1E293B",
                    borderColor: sel === ym ? "#3B82F6" : "#334155" }}>
                  <Text style={{ color: sel === ym ? "#fff" : "#64748B", fontSize: 12, fontWeight: "700" }}>{monthLabel(ym)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}
      </View>

      {/* Side-by-side summary */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[[sA, ma, "#3B82F6"], [sB, mb, "#8B5CF6"]].map(([s, ym, col]) => {
          const st = s as ReturnType<typeof stats>;
          return (
            <View key={ym as string} style={[c2.accCard, { flex: 1, borderColor: (col as string) + "44" }]}>
              <Text style={{ color: col as string, fontSize: 13, fontWeight: "800", marginBottom: 8 }}>{monthLabel(ym as string)}</Text>
              <Text style={{ color: "#64748B", fontSize: 10 }}>Receitas</Text>
              <Text style={{ color: "#22C55E", fontSize: 14, fontWeight: "700", marginBottom: 4 }}>{fmt(st.rec)}</Text>
              <Text style={{ color: "#64748B", fontSize: 10 }}>Despesas</Text>
              <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "700", marginBottom: 4 }}>{fmt(st.desp)}</Text>
              <View style={{ height: 1, backgroundColor: "#334155", marginVertical: 8 }} />
              <Text style={{ color: "#64748B", fontSize: 10 }}>Saldo</Text>
              <Text style={{ color: st.saldo >= 0 ? "#4ADE80" : "#F87171", fontSize: 15, fontWeight: "800" }}>
                {st.saldo >= 0 ? "+" : ""}{fmt(st.saldo)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Bar visual comparison */}
      <View style={{ flexDirection: "row", height: 100, gap: 6, alignItems: "flex-end" }}>
        {[["Rec A", sA.rec, "#22C55E"], ["Desp A", sA.desp, "#EF4444"], ["Rec B", sB.rec, "#60A5FA"], ["Desp B", sB.desp, "#F87171"]].map(([lbl, val, col]) => (
          <View key={lbl as string} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View style={{ flex: 1, width: "100%", justifyContent: "flex-end" }}>
              <AnimBar ratio={(val as number) / maxVal} color={col as string} />
            </View>
            <Text style={{ color: "#475569", fontSize: 8, textAlign: "center" }}>{lbl as string}</Text>
          </View>
        ))}
      </View>

      {/* Category comparison */}
      <Text style={c.secTitle}>Categorias comparadas</Text>
      {allCats.map(cat => {
        const vA = sA.cats.find(c => c[0] === cat)?.[1] ?? 0;
        const vB = sB.cats.find(c => c[0] === cat)?.[1] ?? 0;
        const diff = vB - vA;
        return (
          <View key={cat} style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 12, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#CBD5E1", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{cat}</Text>
              <Text style={{ color: diff > 0 ? "#EF4444" : "#22C55E", fontSize: 12, fontWeight: "700" }}>
                {diff > 0 ? "▲" : diff < 0 ? "▼" : "="} {fmt(Math.abs(diff))}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ color: "#3B82F6", fontSize: 11, flex: 1 }}>{monthLabel(ma)}: {fmt(vA)}</Text>
              <Text style={{ color: "#8B5CF6", fontSize: 11, flex: 1 }}>{monthLabel(mb)}: {fmt(vB)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Report: Orçamento x Realizado ─────────────────────────────────────
export function OrcamentoRealizado({ items, months }: { items: FinanceItem[]; months: string[] }) {
  const filtered = items.filter(i => months.includes(isoToMonthKey(i.dateISO)));
  const totalRec  = filtered.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const totalDesp = filtered.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const taxaPoupa = totalRec > 0 ? Math.max(0, (totalRec - totalDesp) / totalRec) : 0;

  const catMap: Record<string, number> = {};
  filtered.filter(i => i.type === "DESPESA").forEach(i => {
    catMap[i.category || "Outros"] = (catMap[i.category || "Outros"] ?? 0) + i.amountCents;
  });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  function catColor(pctDeRenda: number) {
    if (pctDeRenda < 0.10) return "#22C55E";
    if (pctDeRenda < 0.25) return "#F59E0B";
    return "#EF4444";
  }

  return (
    <View style={{ gap: 14 }}>
      {/* Saúde financeira */}
      <View style={[c2.balCard, { borderColor: taxaPoupa >= 0.2 ? "#22C55E44" : "#F59E0B44" }]}>
        <Text style={c2.balLabel}>Taxa de poupança</Text>
        <Text style={[c2.balVal, { color: taxaPoupa >= 0.2 ? "#4ADE80" : taxaPoupa >= 0.1 ? "#FBBF24" : "#F87171" }]}>
          {Math.round(taxaPoupa * 100)}%
        </Text>
        <Text style={c2.balSub}>
          {taxaPoupa >= 0.2 ? "Excelente! Acima de 20% ✓" : taxaPoupa >= 0.1 ? "Razoável — meta: 20%" : "Atenção: abaixo do ideal"}
        </Text>
      </View>

      {/* Renda vs Gasto */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[["Receitas", totalRec, "#22C55E"], ["Despesas", totalDesp, "#EF4444"]].map(([l, v, col]) => (
          <View key={l as string} style={[c2.card, { borderColor: (col as string) + "33" }]}>
            <Text style={c2.cardLabel}>{l as string}</Text>
            <Text style={[c2.cardVal, { color: col as string }]}>{fmt(v as number)}</Text>
          </View>
        ))}
      </View>

      {/* Distribuição por categoria */}
      <Text style={c.secTitle}>Gastos por categoria (% da renda)</Text>
      {cats.length === 0 && <Text style={c.empty}>Sem despesas no período.</Text>}
      {cats.map(([cat, val], i) => {
        const pctRenda = totalRec > 0 ? val / totalRec : 0;
        const col = catColor(pctRenda);
        return (
          <View key={cat} style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "700", flex: 1 }} numberOfLines={1}>{cat}</Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Text style={{ color: col, fontSize: 13, fontWeight: "800" }}>{Math.round(pctRenda * 100)}%</Text>
                <Text style={{ color: "#F1F5F9", fontSize: 12, fontWeight: "700" }}>{fmt(val)}</Text>
              </View>
            </View>
            <HBar ratio={Math.min(pctRenda * 2, 1)} color={col} delay={i * 50} />
            <Text style={{ color: "#475569", fontSize: 10 }}>
              {pctRenda < 0.10 ? "✓ Dentro do ideal" : pctRenda < 0.25 ? "⚠ Moderado" : "⚠ Alto — considere reduzir"}
            </Text>
          </View>
        );
      })}

      {/* Regra 50-30-20 */}
      <View style={{ backgroundColor: "#1E3A8A22", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#3B82F633" }}>
        <Text style={{ color: "#60A5FA", fontSize: 12, fontWeight: "800", marginBottom: 8 }}>Regra 50-30-20</Text>
        {[
          ["Necessidades (50%)", Math.round(totalRec * 0.5), "#3B82F6"],
          ["Desejos (30%)", Math.round(totalRec * 0.3), "#8B5CF6"],
          ["Poupança (20%)", Math.round(totalRec * 0.2), "#22C55E"],
        ].map(([l, v, col]) => (
          <View key={l as string} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
            <Text style={{ color: "#94A3B8", fontSize: 12 }}>{l as string}</Text>
            <Text style={{ color: col as string, fontSize: 12, fontWeight: "700" }}>{fmt(v as number)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Report: DRE Simplificado ──────────────────────────────────────────
export function DreSimplificado({ items, months }: { items: FinanceItem[]; months: string[] }) {
  const filtered  = items.filter(i => months.includes(isoToMonthKey(i.dateISO)));
  const totalRec  = filtered.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const totalDesp = filtered.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const resultado = totalRec - totalDesp;

  const catDesp: Record<string, number> = {};
  filtered.filter(i => i.type === "DESPESA").forEach(i => {
    catDesp[i.category || "Outros"] = (catDesp[i.category || "Outros"] ?? 0) + i.amountCents;
  });
  const catRec: Record<string, number> = {};
  filtered.filter(i => i.type === "RECEITA").forEach(i => {
    catRec[i.category || "Outros"] = (catRec[i.category || "Outros"] ?? 0) + i.amountCents;
  });

  function DRE_Row({ label, value, indent = 0, bold = false, separator = false, isNegative = false }: {
    label: string; value?: number; indent?: number; bold?: boolean; separator?: boolean; isNegative?: boolean;
  }) {
    const col = value == null ? "#F1F5F9" : value >= 0 && !isNegative ? "#22C55E" : "#EF4444";
    return (
      <>
        {separator && <View style={{ height: 1, backgroundColor: "#334155", marginVertical: 4 }} />}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: indent * 12, paddingVertical: 5 }}>
          <Text style={{ color: bold ? "#F1F5F9" : "#94A3B8", fontSize: bold ? 14 : 12, fontWeight: bold ? "800" : "500", flex: 1 }} numberOfLines={1}>{label}</Text>
          {value != null && <Text style={{ color: bold ? col : "#CBD5E1", fontSize: bold ? 14 : 12, fontWeight: bold ? "800" : "600" }}>
            {isNegative ? "(" : ""}{fmt(Math.abs(value))}{isNegative ? ")" : ""}
          </Text>}
        </View>
      </>
    );
  }

  const byMonth = months.map(ym => {
    const mi = filtered.filter(i => isoToMonthKey(i.dateISO) === ym);
    return {
      ym,
      rec:  mi.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0),
      desp: mi.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0),
    };
  });

  return (
    <View style={{ gap: 14 }}>
      {/* DRE card */}
      <View style={{ backgroundColor: "#1E293B", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#334155" }}>
        <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Demonstrativo de Resultado</Text>

        <DRE_Row label="(+) RECEITAS" bold />
        {Object.entries(catRec).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
          <DRE_Row key={cat} label={cat} value={val} indent={1} />
        ))}
        <DRE_Row label="Receita Total" value={totalRec} bold separator />

        <View style={{ height: 10 }} />
        <DRE_Row label="(−) DESPESAS" bold />
        {Object.entries(catDesp).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
          <DRE_Row key={cat} label={cat} value={val} indent={1} isNegative />
        ))}
        <DRE_Row label="Total Despesas" value={totalDesp} bold separator isNegative />

        <View style={{ height: 10 }} />
        <View style={{ height: 2, backgroundColor: "#334155" }} />
        <View style={{ height: 2, backgroundColor: "#334155", marginTop: 2 }} />
        <View style={{ height: 4 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}>
          <Text style={{ color: "#F1F5F9", fontSize: 16, fontWeight: "900" }}>(=) RESULTADO LÍQUIDO</Text>
          <Text style={{ color: resultado >= 0 ? "#4ADE80" : "#F87171", fontSize: 16, fontWeight: "900" }}>
            {resultado >= 0 ? "+" : ""}{fmt(resultado)}
          </Text>
        </View>
      </View>

      {/* Margem */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          ["Margem", totalRec > 0 ? Math.round((resultado / totalRec) * 100) : 0, "%"],
          ["Receitas", totalRec, "R$"],
          ["Despesas", totalDesp, "R$"],
        ].map(([l, v, suf]) => (
          <View key={l as string} style={[c2.accCard, { flex: 1, alignItems: "center" }]}>
            <Text style={{ color: "#64748B", fontSize: 10 }}>{l as string}</Text>
            <Text style={{ color: "#F1F5F9", fontSize: 15, fontWeight: "800" }}>
              {suf === "%" ? `${v}%` : fmt(v as number)}
            </Text>
          </View>
        ))}
      </View>

      {/* DRE mensal */}
      <Text style={c.secTitle}>DRE por mês</Text>
      {byMonth.map(m => {
        const res = m.rec - m.desp;
        return (
          <View key={m.ym} style={{ backgroundColor: "#1E293B", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700", width: 44 }}>{monthLabel(m.ym)}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#64748B", fontSize: 11 }}>Receitas</Text>
                <Text style={{ color: "#22C55E", fontSize: 11, fontWeight: "700" }}>{fmt(m.rec)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#64748B", fontSize: 11 }}>Despesas</Text>
                <Text style={{ color: "#EF4444", fontSize: 11, fontWeight: "700" }}>({fmt(m.desp)})</Text>
              </View>
            </View>
            <Text style={{ color: res >= 0 ? "#4ADE80" : "#F87171", fontSize: 13, fontWeight: "800", textAlign: "right", minWidth: 72 }}>
              {res >= 0 ? "+" : ""}{fmt(res)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Report: Por Grupo (por semana) ────────────────────────────────────
export function PorGrupo({ items, months }: { items: FinanceItem[]; months: string[] }) {
  const filtered = items.filter(i => months.includes(isoToMonthKey(i.dateISO)) && i.type === "DESPESA");

  // Group by week-of-year
  function weekKey(iso: string) {
    const d = new Date(iso);
    const day = d.getDay() === 0 ? 7 : d.getDay();
    const thu = new Date(d); thu.setDate(d.getDate() + 4 - day);
    const y   = thu.getFullYear();
    const jan = new Date(y, 0, 1);
    const wk  = Math.ceil(((thu.getTime() - jan.getTime()) / 86400000 + 1) / 7);
    const [yr, mo, da] = iso.split("-");
    return `${yr}/${String(wk).padStart(2, "0")} — semana de ${da}/${mo}`;
  }

  const weekMap: Record<string, { items: FinanceItem[]; total: number }> = {};
  filtered.forEach(i => {
    const k = weekKey(i.dateISO);
    if (!weekMap[k]) weekMap[k] = { items: [], total: 0 };
    weekMap[k].items.push(i);
    weekMap[k].total += i.amountCents;
  });
  const weeks = Object.entries(weekMap).sort((a, b) => b[0].localeCompare(a[0]));
  const maxWeek = Math.max(...weeks.map(w => w[1].total), 1);
  const totalPeriodo = filtered.reduce((s, i) => s + i.amountCents, 0);
  const mediaWeek    = weeks.length > 0 ? Math.round(totalPeriodo / weeks.length) : 0;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[["Semanas", weeks.length, ""], ["Total", totalPeriodo, "R$"], ["Média/sem", mediaWeek, "R$"]].map(([l, v, suf]) => (
          <View key={l as string} style={[c2.accCard, { flex: 1, alignItems: "center" }]}>
            <Text style={{ color: "#64748B", fontSize: 10, textAlign: "center" }}>{l as string}</Text>
            <Text style={{ color: "#F1F5F9", fontSize: 13, fontWeight: "800" }}>
              {suf === "R$" ? fmt(v as number) : String(v)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={c.secTitle}>Gastos por semana</Text>
      {weeks.length === 0 && <Text style={c.empty}>Sem despesas no período.</Text>}
      {weeks.map(([wk, data], i) => (
        <View key={wk} style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 12, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700", flex: 1 }}>{wk.split("—")[1]?.trim() ?? wk}</Text>
            <Text style={{ color: "#EF4444", fontSize: 14, fontWeight: "800" }}>{fmt(data.total)}</Text>
          </View>
          <HBar ratio={data.total / maxWeek} color="#EF4444" delay={i * 50} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {data.items.slice(0, 4).map(it => (
              <View key={it.id} style={{ backgroundColor: "#0F172A", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: "#64748B", fontSize: 10 }} numberOfLines={1}>{it.title}</Text>
              </View>
            ))}
            {data.items.length > 4 && (
              <View style={{ backgroundColor: "#0F172A", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: "#475569", fontSize: 10 }}>+{data.items.length - 4}</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Report: Relatório Anual ───────────────────────────────────────────
export function RelatorioAnual({ items }: { items: FinanceItem[] }) {
  const year = new Date().getFullYear();
  const [selYear, setSelYear] = useState(year);

  const years = useMemo(() => {
    const ys = new Set(items.map(i => parseInt(i.dateISO.slice(0, 4), 10)));
    return Array.from(ys).sort((a, b) => b - a);
  }, [items]);

  const yearItems = items.filter(i => i.dateISO.startsWith(String(selYear)));
  const totalRec  = yearItems.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const totalDesp = yearItems.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const saldo     = totalRec - totalDesp;

  const byMonth = Array.from({ length: 12 }, (_, idx) => {
    const ym = `${selYear}-${String(idx + 1).padStart(2, "0")}`;
    const mi = yearItems.filter(i => isoToMonthKey(i.dateISO) === ym);
    return {
      ym, label: MONTHS_PT[idx],
      rec:  mi.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0),
      desp: mi.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0),
      count: mi.length,
    };
  });
  const maxBar = Math.max(...byMonth.map(m => Math.max(m.rec, m.desp)), 1);

  return (
    <View style={{ gap: 16 }}>
      {/* Year selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(years.length > 0 ? years : [year]).map(y => (
          <TouchableOpacity
            key={y}
            onPress={() => setSelYear(y)}
            style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
              backgroundColor: selYear === y ? "#1D4ED8" : "#1E293B",
              borderColor: selYear === y ? "#3B82F6" : "#334155" }}>
            <Text style={{ color: selYear === y ? "#fff" : "#64748B", fontSize: 14, fontWeight: "800" }}>{y}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Year summary */}
      <View style={[c2.balCard, { borderColor: saldo >= 0 ? "#22C55E44" : "#EF444444" }]}>
        <Text style={c2.balLabel}>Resultado {selYear}</Text>
        <Text style={[c2.balVal, { color: saldo >= 0 ? "#4ADE80" : "#F87171" }]}>
          {saldo >= 0 ? "+" : ""}{fmt(saldo)}
        </Text>
        <Text style={c2.balSub}>{yearItems.length} lançamentos no ano</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {[["Receitas", totalRec, "#22C55E"], ["Despesas", totalDesp, "#EF4444"]].map(([l, v, col]) => (
          <View key={l as string} style={[c2.card, { borderColor: (col as string) + "33" }]}>
            <Text style={c2.cardLabel}>{l as string}</Text>
            <Text style={[c2.cardVal, { color: col as string }]}>{fmt(v as number)}</Text>
            <Text style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>
              {v as number > 0 ? `~${fmt(Math.round((v as number) / 12))}/mês` : "—"}
            </Text>
          </View>
        ))}
      </View>

      {/* Month bars */}
      <Text style={c.secTitle}>Meses do ano</Text>
      <View style={{ flexDirection: "row", height: 120, gap: 3, alignItems: "flex-end" }}>
        {byMonth.map((m, i) => (
          <View key={m.ym} style={{ flex: 1, alignItems: "center", gap: 3 }}>
            <View style={{ flex: 1, width: "100%", flexDirection: "row", gap: 1, alignItems: "flex-end" }}>
              <View style={{ flex: 1, justifyContent: "flex-end", height: "100%" }}>
                <AnimBar ratio={m.rec / maxBar} color="#22C55E" delay={i * 40} />
              </View>
              <View style={{ flex: 1, justifyContent: "flex-end", height: "100%" }}>
                <AnimBar ratio={m.desp / maxBar} color="#EF4444" delay={i * 40 + 20} />
              </View>
            </View>
            <Text style={{ color: "#475569", fontSize: 8, fontWeight: "700" }}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Month table */}
      <Text style={c.secTitle}>Tabela mensal</Text>
      {byMonth.map(m => {
        const sal = m.rec - m.desp;
        if (m.count === 0) return null;
        return (
          <View key={m.ym} style={c2.monthRow}>
            <Text style={[c2.monthName, { width: 28, fontSize: 10 }]}>{m.label}</Text>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ color: "#22C55E", fontSize: 10 }}>↑ {fmt(m.rec)}</Text>
              <Text style={{ color: "#EF4444", fontSize: 10 }}>↓ {fmt(m.desp)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: sal >= 0 ? "#4ADE80" : "#F87171", fontSize: 12, fontWeight: "800" }}>
                {sal >= 0 ? "+" : ""}{fmt(sal)}
              </Text>
              <Text style={{ color: "#475569", fontSize: 9 }}>{m.count} lanç.</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Report: Extrato para o contador ──────────────────────────────────
export function ExtratContador({ items, months }: { items: FinanceItem[]; months: string[] }) {
  const filtered = items
    .filter(i => months.includes(isoToMonthKey(i.dateISO)))
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const totalRec  = filtered.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const totalDesp = filtered.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);

  // Group by month
  const monthGroups: { ym: string; items: FinanceItem[] }[] = [];
  filtered.forEach(i => {
    const ym = isoToMonthKey(i.dateISO);
    const g  = monthGroups.find(g => g.ym === ym);
    if (g) g.items.push(i);
    else monthGroups.push({ ym, items: [i] });
  });

  return (
    <View style={{ gap: 14 }}>
      {/* Totals */}
      <View style={{ backgroundColor: "#1E293B", borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: "#334155" }}>
        <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "800", textTransform: "uppercase" }}>Resumo do período</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: "#64748B" }}>Receitas</Text><Text style={{ color: "#22C55E", fontWeight: "700" }}>{fmt(totalRec)}</Text></View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: "#64748B" }}>Despesas</Text><Text style={{ color: "#EF4444", fontWeight: "700" }}>({fmt(totalDesp)})</Text></View>
        <View style={{ height: 1, backgroundColor: "#334155" }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: "#F1F5F9", fontWeight: "800" }}>Resultado</Text>
          <Text style={{ color: totalRec - totalDesp >= 0 ? "#4ADE80" : "#F87171", fontWeight: "800" }}>
            {totalRec - totalDesp >= 0 ? "+" : ""}{fmt(totalRec - totalDesp)}
          </Text>
        </View>
        <Text style={{ color: "#475569", fontSize: 11 }}>{filtered.length} lançamentos</Text>
      </View>

      {/* Transaction list by month */}
      {monthGroups.length === 0 && <Text style={c.empty}>Sem lançamentos no período.</Text>}
      {monthGroups.map(group => {
        const gRec  = group.items.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
        const gDesp = group.items.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
        return (
          <View key={group.ym}>
            {/* Month header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, paddingHorizontal: 4, marginBottom: 4 }}>
              <Text style={{ color: "#60A5FA", fontSize: 13, fontWeight: "800" }}>{monthLabel(group.ym)}</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Text style={{ color: "#22C55E", fontSize: 11, fontWeight: "700" }}>+{fmt(gRec)}</Text>
                <Text style={{ color: "#EF4444", fontSize: 11, fontWeight: "700" }}>-{fmt(gDesp)}</Text>
              </View>
            </View>

            {/* Items */}
            {group.items.map(it => (
              <View key={it.id} style={{ backgroundColor: "#1E293B", borderRadius: 10, padding: 12, marginBottom: 4, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 6, alignSelf: "stretch", backgroundColor: it.type === "RECEITA" ? "#22C55E" : "#EF4444", borderRadius: 3 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: "#F1F5F9", fontSize: 12, fontWeight: "700" }} numberOfLines={1}>{it.title}</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={{ color: "#475569", fontSize: 10 }}>{it.dateISO.split("-").reverse().join("/")}</Text>
                    <Text style={{ color: "#334155", fontSize: 10 }}>·</Text>
                    <Text style={{ color: "#475569", fontSize: 10 }}>{it.category}</Text>
                    <Text style={{ color: "#334155", fontSize: 10 }}>·</Text>
                    <Text style={{ color: "#475569", fontSize: 10 }}>{PAY_LABELS[it.paymentType] ?? it.paymentType}</Text>
                  </View>
                </View>
                <Text style={{ color: it.type === "RECEITA" ? "#22C55E" : "#EF4444", fontSize: 13, fontWeight: "800" }}>
                  {it.type === "RECEITA" ? "+" : "-"}{fmt(it.amountCents)}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
