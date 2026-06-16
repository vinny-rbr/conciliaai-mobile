import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { fetchFinanceItems, fmt } from "../../lib/financeService";
import { getEmailFromAnySource } from "../../lib/auth";
import type { FinanceItem } from "../../types/finance";

const UNLOCKED_EMAILS = ["vinnysousa1707@gmail.com"];

// ── Types ───────────────────────────────────────────────────────────────
type Tier   = "free" | "pro" | "premium";
type Filter = "todos" | "gratis" | "pro" | "premium";

type Report = {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  tier: Tier;
  section: string;
  preview?: "saldo" | "top-cat" | "sparkline" | "donut" | "contas";
};

const REPORTS: Report[] = [
  // ── MAIS USADOS
  { id: "entradas-saidas",    icon: "⇆",  iconBg: "#1D4ED8", title: "Entradas e saídas",       subtitle: "Resumo do mês com saldo final",          tier: "free",    section: "MAIS USADOS", preview: "saldo"     },
  { id: "gastos-categoria",   icon: "◕",  iconBg: "#7C3AED", title: "Gastos por categoria",     subtitle: "Para onde seu dinheiro foi",             tier: "free",    section: "MAIS USADOS", preview: "donut"     },
  { id: "maiores-gastos",     icon: "🔥", iconBg: "#991B1B", title: "Maiores gastos",            subtitle: "Top despesas e recorrentes do período",  tier: "free",    section: "MAIS USADOS", preview: "top-cat"   },
  // ── ANÁLISES
  { id: "fluxo-caixa",        icon: "↗",  iconBg: "#065F46", title: "Fluxo de caixa",           subtitle: "Evolução do saldo mês a mês",            tier: "free",    section: "ANÁLISES",    preview: "sparkline" },
  { id: "comparativo-meses",  icon: "⧉",  iconBg: "#1E3A8A", title: "Comparativo entre meses",  subtitle: "Compare dois períodos lado a lado",      tier: "pro",     section: "ANÁLISES"                          },
  { id: "orcamento-realizado",icon: "⊙",  iconBg: "#065F46", title: "Orçamento x realizado",    subtitle: "Metas planejadas vs. gastos reais",      tier: "pro",     section: "ANÁLISES"                          },
  { id: "dre",                icon: "≡",  iconBg: "#78350F", title: "DRE simplificado",         subtitle: "Resultado: receitas − custos − despesas",tier: "premium", section: "ANÁLISES"                          },
  // ── POR FONTE
  { id: "por-conta",          icon: "▣",  iconBg: "#065F46", title: "Por conta / carteira",     subtitle: "Saldo e movimento por banco",            tier: "free",    section: "POR FONTE",   preview: "contas"    },
  { id: "por-cartao",         icon: "▬",  iconBg: "#831843", title: "Por cartão de crédito",    subtitle: "Fatura e gastos por cartão",             tier: "free",    section: "POR FONTE"                         },
  { id: "por-grupo",          icon: "◉",  iconBg: "#3730A3", title: "Por grupo",                subtitle: "Despesas compartilhadas e divisões",     tier: "free",    section: "POR FONTE"                         },
  // ── FECHAMENTO
  { id: "relatorio-anual",    icon: "▦",  iconBg: "#1E3A8A", title: "Relatório anual",          subtitle: "Resumo completo do ano em um doc",       tier: "premium", section: "FECHAMENTO E CONTABILIDADE"        },
  { id: "extrato-contador",   icon: "▤",  iconBg: "#1E293B", title: "Extrato para o contador",  subtitle: "Lançamentos detalhados p/ contabilidade",tier: "premium", section: "FECHAMENTO E CONTABILIDADE"        },
];

const SECTIONS = ["MAIS USADOS", "ANÁLISES", "POR FONTE", "FECHAMENTO E CONTABILIDADE"];

const TIER_BADGE: Record<Tier, string | null> = { free: null, pro: "PRO", premium: "PREMIUM" };
const TIER_COLOR: Record<Tier, string> = { free: "", pro: "#F59E0B", premium: "#D97706" };

// ── Mini preview widgets ────────────────────────────────────────────────
function MiniSaldo({ items }: { items: FinanceItem[] }) {
  const now = new Date();
  const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const month = items.filter(i => i.dateISO.startsWith(ym));
  const rec  = month.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
  const desp = month.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const sal  = rec - desp;
  return <Text style={{ color: sal >= 0 ? "#22C55E" : "#EF4444", fontSize: 12, fontWeight: "700" }} numberOfLines={1}>{sal >= 0 ? "+" : ""}{fmt(sal)}</Text>;
}

function MiniDonut({ items }: { items: FinanceItem[] }) {
  const total = items.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
  const catMap: Record<string, number> = {};
  items.filter(i => i.type === "DESPESA").forEach(i => { catMap[i.category] = (catMap[i.category] ?? 0) + i.amountCents; });
  const top = Object.values(catMap).sort((a, b) => b - a)[0] ?? 0;
  const pct = total > 0 ? top / total : 0;
  // Quarter-based donut using border trick
  const COLORS = { fill: "#8B5CF6", bg: "#1E293B" };
  const q1 = pct > 0, q2 = pct > 0.25, q3 = pct > 0.5, q4 = pct > 0.75;
  return (
    <View style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
      <View style={{
        width: 30, height: 30, borderRadius: 15, borderWidth: 5,
        borderTopColor:    q1 ? COLORS.fill : COLORS.bg,
        borderRightColor:  q2 ? COLORS.fill : COLORS.bg,
        borderBottomColor: q3 ? COLORS.fill : COLORS.bg,
        borderLeftColor:   q4 ? COLORS.fill : COLORS.bg,
        transform: [{ rotate: "-45deg" }],
      }} />
    </View>
  );
}

function MiniTopCat({ items }: { items: FinanceItem[] }) {
  const catMap: Record<string, number> = {};
  items.filter(i => i.type === "DESPESA").forEach(i => { catMap[i.category] = (catMap[i.category] ?? 0) + i.amountCents; });
  const top = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "600" }} numberOfLines={1}>{top[0]}</Text>;
}

function MiniSparkline({ items }: { items: FinanceItem[] }) {
  const months: string[] = [];
  const d = new Date();
  for (let i = 3; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  }
  const vals = months.map(ym => {
    const mi = items.filter(i => i.dateISO.startsWith(ym));
    const r = mi.filter(i => i.type === "RECEITA").reduce((s, i) => s + i.amountCents, 0);
    const e = mi.filter(i => i.type === "DESPESA").reduce((s, i) => s + i.amountCents, 0);
    return r - e;
  });
  const maxAbs = Math.max(...vals.map(Math.abs), 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 20 }}>
      {vals.map((v, i) => (
        <View key={i} style={{
          width: 6, height: Math.max(3, Math.abs(v) / maxAbs * 18),
          backgroundColor: v >= 0 ? "#22C55E" : "#EF4444",
          borderRadius: 2,
        }} />
      ))}
    </View>
  );
}

// ── Main ────────────────────────────────────────────────────────────────
export default function RelatoriosScreen() {
  const navigation = useNavigation<any>();
  const [items,      setItems]      = useState<FinanceItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState<Filter>("todos");
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetchFinanceItems(),
      getEmailFromAnySource(),
    ]).then(([it, email]) => {
      setItems(it);
      setIsUnlocked(!!email && UNLOCKED_EMAILS.includes(email));
    }).finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    return REPORTS.filter(r => {
      if (filter === "gratis"   && r.tier !== "free")    return false;
      if (filter === "pro"      && r.tier !== "pro")     return false;
      if (filter === "premium"  && r.tier !== "premium") return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) &&
                    !r.subtitle.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filter, search]);

  function isFree(r: Report) { return r.tier === "free" || isUnlocked; }

  function handleTap(r: Report) {
    if (!isFree(r)) return;
    navigation.navigate("RelatorioDetalhe", { type: r.id });
  }

  function renderPreview(r: Report) {
    if (!isFree(r)) return <Text style={s.lock}>🔒</Text>;
    if (!r.preview)        return <Text style={s.arrow}>›</Text>;
    if (loading)           return <ActivityIndicator size="small" color="#475569" />;
    switch (r.preview) {
      case "saldo":     return <MiniSaldo    items={items} />;
      case "donut":     return <MiniDonut    items={items} />;
      case "top-cat":   return <MiniTopCat   items={items} />;
      case "sparkline": return <MiniSparkline items={items} />;
      default:          return <Text style={s.arrow}>›</Text>;
    }
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 60 }}>
          <Text style={s.backTxt}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Relatórios</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Buscar relatório…"
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={{ color: "#475569", fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {(["todos","gratis","pro","premium"] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
              {f === "todos" ? "Todos" : f === "gratis" ? "Grátis" : f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {SECTIONS.map(section => {
          const rows = visible.filter(r => r.section === section);
          if (rows.length === 0) return null;
          return (
            <View key={section} style={s.section}>
              <Text style={s.sectionTitle}>{section}</Text>
              {rows.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[s.card, !isFree(r) && s.cardLocked]}
                  activeOpacity={isFree(r) ? 0.7 : 0.95}
                  onPress={() => handleTap(r)}
                >
                  {/* Icon */}
                  <View style={[s.iconBox, { backgroundColor: r.iconBg }]}>
                    <Text style={s.iconTxt}>{r.icon}</Text>
                  </View>

                  {/* Text */}
                  <View style={s.cardBody}>
                    <View style={s.titleRow}>
                      <Text style={[s.cardTitle, r.tier !== "free" && s.cardTitleLocked]}>{r.title}</Text>
                      {TIER_BADGE[r.tier] && (
                        <View style={[s.badge, { backgroundColor: TIER_COLOR[r.tier] + "33", borderColor: TIER_COLOR[r.tier] + "88" }]}>
                          <Text style={[s.badgeTxt, { color: TIER_COLOR[r.tier] }]}>{TIER_BADGE[r.tier]}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.cardSub} numberOfLines={1}>{r.subtitle}</Text>
                  </View>

                  {/* Preview / lock / arrow */}
                  <View style={s.previewWrap}>
                    {renderPreview(r)}
                  </View>

                  {isFree(r) && <Text style={s.arrow}>›</Text>}
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#0A1628" },
  header:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1E293B" },
  backTxt:    { color: "#94A3B8", fontSize: 14 },
  headerTitle:{ flex: 1, color: "#F1F5F9", fontSize: 17, fontWeight: "800", textAlign: "center" },

  searchWrap: { flexDirection: "row", alignItems: "center", margin: 12, backgroundColor: "#1E293B", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderWidth: 1, borderColor: "#334155" },
  searchIcon: { fontSize: 15 },
  searchInput:{ flex: 1, color: "#F1F5F9", fontSize: 14 },

  filterRow:  { paddingHorizontal: 12, gap: 8, paddingBottom: 4 },
  filterBtn:  { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, backgroundColor: "#1E293B", borderWidth: 1.5, borderColor: "#334155" },
  filterBtnActive: { backgroundColor: "#1D4ED8", borderColor: "#3B82F6" },
  filterTxt:  { color: "#64748B", fontSize: 13, fontWeight: "700" },
  filterTxtActive: { color: "#fff" },

  scroll:     { padding: 12, paddingTop: 16 },
  section:    { marginBottom: 24 },
  sectionTitle:{ color: "#475569", fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, marginLeft: 4 },

  card:       { flexDirection: "row", alignItems: "center", backgroundColor: "#1E293B", borderRadius: 16, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: "#334155" },
  cardLocked: { opacity: 0.75 },
  iconBox:    { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconTxt:    { fontSize: 20, color: "#fff" },
  cardBody:   { flex: 1, gap: 3 },
  titleRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle:  { color: "#F1F5F9", fontSize: 15, fontWeight: "700" },
  cardTitleLocked: { color: "#CBD5E1" },
  cardSub:    { color: "#64748B", fontSize: 12 },
  badge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  badgeTxt:   { fontSize: 10, fontWeight: "800" },
  previewWrap:{ alignItems: "flex-end", minWidth: 50 },
  lock:       { fontSize: 18, color: "#F59E0B" },
  arrow:      { color: "#475569", fontSize: 20, fontWeight: "300", marginLeft: 4 },
});
